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
// Only `http` monitors run here. The other monitor types are accepted by the
// schema and skipped by this loop:
//   * ssl expiry — Deno's TLS API exposes no peer certificate, so this needs a
//     hand-rolled handshake parse. Real work, not a checkbox; deliberately not
//     faked with a third-party "is my cert ok" API.
//   * dns / tcp / synthetic_flow / integration — Phase 2.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { nextState, type MonitorState, type StateRow } from './state.ts';

const BATCH = 60;       // monitors per invocation
const CONCURRENCY = 10; // in-flight checks
const DEFAULT_TIMEOUT_MS = 10_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Severity from the asset's declared criticality. Deterministic and boring on
// purpose. The blueprint's burn-rate model is the better answer, but it needs
// SLO error budgets to burn against and those don't exist yet — this is the
// placeholder, not the destination.
// ponytail: swap for multi-window burn rate once slos/slo_budget land.
const SEVERITY: Record<string, number> = { critical: 1, high: 2, normal: 3, low: 4 };

interface CheckOutcome {
  ok: boolean;
  status_code: number | null;
  latency_ms: number;
  failure_stage: string | null;
  error: string | null;
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

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = new Date();
  const { data: due, error: dueErr } = await admin
    .from('monitors')
    .select(
      'id, org_id, asset_id, type, target, config, interval_seconds,' +
      'digital_assets!inner(name, criticality, owner_employee_id, maintenance_until, archived_at, status)',
    )
    .eq('enabled', true)
    .eq('type', 'http')
    .lte('next_run_at', now.toISOString())
    .is('digital_assets.archived_at', null)
    .order('next_run_at')
    .limit(BATCH);

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
    .in('monitor_id', due.map((m) => m.id));
  const stateByMonitor = new Map(states?.map((s) => [s.monitor_id, s]) ?? []);

  const results: Record<string, unknown>[] = [];
  const usage: Record<string, unknown>[] = [];
  let opened = 0;
  let resolved = 0;

  await pooled(due, CONCURRENCY, async (m) => {
    // supabase-js types an !inner embed as an array; it is one row here.
    const asset = (Array.isArray(m.digital_assets) ? m.digital_assets[0] : m.digital_assets) as {
      name: string;
      criticality: string;
      owner_employee_id: string | null;
      maintenance_until: string | null;
      status: string;
    };
    const outcome = await runHttpCheck(m.target, (m.config ?? {}) as Record<string, unknown>);
    const ts = new Date().toISOString();

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
      const { data: incident } = await admin.from('incidents').insert({
        org_id: m.org_id,
        asset_id: m.asset_id,
        detected_by_monitor_id: m.id,
        // The whole point of the module: the incident knows who owns the thing
        // before anyone has looked at it.
        assigned_employee_id: asset.owner_employee_id,
        severity: SEVERITY[asset.criticality] ?? 3,
        title: `${asset.name} is not responding`,
        cause_category: outcome.failure_stage,
        started_at: ts,
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

  return json({ ok: true, checked: results.length, opened, resolved });
});
