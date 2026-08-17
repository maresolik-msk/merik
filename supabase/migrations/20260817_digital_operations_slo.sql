-- Digital Operations — SLO error budgets, burn rates, and SSL expiry.
--
-- Replaces the health-score placeholder. Until now severity came from the
-- asset's declared criticality, which is a guess made at registration time and
-- never revisited. This makes it a measurement.
--
-- The model is the SRE-standard one (blueprint §8): every SLA tier implies an
-- allowed failure ratio, the error budget is how much of that you have left, and
-- the score is the remaining budget rather than an invented weighting. It is
-- defensible by construction — "you are at 41 because the checkout flow has
-- consumed 59% of its monthly budget" — which the old number never was.
--
-- No `slos` / `slo_budget` tables. The blueprint has both, to allow several SLI
-- types per asset (latency_p95, error_rate, flow_success). Phase 1 measures
-- exactly one thing, availability, and its target is already declared on the
-- asset as sla_tier — so a table would hold one derivable row per asset and a
-- second place for the target to disagree with itself. Add them with the second
-- SLI, when there is something to choose between.

-- SSL checks run daily, which the interval constraint did not allow.
alter table public.monitors drop constraint if exists monitors_interval_seconds_check;
alter table public.monitors add  constraint monitors_interval_seconds_check
  check (interval_seconds in (30, 60, 300, 900, 3600, 86400));

-- ================================================ error budget + burn rates ---
-- Windows, not one number. A burn rate is only meaningful against the window it
-- was measured over: 6× over an hour is noise, 6× over six hours is an outage.
-- Hence three, matching the three alerting tiers in §8.4.
create or replace view public.asset_slo
with (security_invoker = true) as
with tgt as (
  select a.id            as asset_id,
         a.org_id,
         a.sla_tier,
         -- 99.9% availability means 0.1% of checks are allowed to fail.
         -- best_effort has no contract, so it has no budget to burn.
         case a.sla_tier
           when '99.99' then 0.0001
           when '99.9'  then 0.0010
           when '99.5'  then 0.0050
           when '99.0'  then 0.0100
           else null
         end as allowed
    from public.digital_assets a
   where a.archived_at is null
),
obs as (
  select m.asset_id,
         count(*) filter (where c.ts > now() - interval '30 days')                  as n30,
         count(*) filter (where c.ts > now() - interval '30 days' and not c.ok)     as f30,
         count(*) filter (where c.ts > now() - interval '1 hour')                   as n1h,
         count(*) filter (where c.ts > now() - interval '1 hour'  and not c.ok)     as f1h,
         count(*) filter (where c.ts > now() - interval '6 hours')                  as n6h,
         count(*) filter (where c.ts > now() - interval '6 hours' and not c.ok)     as f6h,
         count(*) filter (where c.ts > now() - interval '3 days')                   as n3d,
         count(*) filter (where c.ts > now() - interval '3 days'  and not c.ok)     as f3d
    from public.monitors m
    left join public.check_results c on c.monitor_id = m.id
   group by m.asset_id
)
select t.asset_id,
       t.org_id,
       t.sla_tier,
       t.allowed                                          as allowed_failure_ratio,
       coalesce(o.n30, 0)                                 as checks_30d,
       coalesce(o.f30, 0)                                 as failures_30d,
       -- Ratio of the monthly budget already spent. Can exceed 1: an asset on a
       -- 99.9% target running at 1% failure has spent ten budgets, and hiding
       -- that behind a clamp would hide how bad it is.
       case when t.allowed is null or coalesce(o.n30,0) = 0 then null
            else round(((o.f30::numeric / o.n30) / t.allowed), 4)
       end                                                as budget_consumed_ratio,
       -- The score. Clamped, because budget_remaining is unbounded below — the
       -- 1%-on-99.9% case computes to -9, which would render as -900.
       case when t.allowed is null or coalesce(o.n30,0) = 0 then null
            else greatest(0, least(100,
                   round(100 * (1 - ((o.f30::numeric / o.n30) / t.allowed)))))::int
       end                                                as health,
       case when t.allowed is null or coalesce(o.n1h,0) = 0 then null
            else round(((o.f1h::numeric / o.n1h) / t.allowed), 4) end as burn_rate_1h,
       case when t.allowed is null or coalesce(o.n6h,0) = 0 then null
            else round(((o.f6h::numeric / o.n6h) / t.allowed), 4) end as burn_rate_6h,
       case when t.allowed is null or coalesce(o.n3d,0) = 0 then null
            else round(((o.f3d::numeric / o.n3d) / t.allowed), 4) end as burn_rate_3d
  from tgt t
  left join obs o on o.asset_id = t.asset_id;

grant select on public.asset_slo to authenticated, service_role;

-- ============================================================ hourly rollups ---
-- Raw check_results are dropped at 30 days, which makes a monthly SLA report for
-- any earlier month impossible — and that report is the artifact that justifies a
-- maintenance retainer at renewal. So the numbers needed for it are kept, and
-- only those: counts per monitor per hour, ~720 rows/monitor/month.
--
-- §11.5 also lists 5-minute aggregates at 90 days. Not built: nothing reads them.
-- Hourly is enough for an uptime percentage and for a chart, and a second
-- resolution is a second thing to backfill when it turns out to be wrong.
create table if not exists public.check_rollup_1h (
  monitor_id  uuid not null references public.monitors(id) on delete cascade,
  org_id      uuid references public.orgs(id),
  hour        timestamptz not null,
  checks      int not null,
  failures    int not null,
  avg_latency int,
  max_latency int,
  primary key (monitor_id, hour)
);
create index if not exists idx_check_rollup_hour on public.check_rollup_1h(hour);
create index if not exists idx_check_rollup_org  on public.check_rollup_1h(org_id, hour);

alter table public.check_rollup_1h enable row level security;
drop policy if exists p_check_rollup_read on public.check_rollup_1h;
create policy p_check_rollup_read on public.check_rollup_1h for select to authenticated
  using (org_id = my_org());
drop policy if exists p_check_rollup_super on public.check_rollup_1h;
create policy p_check_rollup_super on public.check_rollup_1h for all to authenticated
  using (is_super_admin()) with check (is_super_admin());
grant select on public.check_rollup_1h to authenticated;
grant select, insert, update, delete on public.check_rollup_1h to service_role;

-- Fold every complete hour that is not already folded. Idempotent, so running it
-- twice or late changes nothing — which matters because the only thing standing
-- between this and lost history is a cron job firing.
create or replace function public.roll_up_check_results()
returns int
language plpgsql
security definer
set search_path = public
as $function$
declare
  n int;
begin
  insert into public.check_rollup_1h (monitor_id, org_id, hour, checks, failures, avg_latency, max_latency)
  select c.monitor_id,
         -- Grouped, not aggregated: every check_results row for a monitor carries
         -- the same org_id, and there is no max() for uuid to fall back on.
         c.org_id,
         date_trunc('hour', c.ts),
         count(*),
         count(*) filter (where not c.ok),
         round(avg(c.latency_ms))::int,
         max(c.latency_ms)
    from public.check_results c
   where c.ts < date_trunc('hour', now())     -- never fold the hour in progress
     and c.ts > now() - interval '35 days'    -- bounded: raw is dropped at 30
   group by c.monitor_id, c.org_id, date_trunc('hour', c.ts)
      on conflict (monitor_id, hour) do update
         set checks      = excluded.checks,
             failures    = excluded.failures,
             avg_latency = excluded.avg_latency,
             max_latency = excluded.max_latency;
  get diagnostics n = row_count;
  return n;
end $function$;

revoke execute on function public.roll_up_check_results() from public, anon, authenticated;
grant execute on function public.roll_up_check_results() to service_role;

do $$
begin
  perform cron.unschedule('merik-ops-rollup');
exception when others then null;
end $$;

do $$
begin
  -- Ten past the hour: after the hour has closed, well before the 03:17 retention
  -- job that deletes the raw rows it reads.
  perform cron.schedule('merik-ops-rollup', '10 * * * *',
    $cron$select public.roll_up_check_results();$cron$);
exception when others then
  raise notice 'could not schedule merik-ops-rollup (%)', sqlerrm;
end $$;

do $$
begin
  perform cron.unschedule('merik-ops-rollup-retention');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule('merik-ops-rollup-retention', '41 3 * * *',
    $cron$delete from public.check_rollup_1h where hour < now() - interval '13 months';$cron$);
exception when others then
  raise notice 'could not schedule merik-ops-rollup-retention (%)', sqlerrm;
end $$;

-- Backfill from whatever raw data still exists, so a report run today is not
-- empty while waiting for the first cron tick.
select public.roll_up_check_results();

-- Per-asset uptime for one calendar month, from the rollups. An RPC rather than a
-- view because the month is an argument, and PostgREST cannot group-by for us.
-- Left as SECURITY INVOKER on purpose: the caller's RLS on check_rollup_1h and
-- digital_assets is what keeps one tenant out of another's numbers.
create or replace function public.asset_uptime_month(p_year int, p_month int)
returns table (
  asset_id   uuid,
  name       text,
  client_id  uuid,
  sla_tier   text,
  checks     bigint,
  failures   bigint,
  uptime_pct numeric
)
language sql
stable
as $function$
  with bounds as (
    select make_timestamptz(p_year, p_month, 1, 0, 0, 0)                    as from_ts,
           make_timestamptz(p_year, p_month, 1, 0, 0, 0) + interval '1 month' as to_ts
  )
  select a.id, a.name, a.client_id, a.sla_tier,
         coalesce(sum(r.checks), 0)::bigint    as checks,
         coalesce(sum(r.failures), 0)::bigint  as failures,
         case when coalesce(sum(r.checks), 0) = 0 then null
              else round(100.0 * (sum(r.checks) - sum(r.failures)) / sum(r.checks), 2)
         end as uptime_pct
    from public.digital_assets a
    left join public.monitors m on m.asset_id = a.id and m.type = 'http'
    left join public.check_rollup_1h r
           on r.monitor_id = m.id
          and r.hour >= (select from_ts from bounds)
          and r.hour <  (select to_ts   from bounds)
   where a.archived_at is null
   group by a.id, a.name, a.client_id, a.sla_tier
   order by a.name;
$function$;

grant execute on function public.asset_uptime_month(int, int) to authenticated, service_role;

-- ============================================================== SSL monitors ---
-- An https asset gets a daily certificate check alongside its uptime check.
-- Replaces the earlier trigger, which only managed the http monitor.
create or replace function public.digital_assets_sync_monitor()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  is_https bool;
begin
  if new.primary_url is null or btrim(new.primary_url) = '' then
    delete from public.monitors where asset_id = new.id and type in ('http','ssl');
    return new;
  end if;

  update public.monitors set target = new.primary_url
   where asset_id = new.id and type = 'http';
  if not found then
    insert into public.monitors (org_id, asset_id, type, target)
    values (new.org_id, new.id, 'http', new.primary_url);
  end if;

  -- Only https has a certificate to expire. A plain-http asset getting an ssl
  -- monitor would fail every day forever, which is the definition of alert noise.
  is_https := new.primary_url ~* '^https://';
  if is_https then
    update public.monitors set target = new.primary_url
     where asset_id = new.id and type = 'ssl';
    if not found then
      insert into public.monitors (org_id, asset_id, type, target, interval_seconds)
      values (new.org_id, new.id, 'ssl', new.primary_url, 86400);
    end if;
  else
    delete from public.monitors where asset_id = new.id and type = 'ssl';
  end if;

  return new;
end $function$;

-- Backfill: existing https assets have no ssl monitor yet. Touching primary_url
-- fires the trigger above, which is less code than repeating its body here.
update public.digital_assets
   set primary_url = primary_url
 where primary_url ~* '^https://' and archived_at is null;
