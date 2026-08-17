-- Digital Operations — alert delivery and public status pages.
--
-- Two additions to the Phase 1 spine:
--
--   1. Alerting. An incident that nobody hears about is a log entry. The probe
--      already knows who owns the asset; this gives it somewhere to record that
--      it has told them, which is also what makes the alert exactly-once.
--
--   2. Status pages. The commercially valuable output of this module is not the
--      internal dashboard, it is the page you can put in front of a client.
--
-- What is deliberately NOT here: an alerts/notifications table. Delivery state
-- is one column on the incident, and the in-app bell derives from rows that
-- already exist (see the NOTIFICATIONS block in app/index.html — same choice,
-- same reasoning). A queue would be a table to drain, a migration to
-- coordinate, and a second place for "was this sent?" to disagree with itself.

-- ============================================================ alert delivery ---
-- Null means "not yet told anyone". Set once, which is the whole dedupe
-- mechanism: no repeat pages for an incident that is still open.
alter table public.incidents
  add column if not exists alerted_at timestamptz;

-- Finding the work each minute: open, never alerted. Partial so it stays tiny
-- regardless of how much incident history accumulates.
create index if not exists idx_incidents_unalerted
  on public.incidents (started_at)
  where alerted_at is null and state <> 'resolved';

-- Optional per-tenant Slack channel. Unset = no Slack, and the probe skips it
-- silently rather than treating an unconfigured integration as a failure.
alter table public.orgs
  add column if not exists slack_webhook_url text;

-- ============================================================= status pages ---
-- One page per client, or one for the whole tenant when client_id is null.
-- Reached by an unguessable token rather than a per-client custom domain:
-- custom domains mean certificate provisioning and a wildcard-DNS story, and
-- that is a decision to make on purpose later, not to be cornered into now.
-- ponytail: token in the path; add custom domains when a client actually asks.
create table if not exists public.status_pages (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references public.orgs(id),
  client_id  uuid references public.clients(id) on delete cascade,
  token      text not null unique default encode(gen_random_bytes(16), 'hex'),
  title      text not null,
  -- Shown under the title. Free text, sanitised on render like everything else.
  intro      text,
  enabled    bool not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, client_id)
);
create index if not exists idx_status_pages_token on public.status_pages(token);

drop trigger if exists trg_setorg_status_pages on public.status_pages;
create trigger trg_setorg_status_pages before insert on public.status_pages
  for each row execute function public.set_org();

alter table public.status_pages enable row level security;

-- No anon policy. The public page is served by the `status` Edge Function using
-- the service role, which is what lets it show a sanitised projection instead of
-- whatever an anonymous SELECT would return. Granting anon read here would leak
-- the token list, and the token IS the credential.
drop policy if exists p_status_pages_read on public.status_pages;
create policy p_status_pages_read on public.status_pages for select to authenticated
  using (org_id = my_org());
drop policy if exists p_status_pages_w on public.status_pages;
create policy p_status_pages_w on public.status_pages for all to authenticated
  using (is_admin() and org_id = my_org())
  with check (is_admin() and (org_id is null or org_id = my_org()));
drop policy if exists p_status_pages_super on public.status_pages;
create policy p_status_pages_super on public.status_pages for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

grant select, insert, update, delete on public.status_pages to authenticated, service_role;

-- ================================================================== uptime ----
-- 30-day availability per asset, for the status page and the SLA line beside it.
-- A view rather than a cached number: at ~288 checks/day/asset this aggregates
-- in milliseconds, and a cache would be a second thing to invalidate.
-- ponytail: materialise it if an org ever has enough assets to make this slow.
-- security_invoker is not optional here. A view runs with the DEFINER's rights by
-- default, which would let any authenticated user read every tenant's uptime
-- through it and quietly undo the row-level security on the tables underneath.
create or replace view public.asset_uptime_30d
with (security_invoker = true) as
select a.id                                             as asset_id,
       a.org_id,
       count(c.*)                                       as checks,
       count(*) filter (where c.ok)                     as ok_checks,
       case when count(c.*) = 0 then null
            else round(100.0 * count(*) filter (where c.ok) / count(c.*), 2)
       end                                              as uptime_pct
  from public.digital_assets a
  left join public.monitors      m on m.asset_id   = a.id
  left join public.check_results c on c.monitor_id = m.id
       and c.ts > now() - interval '30 days'
 group by a.id, a.org_id;

grant select on public.asset_uptime_30d to authenticated, service_role;
