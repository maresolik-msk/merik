// Merik — Digital Operations webhook receiver (Deno).
//
// Turns GitHub pushes and Vercel deployments into change_events, so an incident
// can say what shipped just before it. Deploy with verify_jwt = false: the caller
// is GitHub, which has no Merik session.
//
// POST /functions/v1/hooks?t=<repo link token>        ← what users get
// POST /functions/v1/hooks?provider=github&org=<uuid> ← original, hand-wired
//
// The token identifies a row in repo_links: one repo, connected in Merik to a
// client, a project and optionally an asset, with its own signing secret. That
// ordering is the point — the token is readable from the URL before the body is
// touched, so the signature can be checked against the right secret on a payload
// nobody has trusted yet. Nothing in the body decides which tenant an event
// lands in.
//
// The secrets here are Merik's own, generated per link. They verify inbound
// messages and can reach into nothing, which is what keeps this clear of §11.1 —
// that governs credentials belonging to the *client* (a Vercel or Sentry token
// that can read their systems), and those still need envelope encryption with a
// managed KMS before the first one is stored.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  parseGithubEvent,
  parseVercelDeployment,
  verifyGithub,
  verifyVercel,
} from './verify.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RepoLink {
  id: string;
  org_id: string;
  provider: string;
  repo: string;
  client_id: string | null;
  project_id: string | null;
  asset_id: string | null;
  webhook_secret: string;
  active: boolean;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false }, 405);

  const url = new URL(req.url);
  const token = url.searchParams.get('t');

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Two ways in.
  //
  // `?t=<token>` is the one users get: a repo they connected in Merik, carrying
  // its own signing secret and already knowing its client, project and asset.
  // The token identifies which link is speaking *before* the body is read,
  // which is what makes it possible to verify the signature on a body nobody
  // has trusted yet.
  //
  // `?provider=&org=` is the original hand-wired form, kept working because it
  // is deployed and receiving events. It uses a shared environment secret and
  // can only attach events to an asset by hostname.
  let link: RepoLink | null = null;
  let provider: string | null;
  let orgId: string | null;
  let secret: string | undefined;

  if (token) {
    if (!/^[a-f0-9]{16,64}$/.test(token)) return json({ ok: false }, 404);
    const { data } = await admin
      .from('repo_links')
      .select('id, org_id, provider, repo, client_id, project_id, asset_id, webhook_secret, active')
      .eq('token', token)
      .maybeSingle()
      .returns<RepoLink>();
    // Same answer for unknown and disabled: a response that tells them apart
    // tells an attacker which tokens are real.
    if (!data || !data.active) return json({ ok: false }, 404);
    link = data;
    provider = data.provider;
    orgId = data.org_id;
    secret = data.webhook_secret;
  } else {
    provider = url.searchParams.get('provider');
    orgId = url.searchParams.get('org');
    if (!orgId || !UUID_RE.test(orgId)) return json({ ok: false, error: 'org required' }, 400);
    secret = Deno.env.get(
      provider === 'github' ? 'GITHUB_WEBHOOK_SECRET' : 'VERCEL_WEBHOOK_SECRET',
    );
  }

  if (provider !== 'github' && provider !== 'vercel') {
    return json({ ok: false, error: 'unknown provider' }, 400);
  }
  // Refuse rather than accept unsigned events. An endpoint that writes evidence
  // about outages must not be open just because someone forgot to set a secret.
  if (!secret) return json({ ok: false, error: 'webhook secret not configured' }, 500);

  // The raw text, not a re-serialised object: the signature covers these exact
  // bytes and JSON.stringify would produce different ones.
  const raw = await req.text();
  const ok = provider === 'github'
    ? await verifyGithub(raw, req.headers.get('x-hub-signature-256'), secret)
    : await verifyVercel(raw, req.headers.get('x-vercel-signature'), secret);
  if (!ok) return json({ ok: false }, 401);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: 'invalid json' }, 400);
  }

  const parsed = provider === 'github'
    ? parseGithubEvent(req.headers.get('x-github-event'), body)
    : parseVercelDeployment(body);
  // Not every delivery is a change worth recording — a preview build, a failed
  // deploy, a branch push with no head commit. Accepted and ignored, so the
  // sender does not retry forever.
  if (!parsed) return json({ ok: true, recorded: false });

  // A token issued for one repo may not post events about another. GitHub sends
  // the repository in every payload, and by here the signature has proved the
  // payload is genuinely from whoever holds this link's secret — so this catches
  // a link pointed at the wrong repo, and stops one client's token being reused
  // to write into another's timeline.
  if (link && provider === 'github') {
    const claimed = ((body.repository ?? {}) as { full_name?: string }).full_name;
    if (claimed && claimed.toLowerCase() !== link.repo.toLowerCase()) {
      return json({ ok: false, error: 'repository does not match this link' }, 403);
    }
  }

  // A connected repo already knows where it belongs. Only the legacy path has to
  // guess from the deployment hostname.
  let assetId: string | null = link?.asset_id ?? null;
  if (!assetId && parsed.host) {
    const { data } = await admin
      .from('digital_assets')
      .select('id, primary_url')
      .eq('org_id', orgId)
      .is('archived_at', null)
      .returns<Array<{ id: string; primary_url: string | null }>>();
    const host = parsed.host.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
    assetId = (data ?? []).find((a) => {
      if (!a.primary_url) return false;
      try {
        return new URL(a.primary_url).hostname.toLowerCase() === host;
      } catch {
        return false;
      }
    })?.id ?? null;
  }

  const { error } = await admin.from('change_events').insert({
    org_id: orgId,
    asset_id: assetId,
    client_id: link?.client_id ?? null,
    project_id: link?.project_id ?? null,
    repo_link_id: link?.id ?? null,
    source: provider,
    kind: parsed.kind,
    ref: parsed.ref,
    title: parsed.title,
    url: parsed.url,
    actor: parsed.actor,
    payload: { host: parsed.host, ...(parsed.meta ?? {}) },
  });
  if (error) return json({ ok: false, error: error.message }, 500);

  // Lets the UI say "connected, nothing yet" versus "connected and working",
  // which is the difference between a quiet team and a webhook never saved.
  if (link) {
    await admin.from('repo_links')
      .update({ last_event_at: new Date().toISOString() })
      .eq('id', link.id);
  }

  return json({ ok: true, recorded: true, asset_matched: !!assetId });
});
