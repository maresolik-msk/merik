-- Digital Operations — Phase 2, part one: why, not just whether.
--
-- Phase 1 answers "is it up". This is the beginning of "what changed" and "is it
-- even ours" — the two questions an engineer asks in the first minute of an
-- incident, and the two Merik can answer without collecting any telemetry.
--
-- Deliberately NOT here, and not by accident:
--   * No table for client API credentials. §11.1 requires envelope encryption
--     with a managed KMS before the first Vercel or Sentry token is stored, and
--     a `text` column called `api_token` is how that requirement quietly never
--     happens. The connectors come after that design, not before.
--   * No synthetic_flow infrastructure. Playwright cannot run in an Edge
--     Function, so it needs its own service — and the blueprint's own advice is
--     to price a browser check before enabling it, not after.

-- ============================================================= change events ---
-- Deployments and commits, from webhooks. No polling, no credentials: the
-- client's CI already knows when it shipped, and it will tell us for free.
create table if not exists public.change_events (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.orgs(id),
  asset_id        uuid references public.digital_assets(id) on delete cascade,
  ts              timestamptz not null default now(),
  source          text not null check (source in ('github','vercel','cloudflare','vendor_status','manual')),
  kind            text not null,        -- deployment | commit | config_change | vendor_incident
  ref             text,                 -- commit sha, deployment id
  title           text,
  url             text,
  actor           text,                 -- who pushed; a login, not a Merik user
  payload         jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
-- The correlation query is "changes to this asset just before this timestamp",
-- so this is the index that makes it a lookup rather than a scan.
create index if not exists idx_change_events_asset_ts on public.change_events(asset_id, ts desc);
create index if not exists idx_change_events_org_ts   on public.change_events(org_id, ts desc);

-- ======================================================== vendor status feed ---
-- Global, not per-tenant: Stripe being down is the same fact for every customer,
-- and polling it once per vendor rather than once per tenant is the difference
-- between 6 requests an hour and 600.
--
-- Statuspage's /api/v2/status.json is a de-facto standard — Supabase, Cloudflare,
-- GitHub, Vercel and Twilio all serve it with identical shape. One adapter
-- covers all of them, which is why `format` exists but currently has one value.
create table if not exists public.vendor_status (
  provider    text primary key,
  label       text not null,
  status_url  text not null,
  format      text not null default 'statuspage' check (format in ('statuspage')),
  -- none | minor | major | critical | unknown, straight from the feed
  indicator   text not null default 'unknown',
  description text,
  checked_at  timestamptz,
  updated_at  timestamptz not null default now()
);

insert into public.vendor_status (provider, label, status_url) values
  ('supabase',   'Supabase',   'https://status.supabase.com/api/v2/status.json'),
  ('cloudflare', 'Cloudflare', 'https://www.cloudflarestatus.com/api/v2/status.json'),
  ('github',     'GitHub',     'https://www.githubstatus.com/api/v2/status.json'),
  ('vercel',     'Vercel',     'https://www.vercel-status.com/api/v2/status.json'),
  ('twilio',     'Twilio',     'https://status.twilio.com/api/v2/status.json'),
  -- stripestatus.com, not status.stripe.com: the latter is a 404. SendGrid is
  -- deliberately absent — it has no reachable Statuspage feed, and Twilio's
  -- above covers it.
  ('stripe',     'Stripe',     'https://www.stripestatus.com/api/v2/status.json'),
  ('openai',     'OpenAI',     'https://status.openai.com/api/v2/status.json')
on conflict (provider) do nothing;

-- Which assets lean on which vendors. `hard` means the asset cannot work without
-- it — that is what licenses suppressing the asset's own incident.
create table if not exists public.asset_dependencies (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references public.orgs(id),
  asset_id    uuid not null references public.digital_assets(id) on delete cascade,
  provider    text not null references public.vendor_status(provider),
  criticality text not null default 'hard' check (criticality in ('hard','soft')),
  created_at  timestamptz not null default now(),
  unique (asset_id, provider)
);
create index if not exists idx_asset_dependencies_asset on public.asset_dependencies(asset_id);

-- ================================================================ suppression ---
-- Why an incident did not wake anyone. Null is the normal case.
alter table public.incidents
  add column if not exists suppressed_reason text
  check (suppressed_reason in ('maintenance_window','dependency_outage','flapping'));
-- Which vendor, when suppressed for one. Kept beside the reason rather than dug
-- out of incident_events, because the incident list needs it on every row.
alter table public.incidents
  add column if not exists suppressed_provider text;

-- Correlation writes new timeline kinds, which the Phase 1 constraint did not
-- allow — the insert would have failed at runtime, where nothing was watching.
alter table public.incident_events drop constraint if exists incident_events_kind_check;
alter table public.incident_events add  constraint incident_events_kind_check
  check (kind in (
    'check_failed','recovered','note_added','state_changed','severity_changed',
    'assigned','client_notified','deploy_detected','commit_linked','dependency_down'));

-- ========================================================= org stamping + RLS ---
drop trigger if exists trg_setorg_change_events on public.change_events;
create trigger trg_setorg_change_events before insert on public.change_events
  for each row execute function public.set_org();
drop trigger if exists trg_setorg_asset_dependencies on public.asset_dependencies;
create trigger trg_setorg_asset_dependencies before insert on public.asset_dependencies
  for each row execute function public.set_org();

alter table public.change_events      enable row level security;
alter table public.asset_dependencies enable row level security;
alter table public.vendor_status      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['change_events','asset_dependencies'] loop
    execute format('drop policy if exists p_%s_read on public.%I', t, t);
    execute format($p$create policy p_%s_read on public.%I for select to authenticated
                     using (org_id = my_org())$p$, t, t);
    execute format('drop policy if exists p_%s_w on public.%I', t, t);
    execute format($p$create policy p_%s_w on public.%I for all to authenticated
                     using (is_admin() and org_id = my_org())
                     with check (is_admin() and (org_id is null or org_id = my_org()))$p$, t, t);
    execute format('drop policy if exists p_%s_super on public.%I', t, t);
    execute format($p$create policy p_%s_super on public.%I for all to authenticated
                     using (is_super_admin()) with check (is_super_admin())$p$, t, t);
  end loop;
end $$;

-- Vendor status is public information about public services. Every signed-in
-- user may read it; only the prober writes it.
drop policy if exists p_vendor_status_read on public.vendor_status;
create policy p_vendor_status_read on public.vendor_status for select to authenticated using (true);
drop policy if exists p_vendor_status_super on public.vendor_status;
create policy p_vendor_status_super on public.vendor_status for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

grant select, insert, update, delete on public.change_events      to authenticated, service_role;
grant select, insert, update, delete on public.asset_dependencies to authenticated, service_role;
grant select on public.vendor_status to authenticated;
grant select, insert, update, delete on public.vendor_status to service_role;

-- ================================================== incident response metrics ---
-- MTTA and MTTR per incident, for rolling up by client, owner or month. A view
-- of durations rather than stored averages: an average is a question, and which
-- question changes every time someone asks.
create or replace view public.incident_metrics
with (security_invoker = true) as
select i.id                                   as incident_id,
       i.org_id,
       i.asset_id,
       a.client_id,
       i.assigned_employee_id,
       i.severity,
       i.started_at,
       i.suppressed_reason,
       -- Minutes to acknowledge, and to resolve. Null while still open, which is
       -- correct: an unresolved incident has no resolution time, and counting it
       -- as zero would flatter the average.
       case when i.acknowledged_at is null then null
            else round(extract(epoch from (i.acknowledged_at - i.started_at)) / 60)::int
       end                                    as ack_minutes,
       case when i.resolved_at is null then null
            else round(extract(epoch from (i.resolved_at - i.started_at)) / 60)::int
       end                                    as resolve_minutes
  from public.incidents i
  join public.digital_assets a on a.id = i.asset_id;

grant select on public.incident_metrics to authenticated, service_role;

-- =================================================== vendor status scheduling ---
-- Every 5 minutes: 8 vendors is 96 requests an hour against public endpoints
-- that are built to be polled. The probe function does the fetching; this only
-- decides when.
do $$
begin
  perform cron.unschedule('merik-vendor-status');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule('merik-vendor-status', '*/5 * * * *', $cron$
    select net.http_post(
      url     := c.probe_url || '?job=vendors',
      headers := jsonb_build_object('Content-Type','application/json',
                                    'x-probe-secret', c.probe_secret),
      body    := '{}'::jsonb)
    from public.ops_config c
    where c.probe_url is not null and c.probe_secret is not null;
  $cron$);
exception when others then
  raise notice 'could not schedule merik-vendor-status (%)', sqlerrm;
end $$;
