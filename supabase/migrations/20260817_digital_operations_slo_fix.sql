-- Availability means availability: only the http monitor counts.
--
-- Both uptime views joined every monitor for an asset, so once certificate
-- monitors existed a cert check counted as an availability failure. One failing
-- daily ssl check against a 99.9% target burns 1000× the hourly budget, which
-- would have shown a perfectly healthy site as Critical / 0 health, driven
-- burn-rate severity to Sev1, and reported the wrong uptime to the client on
-- their status page.
--
-- Found immediately: the first real ssl check failed (Supabase's Edge Runtime
-- returns no peer certificate) and the numbers moved when nothing was wrong.
-- The type filter is the fix, and it is the correct statement either way — a
-- certificate expiring is not the site being down, and the two do not belong in
-- one ratio. asset_uptime_month already filtered to http; these two did not.

create or replace view public.asset_uptime_30d
with (security_invoker = true) as
select a.id                                         as asset_id,
       a.org_id,
       count(c.*)                                   as checks,
       count(*) filter (where c.ok)                 as ok_checks,
       case when count(c.*) = 0 then null
            else round(100.0 * count(*) filter (where c.ok) / count(c.*), 2)
       end                                          as uptime_pct
  from public.digital_assets a
  left join public.monitors m on m.asset_id = a.id and m.type = 'http'
  left join public.check_results c on c.monitor_id = m.id
       and c.ts > now() - interval '30 days'
 group by a.id, a.org_id;

grant select on public.asset_uptime_30d to authenticated, service_role;

create or replace view public.asset_slo
with (security_invoker = true) as
with tgt as (
  select a.id            as asset_id,
         a.org_id,
         a.sla_tier,
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
         count(*) filter (where c.ts > now() - interval '30 days')              as n30,
         count(*) filter (where c.ts > now() - interval '30 days' and not c.ok) as f30,
         count(*) filter (where c.ts > now() - interval '1 hour')               as n1h,
         count(*) filter (where c.ts > now() - interval '1 hour'  and not c.ok) as f1h,
         count(*) filter (where c.ts > now() - interval '6 hours')              as n6h,
         count(*) filter (where c.ts > now() - interval '6 hours' and not c.ok) as f6h,
         count(*) filter (where c.ts > now() - interval '3 days')               as n3d,
         count(*) filter (where c.ts > now() - interval '3 days'  and not c.ok) as f3d
    from public.monitors m
    left join public.check_results c on c.monitor_id = m.id
   where m.type = 'http'                        -- availability, not certificates
   group by m.asset_id
)
select t.asset_id,
       t.org_id,
       t.sla_tier,
       t.allowed                                          as allowed_failure_ratio,
       coalesce(o.n30, 0)                                 as checks_30d,
       coalesce(o.f30, 0)                                 as failures_30d,
       case when t.allowed is null or coalesce(o.n30,0) = 0 then null
            else round(((o.f30::numeric / o.n30) / t.allowed), 4)
       end                                                as budget_consumed_ratio,
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

-- Clear the certificate checks that could not read a certificate, and the state
-- they left behind. The probe no longer records an unreadable certificate as a
-- failure, but these rows predate that and would otherwise reach the second
-- consecutive failure and open an incident about a healthy site.
delete from public.check_results c
 where c.error = 'no certificate presented'
   and exists (select 1 from public.monitors m where m.id = c.monitor_id and m.type = 'ssl');

update public.monitor_state s
   set state = 'unknown', consecutive_failures = 0, consecutive_successes = 0, updated_at = now()
 where exists (select 1 from public.monitors m where m.id = s.monitor_id and m.type = 'ssl');
