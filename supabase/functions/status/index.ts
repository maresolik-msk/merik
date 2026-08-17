// Merik — public status page data (Deno).
//
// Returns the sanitised JSON a status page is allowed to show, for a token.
// Deploy with verify_jwt = false: the audience is a client's staff and their
// customers, who have no Merik login and never will.
//
// It returns JSON and not a page on purpose. Supabase forces
// `content-type: text/plain` and injects `content-security-policy:
// default-src 'none'; sandbox` on every response from the shared
// *.supabase.co/functions/v1/ host, so HTML served from here arrives as source
// text no matter what headers this function sets. The page itself is therefore
// static, on merik.in, at /status/ — which is where a client-facing page wanted
// to live anyway.
//
// The token is the credential. It is 32 hex characters from gen_random_bytes,
// it is the only thing the caller supplies, and every query below is scoped by
// the row it resolves to — so a valid token for one client cannot reach another
// client's assets even by accident.
//
// This runs as the service role, which sounds alarming for a public endpoint.
// It is the safer of the two options: the alternative is an anonymous SELECT
// policy on the underlying tables, which would expose the raw rows (internal
// incident titles, check errors, the token list itself) and rely on the caller
// asking nicely for a subset. Here the projection IS the boundary, and what
// leaves this function is built field by field, never spread from a row.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_INCIDENTS = 10;

// The page is served from merik.in and fetches this cross-origin. Read-only and
// token-scoped, so there is nothing here that a restricted origin list would
// protect — a client may also want to embed their own page elsewhere.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'accept, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json',
      // Cheap protection against everyone refreshing during an outage: serve a
      // slightly stale page rather than a query per visitor.
      'Cache-Control': 'public, max-age=30',
    },
  });

// One shape for malformed, unknown and disabled. A response that distinguishes
// them is a response that confirms which tokens are real.
const notFound = () => json({ error: 'not_found' }, 404);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const token = new URL(req.url).searchParams.get('t')?.trim();
  if (!token || !/^[a-f0-9]{16,64}$/.test(token)) return notFound();

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: page } = await admin
    .from('status_pages')
    .select('org_id, client_id, title, intro, enabled')
    .eq('token', token)
    .maybeSingle()
    .returns<
      { org_id: string; client_id: string | null; title: string; intro: string | null; enabled: boolean }
    >();

  if (!page || !page.enabled) return notFound();

  // Assets for this page: one client's, or the whole tenant's when the page has
  // no client. Staging is never shown — a client does not need to know a staging
  // box is down, and it would read as an outage.
  let assetQuery = admin
    .from('digital_assets')
    .select('id, name, status, sla_tier')
    .eq('org_id', page.org_id)
    .eq('environment', 'production')
    .is('archived_at', null)
    .order('name');
  if (page.client_id) assetQuery = assetQuery.eq('client_id', page.client_id);

  const { data: assetRows } = await assetQuery.returns<
    Array<{ id: string; name: string; status: string; sla_tier: string }>
  >();
  const assets = assetRows ?? [];
  const assetIds = assets.map((a) => a.id);

  const { data: uptimeRows } = assetIds.length
    ? await admin
      .from('asset_uptime_30d')
      .select('asset_id, uptime_pct')
      .in('asset_id', assetIds)
      .returns<Array<{ asset_id: string; uptime_pct: number | null }>>()
    : { data: [] };
  const uptimeBy = new Map((uptimeRows ?? []).map((u) => [u.asset_id, u.uptime_pct]));

  // Approval gate. Only incidents a human marked client_visible AND wrote a
  // summary for appear here — never the internal title, never automatically.
  const { data: incidentRows } = assetIds.length
    ? await admin
      .from('incidents')
      .select('started_at, resolved_at, client_summary')
      .in('asset_id', assetIds)
      .eq('client_visible', true)
      .not('client_summary', 'is', null)
      .order('started_at', { ascending: false })
      .limit(MAX_INCIDENTS)
      .returns<Array<{ started_at: string; resolved_at: string | null; client_summary: string }>>()
    : { data: [] };

  // Built field by field. Nothing from a row reaches the client except these.
  return json({
    title: page.title,
    intro: page.intro,
    assets: assets.map((a) => ({
      name: a.name,
      status: a.status,
      uptime_pct: uptimeBy.get(a.id) ?? null,
      sla_tier: a.sla_tier,
    })),
    incidents: (incidentRows ?? []).map((i) => ({
      started_at: i.started_at,
      resolved_at: i.resolved_at,
      summary: i.client_summary,
    })),
    generatedAt: new Date().toISOString(),
  });
});
