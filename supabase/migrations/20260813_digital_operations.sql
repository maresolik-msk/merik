-- Digital Operations — Phase 1 spine.
--
-- What this is: the asset registry plus a native uptime probe, wired into the
-- org graph so an incident already knows its client, its project and the person
-- who owns it. That join is the point of the module; the uptime checking on its
-- own is a commodity.
--
-- Naming: `assets` is already taken by the hardware inventory
-- (20260717_asset_management.sql), hence `digital_assets`.
--
-- Deliberate omissions, and why:
--   * No TimescaleDB hypertable. Supabase doesn't offer the extension, and at
--     one monitor per asset on a 5-minute interval an asset produces ~288
--     rows/day. Plain Postgres with a retention job is correct for years.
--     ponytail: single table + nightly delete; partition by month if
--     check_results ever gets slow to scan.
--   * No asset_components / asset_dependencies. Those exist to hang
--     integrations and vendor status feeds off, which is Phase 2. Empty tables
--     are not a design.
--   * No teams linkage. Merik has no teams table — `employees.department` is
--     free text — so ownership is a single owner_employee_id.
--   * No merik_task_id. There is no shared tasks table to point at; `emp_tasks`
--     is a private per-employee drafting pad and is the wrong join. Incidents
--     auto-assign to the asset owner instead, which is the part that carries
--     the accountability.
--
-- Conventions copied from the existing schema: org_id -> orgs(id) stamped by
-- the set_org() trigger, RLS via my_org() / is_admin() / is_super_admin().

-- ============================================================ asset registry ---
create table if not exists public.digital_assets (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references public.orgs(id),
  client_id         uuid references public.clients(id)   on delete set null,
  project_id        uuid references public.projects(id)  on delete set null,
  owner_employee_id uuid references public.employees(id) on delete set null,
  name              text not null,
  kind              text not null default 'website'
                      check (kind in ('website','webapp','api','mobile_backend','internal')),
  environment       text not null default 'production'
                      check (environment in ('production','staging')),
  primary_url       text,
  sla_tier          text not null default '99.9'
                      check (sla_tier in ('99.99','99.9','99.5','99.0','best_effort')),
  criticality       text not null default 'normal'
                      check (criticality in ('critical','high','normal','low')),
  status            text not null default 'unknown'
                      check (status in ('operational','degraded','down','maintenance','unknown')),
  -- "we're deploying, shut up for 30 minutes" — suppresses incident creation.
  maintenance_until timestamptz,
  created_at        timestamptz not null default now(),
  archived_at       timestamptz,
  unique (org_id, name)
);
create index if not exists idx_digital_assets_org     on public.digital_assets(org_id);
create index if not exists idx_digital_assets_client  on public.digital_assets(client_id);
create index if not exists idx_digital_assets_owner   on public.digital_assets(owner_employee_id);

-- ================================================================== monitors ---
create table if not exists public.monitors (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid references public.orgs(id),
  asset_id         uuid not null references public.digital_assets(id) on delete cascade,
  type             text not null default 'http'
                     check (type in ('http','ssl','dns','tcp','synthetic_flow','integration')),
  target           text not null,
  -- http: { method, expect_status, expect_text, timeout_ms, headers }
  config           jsonb not null default '{}',
  interval_seconds int  not null default 300 check (interval_seconds in (60,300,900,3600)),
  enabled          bool not null default true,
  -- The scheduler is this column: the probe claims `enabled and next_run_at <= now()`.
  -- No queue, no lock table.
  next_run_at      timestamptz not null default now(),
  created_at       timestamptz not null default now()
);
create index if not exists idx_monitors_asset on public.monitors(asset_id);
create index if not exists idx_monitors_due   on public.monitors(next_run_at) where enabled;

-- An asset with a URL gets its HTTP monitor for free, and the target follows the
-- URL when it's edited. Without this the UI needs a whole monitor editor to do
-- the one thing every asset wants.
create or replace function public.digital_assets_sync_monitor()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.primary_url is null or btrim(new.primary_url) = '' then
    delete from public.monitors where asset_id = new.id and type = 'http';
    return new;
  end if;

  update public.monitors
     set target = new.primary_url
   where asset_id = new.id and type = 'http';

  if not found then
    insert into public.monitors (org_id, asset_id, type, target)
    values (new.org_id, new.id, 'http', new.primary_url);
  end if;

  return new;
end $function$;

drop trigger if exists trg_digital_assets_monitor on public.digital_assets;
create trigger trg_digital_assets_monitor
  after insert or update of primary_url on public.digital_assets
  for each row execute function public.digital_assets_sync_monitor();

-- ============================================================= check results ---
-- The hot table. org_id is denormalised so RLS is a column compare rather than a
-- two-table join on every row.
create table if not exists public.check_results (
  id            bigint generated always as identity primary key,
  org_id        uuid references public.orgs(id),
  monitor_id    uuid not null references public.monitors(id) on delete cascade,
  ts            timestamptz not null default now(),
  region        text not null default 'default',
  ok            bool not null,
  status_code   int,
  latency_ms    int,
  failure_stage text,   -- dns | connect | tls | request | response | assertion
  error         text
);
create index if not exists idx_check_results_monitor_ts on public.check_results(monitor_id, ts desc);
create index if not exists idx_check_results_ts         on public.check_results(ts);

create table if not exists public.monitor_state (
  monitor_id            uuid primary key references public.monitors(id) on delete cascade,
  org_id                uuid references public.orgs(id),
  state                 text not null default 'unknown' check (state in ('up','down','unknown')),
  consecutive_failures  int  not null default 0,
  consecutive_successes int  not null default 0,
  since                 timestamptz not null default now(),
  last_ok_at            timestamptz,
  last_check_at         timestamptz,
  open_incident_id      uuid,
  updated_at            timestamptz not null default now()
);

-- ================================================================= incidents ---
create table if not exists public.incidents (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid references public.orgs(id),
  asset_id               uuid not null references public.digital_assets(id) on delete cascade,
  detected_by_monitor_id uuid references public.monitors(id) on delete set null,
  assigned_employee_id   uuid references public.employees(id) on delete set null,
  severity               int  not null default 3 check (severity between 1 and 4),
  state                  text not null default 'detected'
                           check (state in ('detected','acknowledged','investigating','mitigated','resolved')),
  title                  text not null,
  cause_category         text,
  started_at             timestamptz not null default now(),
  acknowledged_at        timestamptz,
  resolved_at            timestamptz,
  -- Client-facing output is approval-gated: false until a human writes a summary
  -- and publishes it. Never automatic.
  client_visible         bool not null default false,
  client_summary         text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists idx_incidents_org_open on public.incidents(org_id, started_at desc)
  where state <> 'resolved';
create index if not exists idx_incidents_asset    on public.incidents(asset_id, started_at desc);

alter table public.monitor_state
  drop constraint if exists monitor_state_open_incident_fk;
alter table public.monitor_state
  add constraint monitor_state_open_incident_fk
  foreign key (open_incident_id) references public.incidents(id) on delete set null;

create table if not exists public.incident_events (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references public.orgs(id),
  incident_id       uuid not null references public.incidents(id) on delete cascade,
  ts                timestamptz not null default now(),
  kind              text not null check (kind in (
                      'check_failed','recovered','note_added','state_changed',
                      'severity_changed','assigned','client_notified')),
  payload           jsonb not null default '{}',
  actor_employee_id uuid references public.employees(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists idx_incident_events_incident on public.incident_events(incident_id, ts);

-- =================================================================== metering ---
-- Written from the first deployment, free beta included. Retrofitting metering
-- into a live product is the migration nobody wants; the tier can't be priced
-- without this data either way.
create table if not exists public.usage_events (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references public.orgs(id),
  asset_id   uuid references public.digital_assets(id) on delete set null,
  ts         timestamptz not null default now(),
  meter      text not null check (meter in
               ('check_run','browser_run','integration_poll','incident_stored','report_generated')),
  quantity   int  not null default 1,
  region     text,
  created_at timestamptz not null default now()
);
create index if not exists idx_usage_events_org_ts on public.usage_events(org_id, ts);

-- ================================================================ probe config ---
-- One row, super-admin only. Holds the scheduler's call target and shared secret
-- so neither ends up in git. The probe function refuses requests whose
-- x-probe-secret doesn't match its own PROBE_SECRET env var.
create table if not exists public.ops_config (
  id           int primary key default 1 check (id = 1),
  probe_url    text,
  probe_secret text,
  updated_at   timestamptz not null default now()
);

-- ========================================================= org stamping + RLS ---
drop trigger if exists trg_setorg_digital_assets on public.digital_assets;
create trigger trg_setorg_digital_assets before insert on public.digital_assets
  for each row execute function public.set_org();
drop trigger if exists trg_setorg_monitors on public.monitors;
create trigger trg_setorg_monitors before insert on public.monitors
  for each row execute function public.set_org();
-- Notes added from the Incident view are written by the user, so they need the
-- same stamping as any other user-authored row.
drop trigger if exists trg_setorg_incident_events on public.incident_events;
create trigger trg_setorg_incident_events before insert on public.incident_events
  for each row execute function public.set_org();

alter table public.digital_assets  enable row level security;
alter table public.monitors        enable row level security;
alter table public.check_results   enable row level security;
alter table public.monitor_state   enable row level security;
alter table public.incidents       enable row level security;
alter table public.incident_events enable row level security;
alter table public.usage_events    enable row level security;
alter table public.ops_config      enable row level security;

-- Read is org-wide (an engineer needs to see that the site they built is down),
-- writes are admin-only. This follows clients/projects rather than the
-- admin-only assets/software tables.
do $$
declare t text;
begin
  foreach t in array array['digital_assets','monitors','check_results','monitor_state',
                           'incidents','incident_events'] loop
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

-- Usage is billing data: admins of the org may read it, nobody but the service
-- role and super admin may write it.
drop policy if exists p_usage_events_read on public.usage_events;
create policy p_usage_events_read on public.usage_events for select to authenticated
  using (is_admin() and org_id = my_org());
drop policy if exists p_usage_events_super on public.usage_events;
create policy p_usage_events_super on public.usage_events for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

-- ops_config holds a shared secret. Super admin only — no org-level access at all.
drop policy if exists p_ops_config_super on public.ops_config;
create policy p_ops_config_super on public.ops_config for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

grant select, insert, update, delete on public.digital_assets  to authenticated, service_role;
grant select, insert, update, delete on public.monitors        to authenticated, service_role;
grant select, insert, update, delete on public.check_results   to authenticated, service_role;
grant select, insert, update, delete on public.monitor_state   to authenticated, service_role;
grant select, insert, update, delete on public.incidents       to authenticated, service_role;
grant select, insert, update, delete on public.incident_events to authenticated, service_role;
grant select, insert, update, delete on public.usage_events    to authenticated, service_role;
grant select, insert, update, delete on public.ops_config      to service_role;
grant usage, select on sequence public.check_results_id_seq    to authenticated, service_role;

-- ================================================================= scheduling ---
-- pg_cron drives the probe; pg_net makes the call. Both are wrapped because a
-- project without the extensions available should still get the schema.
do $$
begin
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_cron/pg_net unavailable (%) — schedule the probe externally', sqlerrm;
end $$;

do $$
begin
  perform cron.unschedule('merik-probe');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule('merik-probe', '* * * * *', $cron$
    select net.http_post(
      url     := c.probe_url,
      headers := jsonb_build_object('Content-Type','application/json',
                                    'x-probe-secret', c.probe_secret),
      body    := '{}'::jsonb)
    from public.ops_config c
    where c.probe_url is not null and c.probe_secret is not null;
  $cron$);
exception when others then
  raise notice 'could not schedule merik-probe (%)', sqlerrm;
end $$;

-- Retention (§11.5). Raw checks are for debugging, not for history — incidents
-- carry the history. Unbounded retention is a cost problem and a liability.
do $$
begin
  perform cron.unschedule('merik-ops-retention');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule('merik-ops-retention', '17 3 * * *', $cron$
    delete from public.check_results where ts < now() - interval '30 days';
    delete from public.usage_events  where ts < now() - interval '24 months';
  $cron$);
exception when others then
  raise notice 'could not schedule merik-ops-retention (%)', sqlerrm;
end $$;
