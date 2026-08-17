// Merik — Digital Operations webhook receiver (Deno).
//
// Turns GitHub pushes and Vercel deployments into change_events, so an incident
// can say what shipped just before it. Deploy with verify_jwt = false: the caller
// is GitHub, which has no Merik session.
//
// POST /functions/v1/hooks?provider=github&org=<uuid>
//
// The org is in the query string, not the body, and the signature covers the
// body — so a forged body cannot redirect events into another tenant, and the
// URL a customer configures is the one thing they control.
//
// Secrets are per provider, shared across tenants: GITHUB_WEBHOOK_SECRET and
// VERCEL_WEBHOOK_SECRET. Per-tenant secrets are better and are what the eventual
// connector work should do — they need somewhere encrypted to live (§11.1),
// which does not exist yet, and inventing a plaintext column for it here would
// be exactly the shortcut that requirement is meant to prevent.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  parseGithubPush,
  parseVercelDeployment,
  verifyGithub,
  verifyVercel,
} from './verify.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false }, 405);

  const url = new URL(req.url);
  const provider = url.searchParams.get('provider');
  const orgId = url.searchParams.get('org');

  if (!orgId || !UUID_RE.test(orgId)) return json({ ok: false, error: 'org required' }, 400);
  if (provider !== 'github' && provider !== 'vercel') {
    return json({ ok: false, error: 'unknown provider' }, 400);
  }

  const secret = Deno.env.get(
    provider === 'github' ? 'GITHUB_WEBHOOK_SECRET' : 'VERCEL_WEBHOOK_SECRET',
  );
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

  const parsed = provider === 'github' ? parseGithubPush(body) : parseVercelDeployment(body);
  // Not every delivery is a change worth recording — a preview build, a failed
  // deploy, a branch push with no head commit. Accepted and ignored, so the
  // sender does not retry forever.
  if (!parsed) return json({ ok: true, recorded: false });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Attach to an asset when the host matches one this org monitors. Unmatched
  // events are still stored against the org: better a change with no asset than
  // a change silently dropped, and the org-wide timeline is still useful.
  let assetId: string | null = null;
  if (parsed.host) {
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
    source: provider,
    kind: parsed.kind,
    ref: parsed.ref,
    title: parsed.title,
    url: parsed.url,
    actor: parsed.actor,
    payload: { host: parsed.host },
  });
  if (error) return json({ ok: false, error: error.message }, 500);

  return json({ ok: true, recorded: true, asset_matched: !!assetId });
});
