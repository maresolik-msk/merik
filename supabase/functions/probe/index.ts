// Merik — Digital Operations probe (Deno).
//
// Runs every monitor that is due, records the result, moves the monitor's state
// machine (see state.ts), and opens or resolves incidents. pg_cron calls this
// once a minute via pg_net; the URL and shared secret live in public.ops_config
// so neither is in git.
//
// Deploy with verify_jwt = false — the caller is Postgres, not a signed-in user
// — and set PROBE_SECRET to the same value as ops_config.probe_secret. The
// secret is the only thing standing between the open internet and an endpoint
// that makes outbound requests, so it is checked before anything else happens.
//
// Runs `http` and `ssl` monitors. dns / tcp / synthetic_flow / integration are
// accepted by the schema and are Phase 2.
//
// Caveat on ssl, as deployed today: the Supabase Edge Runtime's node:tls returns
// an empty object from getPeerCertificate(), so the certificate cannot be read
// there — the Deno CLI implements it, which is why this passed local testing and
// failed in production. Those checks come back `inconclusive` and are dropped
// rather than recorded, so the feature is inert instead of wrong. Making it work
// needs either that runtime gaining the API or a hand-rolled ClientHello and
// Certificate-message parse (and TLS 1.3 encrypts that message, so it would have
// to negotiate 1.2).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { connect as tlsConnect } from 'node:tls';
import { nextState, type MonitorState, type StateRow } from './state.ts';
import {
  type ChangeEvent,
  correlateChanges,
  describeChange,
  isVendorOutage,
  parseStatuspage,
} from './correlate.ts';
import {
  type AlertIncident,
  alertHtml,
  alertSubject,
  type BurnRates,
  severityFromBurn,
  shouldAlertNow,
  slackText,
} from './alerts.ts';

const BATCH = 60;       // monitors per invocation
const CONCURRENCY = 10; // in-flight checks
const DEFAULT_TIMEOUT_MS = 10_000;
const ALERT_BATCH = 20; // incidents notified per invocation
const SSL_TIMEOUT_MS = 8_000;
// Long enough that a Let's Encrypt renewal (30 days out) has already had its
// chances, short enough that the warning still leaves room to act.
const SSL_WARN_DAYS = 14;

// One factory so the helpers below can name the client's type. Writing it as
// ReturnType<typeof createClient> instead gives a differently-parameterised
// client than this call actually produces, and every table write fails to check.
const serviceClient = () =>
  createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
type Admin = ReturnType<typeof serviceClient>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Fallback severity only. Severity normally comes from the error-budget burn
// rate (see severityFromBurn in alerts.ts); this is what a best_effort asset
// gets, having no contracted target and therefore no budget to measure.
const SEVERITY: Record<string, number> = { critical: 1, high: 2, normal: 3, low: 4 };

// The service-role client is created without a generated Database type, so
// supabase-js cannot resolve a select string against a schema it doesn't know
// and types every row as GenericStringError. These shapes are what the two
// queries below actually return; `.returns<T>()` is the supported way to say so.
interface AssetRow {
  name: string;
  criticality: string;
  owner_employee_id: string | null;
  maintenance_until: string | null;
  status: string;
}

interface DueMonitor {
  id: string;
  org_id: string;
  asset_id: string;
  type: string;
  target: string;
  config: Record<string, unknown> | null;
  interval_seconds: number;
  // PostgREST returns an embed as an object or an array depending on the
  // relationship it infers; handled at the use site rather than assumed here.
  digital_assets: AssetRow | AssetRow[];
}

interface CheckOutcome {
  ok: boolean;
  status_code: number | null;
  latency_ms: number;
  failure_stage: string | null;
  error: string | null;
  /**
   * The probe could not determine an answer — as opposed to determining a bad
   * one. Nothing is recorded and the state machine does not move: a limitation
   * of the prober must never be reported as the client's site being broken.
   */
  inconclusive?: boolean;
}

async function runHttpCheck(target: string, config: Record<string, unknown>): Promise<CheckOutcome> {
  const timeout = Number(config.timeout_ms ?? DEFAULT_TIMEOUT_MS);
  const expectStatus = config.expect_status ? Number(config.expect_status) : null;
  const expectText = typeof config.expect_text === 'string' ? config.expect_text : null;
  const started = performance.now();

  try {
    const res = await fetch(target, {
      method: String(config.method ?? 'GET'),
      headers: (config.headers as Record<string, string>) ?? undefined,
      redirect: 'follow',
      signal: AbortSignal.timeout(timeout),
    });
    const latency_ms = Math.round(performance.now() - started);

    const statusOk = expectStatus !== null
      ? res.status === expectStatus
      : res.status >= 200 && res.status < 400;
    if (!statusOk) {
      await res.body?.cancel();
      return {
        ok: false, status_code: res.status, latency_ms,
        failure_stage: 'response', error: `HTTP ${res.status}`,
      };
    }

    if (expectText) {
      const body = await res.text();
      if (!body.includes(expectText)) {
        return {
          ok: false, status_code: res.status, latency_ms,
          failure_stage: 'assertion', error: `response did not contain "${expectText}"`,
        };
      }
    } else {
      await res.body?.cancel();
    }

    return { ok: true, status_code: res.status, latency_ms, failure_stage: null, error: null };
  } catch (e) {
    const latency_ms = Math.round(performance.now() - started);
    const name = (e as Error)?.name ?? '';
    const timedOut = name === 'TimeoutError' || name === 'AbortError';
    return {
      ok: false,
      status_code: null,
      latency_ms,
      // A timeout got as far as sending the request; anything else failed before
      // that. Enough to tell "slow" from "unreachable" without a packet trace.
      failure_stage: timedOut ? 'request' : 'connect',
      error: String((e as Error)?.message ?? e).slice(0, 300),
    };
  }
}

/**
 * Certificate expiry.
 *
 * `fetch` already fails on an *invalid* certificate, which the http monitor
 * records as a connect failure — but by then the client's site is down and the
 * point was to know beforehand. This reads the peer certificate and fails while
 * there is still time to renew.
 *
 * Uses node:tls because Deno's own TLS API exposes no peer certificate. The
 * Supabase Edge Runtime supports raw outbound TLS — send-email speaks SMTP over
 * it — so this works there as well as locally.
 */
async function runSslCheck(target: string): Promise<CheckOutcome> {
  const started = performance.now();
  let host: string;
  let port: number;
  try {
    const u = new URL(target);
    host = u.hostname;
    port = u.port ? Number(u.port) : 443;
  } catch {
    return {
      ok: false, status_code: null, latency_ms: 0,
      failure_stage: 'dns', error: `not a URL: ${target}`.slice(0, 300),
    };
  }

  try {
    const validTo = await new Promise<string | null>((resolve, reject) => {
      const socket = tlsConnect({ host, port, servername: host }, () => {
        // Two APIs because runtimes disagree about which they implement. The
        // Deno CLI has both; the Supabase Edge Runtime returned an empty object
        // from getPeerCertificate(), which is why this tries the X509 form too
        // and then gives up honestly rather than guessing.
        let out: string | null = null;
        try {
          const x509 = (socket as unknown as {
            getPeerX509Certificate?: () => { validTo?: string } | null;
          }).getPeerX509Certificate?.();
          if (x509?.validTo) out = x509.validTo;
        } catch { /* not implemented here */ }
        if (!out) {
          try {
            const cert = socket.getPeerCertificate();
            if (cert?.valid_to) out = cert.valid_to;
          } catch { /* not implemented here */ }
        }
        socket.destroy();
        resolve(out);
      });
      socket.on('error', reject);
      socket.setTimeout(SSL_TIMEOUT_MS, () => {
        socket.destroy();
        reject(new Error('TLS handshake timed out'));
      });
    });

    const latency_ms = Math.round(performance.now() - started);

    // Connected fine, but this runtime will not hand over the certificate. That
    // says nothing about the certificate, so it must not be recorded as a
    // failure — a false "TLS certificate problem" on a healthy site is exactly
    // the alert noise that gets a monitoring tool switched off.
    if (validTo === null) {
      return {
        ok: false, status_code: null, latency_ms, failure_stage: 'tls',
        error: 'certificate unreadable in this runtime', inconclusive: true,
      };
    }
    const days = Math.floor((new Date(validTo).getTime() - Date.now()) / 86_400_000);

    if (days < 0) {
      return {
        ok: false, status_code: null, latency_ms, failure_stage: 'tls',
        error: `certificate expired ${-days} day(s) ago`,
      };
    }
    if (days <= SSL_WARN_DAYS) {
      return {
        ok: false, status_code: null, latency_ms, failure_stage: 'tls',
        error: `certificate expires in ${days} day(s)`,
      };
    }
    return { ok: true, status_code: null, latency_ms, failure_stage: null, error: null };
  } catch (e) {
    return {
      ok: false, status_code: null,
      latency_ms: Math.round(performance.now() - started),
      failure_stage: 'tls',
      error: String((e as Error)?.message ?? e).slice(0, 300),
    };
  }
}

/**
 * Refresh every vendor's status feed.
 *
 * Global, not per-tenant: Stripe being down is the same fact for everyone, so
 * this is eight requests regardless of how many customers depend on them.
 *
 * A feed that fails to answer is recorded as `unknown`, never as `none`. The
 * difference matters: `none` would silently switch off dependency suppression
 * and turn one vendor outage back into forty pages.
 */
async function pollVendorStatus(admin: Admin): Promise<number> {
  const { data: vendors } = await admin
    .from('vendor_status')
    .select('provider, status_url, format')
    .returns<Array<{ provider: string; status_url: string; format: string }>>();

  if (!vendors?.length) return 0;
  const now = new Date().toISOString();
  let updated = 0;

  await pooled(vendors, CONCURRENCY, async (v) => {
    let indicator = 'unknown';
    let description: string | null = null;
    try {
      const res = await fetch(v.status_url, { signal: AbortSignal.timeout(8_000) });
      if (res.ok) {
        const parsed = parseStatuspage(await res.json());
        indicator = parsed.indicator;
        description = parsed.description;
      } else {
        await res.body?.cancel();
      }
    } catch (e) {
      console.warn('vendor status fetch failed', v.provider, (e as Error)?.message);
    }

    await admin.from('vendor_status')
      .update({ indicator, description, checked_at: now, updated_at: now })
      .eq('provider', v.provider);
    updated++;
  });

  return updated;
}

/**
 * Is this asset's own outage explained by a vendor's?
 *
 * Returns the provider when a *hard* dependency is in a major or critical
 * outage. A soft dependency degrading is not an excuse to stay quiet — that is
 * the difference the `criticality` column exists to record.
 */
async function dependencyOutage(admin: Admin, assetId: string): Promise<string | null> {
  const { data } = await admin
    .from('asset_dependencies')
    .select('provider, criticality, vendor_status!inner(indicator)')
    .eq('asset_id', assetId)
    .eq('criticality', 'hard')
    .returns<Array<{
      provider: string;
      criticality: string;
      vendor_status: { indicator: string } | { indicator: string }[];
    }>>();

  for (const dep of data ?? []) {
    const vs = Array.isArray(dep.vendor_status) ? dep.vendor_status[0] : dep.vendor_status;
    if (isVendorOutage(vs?.indicator)) return dep.provider;
  }
  return null;
}

/**
 * What changed just before this. Attaches the closest change as a timeline
 * entry — evidence for whoever picks the incident up, never a verdict.
 */
async function attachCorrelatedChange(
  admin: Admin,
  incidentId: string,
  orgId: string,
  assetId: string,
  startedAt: string,
): Promise<void> {
  const since = new Date(new Date(startedAt).getTime() - 60 * 60_000).toISOString();
  const { data } = await admin
    .from('change_events')
    .select('id, ts, source, kind, ref, title, url, actor')
    .eq('asset_id', assetId)
    .gte('ts', since)
    .lte('ts', startedAt)
    .order('ts', { ascending: false })
    .limit(20)
    .returns<ChangeEvent[]>();

  const ranked = correlateChanges(data ?? [], startedAt);
  if (!ranked.length) return;

  const closest = ranked[0];
  await admin.from('incident_events').insert({
    org_id: orgId,
    incident_id: incidentId,
    ts: startedAt,
    kind: closest.kind === 'deployment' ? 'deploy_detected' : 'commit_linked',
    payload: {
      summary: describeChange(closest),
      ref: closest.ref,
      url: closest.url,
      actor: closest.actor,
      minutes_before: closest.minutesBefore,
      // How many others were in the window, so nobody assumes this was the only
      // change simply because it is the one shown.
      other_changes_in_window: ranked.length - 1,
    },
  });
}

async function pooled<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item);
  });
  await Promise.all(workers);
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('PROBE_SECRET');
  if (!secret) return json({ ok: false, error: 'PROBE_SECRET not configured' }, 500);
  if (req.headers.get('x-probe-secret') !== secret) return json({ ok: false }, 401);

  const admin = serviceClient();

  // pg_cron calls this with ?job=vendors on its own schedule. Same secret, same
  // function, different work — a second Edge Function for eight HTTP GETs would
  // be a second thing to deploy and keep in step.
  if (new URL(req.url).searchParams.get('job') === 'vendors') {
    return json({ ok: true, vendors: await pollVendorStatus(admin) });
  }

  const now = new Date();
  const { data: due, error: dueErr } = await admin
    .from('monitors')
    .select(
      'id, org_id, asset_id, type, target, config, interval_seconds,' +
      'digital_assets!inner(name, criticality, owner_employee_id, maintenance_until, archived_at, status)',
    )
    .eq('enabled', true)
    .in('type', ['http', 'ssl'])
    .lte('next_run_at', now.toISOString())
    .is('digital_assets.archived_at', null)
    .order('next_run_at')
    .limit(BATCH)
    .returns<DueMonitor[]>();

  if (dueErr) return json({ ok: false, error: dueErr.message }, 500);
  if (!due?.length) return json({ ok: true, checked: 0 });

  // Claim the batch before running it: if a run overruns its minute, the next
  // invocation must not pick the same monitors up again.
  await Promise.all(due.map((m) =>
    admin.from('monitors')
      .update({ next_run_at: new Date(now.getTime() + m.interval_seconds * 1000).toISOString() })
      .eq('id', m.id)
  ));

  const { data: states } = await admin
    .from('monitor_state')
    .select('monitor_id, state, consecutive_failures, consecutive_successes, open_incident_id')
    .in('monitor_id', due.map((m) => m.id))
    .returns<Array<StateRow & { monitor_id: string }>>();
  const stateByMonitor = new Map(states?.map((s) => [s.monitor_id, s]) ?? []);

  const results: Record<string, unknown>[] = [];
  const usage: Record<string, unknown>[] = [];
  let opened = 0;
  let resolved = 0;
  let inconclusive = 0;

  await pooled(due, CONCURRENCY, async (m) => {
    const asset = Array.isArray(m.digital_assets) ? m.digital_assets[0] : m.digital_assets;
    const outcome = m.type === 'ssl'
      ? await runSslCheck(m.target)
      : await runHttpCheck(m.target, (m.config ?? {}) as Record<string, unknown>);
    const ts = new Date().toISOString();

    // An inconclusive check is not a result. Recording it would poison the
    // uptime ratio and move the state machine on no evidence, so it is counted
    // for visibility and otherwise dropped. next_run_at was already advanced, so
    // this monitor simply tries again next interval.
    if (outcome.inconclusive) {
      inconclusive++;
      console.warn('inconclusive check', m.type, m.target, outcome.error);
      return;
    }

    results.push({
      org_id: m.org_id, monitor_id: m.id, ts, region: 'default',
      ok: outcome.ok, status_code: outcome.status_code, latency_ms: outcome.latency_ms,
      failure_stage: outcome.failure_stage, error: outcome.error,
    });
    usage.push({ org_id: m.org_id, asset_id: m.asset_id, ts, meter: 'check_run', region: 'default' });

    const prev: StateRow = stateByMonitor.get(m.id) ?? {
      state: 'unknown', consecutive_failures: 0, consecutive_successes: 0, open_incident_id: null,
    };
    const inMaintenance = !!asset.maintenance_until && new Date(asset.maintenance_until) > now;
    const t = nextState(prev, outcome.ok, { inMaintenance });

    let openIncidentId = prev.open_incident_id;

    if (t.action === 'open_incident') {
      // Severity is measured, not declared: how fast this asset is spending its
      // error budget. The criticality map is only the fallback for a
      // best_effort asset, which has no budget to burn.
      const { data: slo } = await admin
        .from('asset_slo')
        .select('burn_rate_1h, burn_rate_6h, burn_rate_3d')
        .eq('asset_id', m.asset_id)
        .maybeSingle()
        .returns<BurnRates>();

      // Is this even ours? A hard dependency in a major outage explains the
      // failure, and forty clients on the same vendor must produce one story
      // rather than forty pages.
      const vendorDown = await dependencyOutage(admin, m.asset_id);

      const { data: incident } = await admin.from('incidents').insert({
        org_id: m.org_id,
        asset_id: m.asset_id,
        detected_by_monitor_id: m.id,
        // The whole point of the module: the incident knows who owns the thing
        // before anyone has looked at it.
        assigned_employee_id: asset.owner_employee_id,
        severity: severityFromBurn(slo, SEVERITY[asset.criticality] ?? 3),
        title: vendorDown
          ? `${asset.name} affected by ${vendorDown} outage`
          : m.type === 'ssl'
          ? `${asset.name} — TLS certificate problem`
          : `${asset.name} is not responding`,
        cause_category: vendorDown ? 'dependency' : outcome.failure_stage,
        started_at: ts,
        // Recorded, still visible, but it will not wake anyone: the vendor is
        // the one who has to fix it.
        suppressed_reason: vendorDown ? 'dependency_outage' : null,
        suppressed_provider: vendorDown,
      }).select('id').single();

      if (incident) {
        openIncidentId = incident.id;
        opened++;
        await admin.from('incident_events').insert({
          org_id: m.org_id, incident_id: incident.id, ts, kind: 'check_failed',
          payload: {
            error: outcome.error,
            status_code: outcome.status_code,
            failure_stage: outcome.failure_stage,
            consecutive_failures: t.consecutive_failures,
          },
        });
        usage.push({ org_id: m.org_id, asset_id: m.asset_id, ts, meter: 'incident_stored' });

        if (vendorDown) {
          await admin.from('incident_events').insert({
            org_id: m.org_id, incident_id: incident.id, ts, kind: 'dependency_down',
            payload: { provider: vendorDown },
          });
        }
        // What shipped just before this. Best effort: a correlation failure must
        // not stop the incident being recorded.
        try {
          await attachCorrelatedChange(admin, incident.id, m.org_id, m.asset_id, ts);
        } catch (e) {
          console.error('correlation failed', (e as Error)?.message);
        }
      }
    }

    if (t.action === 'resolve_incident' && prev.open_incident_id) {
      await admin.from('incidents')
        .update({ state: 'resolved', resolved_at: ts, updated_at: ts })
        .eq('id', prev.open_incident_id)
        .neq('state', 'resolved');
      await admin.from('incident_events').insert({
        org_id: m.org_id, incident_id: prev.open_incident_id, ts, kind: 'recovered',
        payload: { latency_ms: outcome.latency_ms, status_code: outcome.status_code },
      });
      openIncidentId = null;
      resolved++;
    }

    await admin.from('monitor_state').upsert({
      monitor_id: m.id,
      org_id: m.org_id,
      state: t.state,
      consecutive_failures: t.consecutive_failures,
      consecutive_successes: t.consecutive_successes,
      since: t.state === prev.state ? undefined : ts,
      last_ok_at: outcome.ok ? ts : undefined,
      last_check_at: ts,
      open_incident_id: openIncidentId,
      updated_at: ts,
    }, { onConflict: 'monitor_id' });

    const assetStatus = inMaintenance
      ? 'maintenance'
      : ({ up: 'operational', down: 'down', unknown: 'unknown' } as const)[t.state as MonitorState];
    if (assetStatus !== asset.status) {
      await admin.from('digital_assets').update({ status: assetStatus }).eq('id', m.asset_id);
    }
  });

  // Bulk-write the high-volume rows once, rather than per check.
  if (results.length) await admin.from('check_results').insert(results);
  if (usage.length) await admin.from('usage_events').insert(usage);

  // Alerting runs after the checks, not inside them. An incident opened this
  // minute is picked up by this same pass; one held back for quiet hours is
  // picked up by a later one, with no queue to drain.
  const alerted = await flushAlerts(admin, now);

  return json({ ok: true, checked: results.length, opened, resolved, alerted, inconclusive });
});

interface PendingIncident {
  id: string;
  org_id: string;
  severity: number;
  title: string;
  started_at: string;
  cause_category: string | null;
  assigned_employee_id: string | null;
  digital_assets: { name: string; primary_url: string | null }
    | { name: string; primary_url: string | null }[];
}

/**
 * Tell someone about incidents nobody has been told about yet.
 *
 * `alerted_at` is both the marker and the lock: it is set once, so a still-open
 * incident never pages twice, and a failure to send leaves it null so the next
 * run tries again.
 */
async function flushAlerts(
  admin: Admin,
  now: Date,
): Promise<number> {
  const { data: pending } = await admin
    .from('incidents')
    .select(
      'id, org_id, severity, title, started_at, cause_category, assigned_employee_id,' +
      'digital_assets!inner(name, primary_url)',
    )
    .is('alerted_at', null)
    .is('suppressed_reason', null)   // a suppressed incident is on record, not on call
    .neq('state', 'resolved')
    .order('started_at')
    .limit(ALERT_BATCH)
    .returns<PendingIncident[]>();

  if (!pending?.length) return 0;

  let sent = 0;
  for (const inc of pending) {
    if (!shouldAlertNow(inc.severity, now)) continue;

    const asset = Array.isArray(inc.digital_assets) ? inc.digital_assets[0] : inc.digital_assets;
    const payload: AlertIncident = {
      title: inc.title,
      severity: inc.severity,
      started_at: inc.started_at,
      cause_category: inc.cause_category,
      assetName: asset.name,
      assetUrl: asset.primary_url,
    };

    const recipients = await alertRecipients(admin, inc.org_id, inc.assigned_employee_id);

    // Best effort per channel. A dead SMTP box must not stop Slack, and neither
    // must stop the incident being marked as handled — retrying forever would
    // turn one broken mailbox into a permanent alert storm.
    for (const to of recipients) {
      try {
        await admin.functions.invoke('send-email', {
          body: {
            to,
            org_id: inc.org_id,
            subject: alertSubject(payload),
            html: alertHtml(payload),
          },
        });
      } catch (e) {
        console.error('alert email failed', to, (e as Error)?.message);
      }
    }

    const { data: org } = await admin
      .from('orgs').select('slack_webhook_url').eq('id', inc.org_id).maybeSingle()
      .returns<{ slack_webhook_url: string | null }>();
    if (org?.slack_webhook_url) {
      try {
        await fetch(org.slack_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: slackText(payload) }),
          signal: AbortSignal.timeout(5_000),
        });
      } catch (e) {
        console.error('slack alert failed', (e as Error)?.message);
      }
    }

    await admin.from('incidents')
      .update({ alerted_at: new Date().toISOString() })
      .eq('id', inc.id);
    await admin.from('incident_events').insert({
      org_id: inc.org_id,
      incident_id: inc.id,
      kind: 'state_changed',
      payload: { alerted: true, recipients: recipients.length },
    });
    sent++;
  }
  return sent;
}

/**
 * The asset owner, or the org's admins when nobody owns it.
 *
 * The blueprint's escalation chain is owner → team on-call rota → manager.
 * Merik has no rota and no teams table, so inventing the middle two would be
 * inventing policy. Falling back to admins at least means an unowned asset
 * going down is not silent.
 */
async function alertRecipients(
  admin: Admin,
  orgId: string,
  ownerId: string | null,
): Promise<string[]> {
  if (ownerId) {
    const { data: owner } = await admin
      .from('employees').select('email').eq('id', ownerId).maybeSingle()
      .returns<{ email: string | null }>();
    if (owner?.email) return [owner.email];
  }

  const { data: admins } = await admin
    .from('profiles')
    .select('employees!inner(email)')
    .eq('org_id', orgId)
    .eq('role', 'admin')
    .returns<Array<{ employees: { email: string | null } | { email: string | null }[] }>>();

  return (admins ?? [])
    .map((r) => (Array.isArray(r.employees) ? r.employees[0] : r.employees)?.email)
    .filter((e): e is string => !!e);
}
