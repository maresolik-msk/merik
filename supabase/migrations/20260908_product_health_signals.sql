-- Product Health, layer 2 — from "what broke" to "what is going wrong".
--
-- 20260908_product_health.sql answers a question about the past: something threw,
-- here it is, here is how often. Reading it is still a person scanning a list and
-- deciding what matters, which is the job this is supposed to remove.
--
-- This adds the judgement. One warning per issue, carrying every signal that
-- fired, with a risk and a confidence — the same two-number design early_warnings
-- uses for client sites, and for the same reason: risk is how bad the evidence
-- looks, confidence is how much evidence there is, and collapsing them into one
-- score is how monitoring tools end up lying politely.
--
-- Deliberately NOT here, and why:
--   * No product_baseline table. digital_health needs one because its percentiles
--     scan two weeks of raw check_results for every asset every five minutes.
--     product_events is ALREADY aggregated hourly, so a fortnight of it is a few
--     thousand rows and the norm is one cheap aggregate — a table would be a
--     stored copy of a number that is faster to recompute than to invalidate.
--   * No row per signal, and no scoring history. A signal with no warning
--     attached is a row nobody reads, and storing every scoring run is a
--     time-series of a derived number. Evidence lives on the warning as jsonb
--     because it is only ever read with it.
--   * No per-tenant warning. "Acme's error rate tripled" is really "some issue is
--     hitting Acme", and the issue is the thing you go and fix. Which tenants are
--     hit is a column on the issue, not a second kind of warning to triage.
--   * No notification yet. Everything here is pull. An alert that fires before
--     anyone has watched the scorer be right for a fortnight is how a team learns
--     to filter Merik's mail, and that habit is unrecoverable.
--     ponytail: wire this to the existing alert path once the risk scores have
--     been observed against real bugs and the threshold has stopped moving.

-- ================================================================== warnings ---
create table if not exists public.product_warnings (
  id             uuid primary key default gen_random_uuid(),
  -- The subject is the issue, not the tenant. Errors are fixed once and the fix
  -- reaches everybody, so the unit of work is the fingerprint.
  fingerprint    text not null,
  -- The strongest signal, for the icon and for filtering. The rest are in evidence.
  kind           text not null check (kind in
                   ('blocking','regression','reach','spike','persistent')),
  -- 0..100 each, never collapsed into one. See the header.
  risk           int not null check (risk between 0 and 100),
  confidence     int not null check (confidence between 0 and 100),
  title          text not null,
  -- Plain English, written by the scorer, and always conditional: "may",
  -- "likely", never "will".
  impact         text,
  recommendation text,
  -- [{code,label,detail,magnitude}] — the "why Merik thinks this" list.
  evidence       jsonb not null default '[]',
  -- Facts as at the last scoring pass, so the list can be ranked and read
  -- without joining back to the events every time.
  tenants        int not null default 0,
  occurrences    int not null default 0,
  sample_message text,
  sample_source  text,
  first_build    text,
  last_build     text,
  -- The learning loop. A super admin judging a warning is the only signal that
  -- says whether the scoring was any good, and it is what stops the same issue
  -- being re-raised every fifteen minutes for a fortnight.
  state          text not null default 'open'
                   check (state in ('open','acknowledged','fixed','ignored','resolved')),
  fixed_in_build text,
  resolution     text,
  -- Set when an issue marked fixed comes back in a LATER build. This is the only
  -- honest measure of whether a fix held, and it is the number that says whether
  -- any of this is working.
  regressed      boolean not null default false,
  detected_at    timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  resolved_at    timestamptz,
  updated_at     timestamptz not null default now()
);

-- The anti-noise constraint, and it is a constraint rather than a convention on
-- purpose: there is nowhere to put a second live warning for one issue, so the
-- scorer cannot drift into raising six.
create unique index if not exists idx_product_warnings_one_open
  on public.product_warnings(fingerprint) where state in ('open','acknowledged');
create index if not exists idx_product_warnings_rank
  on public.product_warnings(state, risk desc, last_seen_at desc);
create index if not exists idx_product_warnings_fp
  on public.product_warnings(fingerprint, detected_at desc);

create or replace function public.touch_product_warning()
returns trigger language plpgsql as $function$
begin
  new.updated_at := now();
  -- Closing a warning is what stamps the time, wherever the close came from —
  -- the scorer or a super admin clicking the button.
  if new.state in ('fixed','ignored','resolved') and old.state not in ('fixed','ignored','resolved')
    then new.resolved_at := now();
  end if;
  if new.state in ('open','acknowledged') then new.resolved_at := null; end if;
  return new;
end $function$;

drop trigger if exists trg_touch_product_warnings on public.product_warnings;
create trigger trg_touch_product_warnings before update on public.product_warnings
  for each row execute function public.touch_product_warning();

-- ================================================================== the scorer ---
-- Runs every fifteen minutes. Reads product_events, decides which issues deserve
-- a warning, and closes the ones that stopped happening.
--
-- Written in SQL rather than added to the probe Edge Function, unlike the client
-- site analyzer it is modelled on. That analyzer correlates vendor status feeds
-- and dependency graphs and genuinely needs a language. This is aggregation over
-- one table: putting it here means no HTTP hop, no second thing to deploy, and
-- no way for a probe deploy to take product monitoring down with it.
create or replace function public.analyze_product_health()
returns int
language plpgsql
security definer
set search_path = public
as $function$
declare
  n_opened int := 0;
  newest_build text;
begin
  -- The build currently in the wild, by the events arriving from it. Read rather
  -- than declared: whatever browsers are actually running is the truth, and it
  -- lags a deploy by however long people keep their tabs open.
  select max(build) into newest_build from public.product_events
   where hour >= now() - interval '48 hours' and build is not null;

  -- ---------------------------------------------------------------- close ---
  -- An issue nobody has hit for two days is over, whatever caused it. Closing on
  -- silence rather than on a fix keeps the list honest without asking anyone to
  -- tidy it.
  update public.product_warnings w
     set state = 'resolved',
         resolution = coalesce(w.resolution, 'stopped occurring')
   where w.state in ('open','acknowledged')
     and not exists (
       select 1 from public.product_events e
        where e.fingerprint = w.fingerprint
          and e.hour >= now() - interval '48 hours');

  -- ----------------------------------------------------------------- score ---
  with recent as (
    select e.fingerprint,
           sum(e.count)::int                                as occurrences,
           count(distinct e.org_id) filter (where e.org_id is not null)::int as tenants,
           bool_or(e.org_id is null)                        as internal,
           count(distinct e.hour)::int                      as active_hours,
           min(e.first_seen)                                as first_seen,
           max(e.last_seen)                                 as last_seen,
           min(e.build)                                     as first_build,
           max(e.build)                                     as last_build,
           -- Worst kind present, by how badly it stops somebody working: a
           -- refused write lost their typing, a dead page lost their whole
           -- screen, everything else is degraded but survivable.
           max(case e.kind when 'db' then 5 when 'view' then 4
                           when 'function' then 3 when 'error' then 2 else 1 end) as worst,
           (array_agg(e.message order by e.count desc))[1]  as sample_message,
           (array_agg(e.source  order by e.count desc))[1]  as sample_source
      from public.product_events e
     where e.hour >= now() - interval '24 hours'
     group by e.fingerprint
  ),
  -- What this issue normally does, from the fortnight BEFORE the window being
  -- judged. Including the window in its own baseline is how a spike hides itself.
  prior as (
    select e.fingerprint, sum(e.count)::int as prior_total
      from public.product_events e
     where e.hour <  now() - interval '24 hours'
       and e.hour >= now() - interval '15 days'
     group by e.fingerprint
  ),
  -- All-time first sighting inside retention, so "new" means new rather than
  -- "absent from the last 24 hours".
  origin as (
    select e.fingerprint, min(e.first_seen) as ever_first, min(e.build) as ever_build
      from public.product_events e group by e.fingerprint
  ),
  scored as (
    select r.*,
           o.ever_first,
           o.ever_build,
           coalesce(p.prior_total, 0) as prior_total,
           -- Per-hour rates, which is the only fair comparison between a 24-hour
           -- window and a 14-day one.
           (r.occurrences::numeric / 24)                       as now_per_hour,
           (coalesce(p.prior_total,0)::numeric / (14 * 24))    as prior_per_hour,
           (o.ever_first >= now() - interval '24 hours')       as is_new,
           (o.ever_first <= now() - interval '7 days')         as is_persistent
      from recent r
      join origin o on o.fingerprint = r.fingerprint
      left join prior p on p.fingerprint = r.fingerprint
  ),
  signals as (
    select s.*,
      -- More than one workspace hit is the single most useful fact here: it
      -- separates a bug in the product from one person's broken extension.
      (s.tenants >= 2)                                                    as sig_reach,
      -- A refused write or a dead page. Someone could not do their job.
      (s.worst >= 4)                                                      as sig_blocking,
      -- New, and only ever seen in the build currently in the wild. That is a
      -- regression with a suspect attached.
      (s.is_new and newest_build is not null
         and s.ever_build = newest_build
         and (s.tenants >= 2 or s.worst >= 4))                            as sig_regression,
      -- Four times its own normal rate, with enough absolute volume that the
      -- multiple is not an artefact of a tiny denominator.
      (s.prior_per_hour > 0 and s.now_per_hour >= 4 * s.prior_per_hour
         and s.occurrences >= 8)                                          as sig_spike,
      -- A week old and still going. Nobody has fixed it and nobody has decided
      -- not to, which is its own kind of problem.
      (s.is_persistent)                                                   as sig_persistent
      from scored s
  ),
  ranked as (
    select g.*,
      least(100,
        (case when g.tenants >= 2 then least(40, g.tenants * 12)
              when g.tenants = 1  then 8 else 0 end) +
        (case when g.sig_blocking   then 25 else 0 end) +
        (case when g.sig_regression then 30 when g.is_new then 20 else 0 end) +
        (case when g.sig_spike      then 25 else 0 end) +
        (case when g.sig_persistent then 10 else 0 end)
      )::int as risk,
      -- Evidence, not severity. Twenty occurrences across ten hours is a fact;
      -- one occurrence in one hour is an anecdote, and the number says which.
      least(95, 20 + least(40, g.occurrences * 2) + least(35, g.active_hours * 5))::int as confidence
      from signals g
  )
  insert into public.product_warnings
    (fingerprint, kind, risk, confidence, title, impact, recommendation, evidence,
     tenants, occurrences, sample_message, sample_source, first_build, last_build,
     last_seen_at, regressed)
  select
    k.fingerprint,
    case when k.sig_regression then 'regression'
         when k.sig_blocking   then 'blocking'
         when k.sig_reach      then 'reach'
         when k.sig_spike      then 'spike'
         else 'persistent' end,
    k.risk,
    k.confidence,
    -- The title is read in a list, so it leads with the thing and ends with the
    -- blast radius.
    left(coalesce(k.sample_message, 'Unnamed error'), 80) ||
      case when k.tenants >= 2 then format(' — %s workspaces', k.tenants)
           when k.tenants = 1  then ' — 1 workspace'
           else ' — Merik only' end,
    case when k.sig_blocking and k.tenants >= 2
           then format('People in %s workspaces may be unable to save or open something.', k.tenants)
         when k.sig_blocking
           then 'Someone may be unable to save or open something.'
         when k.sig_regression
           then 'This appeared with the current build and was likely introduced by it.'
         else 'Users are likely seeing errors, though they may still be able to work around it.' end,
    case when k.sig_regression
           then format('Check what shipped in build %s. Reverting is likely faster than diagnosing.', k.last_build)
         when k.sig_blocking
           then 'Reproduce on the affected page first — a refused write usually means a policy or a constraint, not the browser.'
         when k.sig_reach
           then 'Affects more than one workspace, so it is the product rather than one setup. Worth fixing before the next release.'
         else 'Watch it. If it is still here next week it is not going away on its own.' end,
    coalesce((select jsonb_agg(x) from (
       select * from (values
         (case when k.sig_reach then jsonb_build_object(
            'code','reach','label','More than one workspace',
            'detail', format('%s workspaces hit in 24 hours', k.tenants),
            'magnitude', k.tenants) end),
         (case when k.sig_blocking then jsonb_build_object(
            'code','blocking','label','Stopped somebody working',
            'detail','A write was refused or a page failed to open',
            'magnitude', k.worst) end),
         (case when k.sig_regression then jsonb_build_object(
            'code','regression','label','New in the current build',
            'detail', format('First seen in build %s', k.ever_build),
            'magnitude', 1) end),
         (case when k.sig_spike then jsonb_build_object(
            'code','spike','label','Well above its own normal',
            'detail', format('%s/hour now against %s/hour over the past fortnight',
                             round(k.now_per_hour,1), round(k.prior_per_hour,2)),
            'magnitude', round(k.now_per_hour / nullif(k.prior_per_hour,0))) end),
         (case when k.sig_persistent then jsonb_build_object(
            'code','persistent','label','Still here after a week',
            'detail', format('First seen %s', to_char(k.ever_first,'DD Mon')),
            'magnitude', 1) end)
       ) as v(x) where x is not null) as x), '[]'::jsonb),
    k.tenants, k.occurrences, k.sample_message, k.sample_source,
    k.ever_build, k.last_build, k.last_seen,
    -- Regressed: this exact issue was marked fixed once, in an earlier build,
    -- and here it is again.
    exists (select 1 from public.product_warnings w2
             where w2.fingerprint = k.fingerprint and w2.state = 'fixed'
               and (w2.fixed_in_build is null or k.last_build > w2.fixed_in_build))
  from ranked k
  -- The bar. Below it an issue is still visible in the events list; it just does
  -- not get to interrupt anybody by appearing as a warning.
  where k.risk >= 35
    -- A super admin who said "ignore this" meant it. Nothing below re-raises it.
    and not exists (select 1 from public.product_warnings w3
                     where w3.fingerprint = k.fingerprint and w3.state = 'ignored')
  on conflict (fingerprint) where state in ('open','acknowledged')
  do update set
    -- Re-scoring a live warning updates the numbers but never resurrects the
    -- state: an acknowledged warning stays acknowledged.
    risk           = excluded.risk,
    confidence     = excluded.confidence,
    title          = excluded.title,
    impact         = excluded.impact,
    recommendation = excluded.recommendation,
    evidence       = excluded.evidence,
    tenants        = greatest(public.product_warnings.tenants, excluded.tenants),
    occurrences    = excluded.occurrences,
    last_build     = excluded.last_build,
    last_seen_at   = excluded.last_seen_at,
    kind           = excluded.kind;

  get diagnostics n_opened = row_count;
  return n_opened;
end $function$;

-- ======================================================================= RLS ---
-- Merik's own operational judgement about every tenant at once. Super admin
-- only, exactly like the events underneath it.
alter table public.product_warnings enable row level security;

drop policy if exists p_product_warnings_super on public.product_warnings;
create policy p_product_warnings_super on public.product_warnings for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

grant select, update on public.product_warnings to authenticated;
grant select, insert, update, delete on public.product_warnings to service_role;

revoke execute on function public.analyze_product_health() from public, anon, authenticated;
grant   execute on function public.analyze_product_health() to service_role;

-- The scorer runs on a schedule, but somebody staring at a fresh bug does not
-- want to wait a quarter of an hour to see whether Merik agrees with them. A
-- wrapper rather than a grant on the scorer itself: this is the only call any
-- session gets to make, and it checks who is asking.
create or replace function public.rescan_product_health()
returns int
language plpgsql
security definer
set search_path = public
as $function$
begin
  if not public.is_super_admin() then
    raise exception 'Product health is a Merik-only view';
  end if;
  return public.analyze_product_health();
end $function$;

revoke execute on function public.rescan_product_health() from public, anon;
grant   execute on function public.rescan_product_health() to authenticated, service_role;

-- ================================================================ scheduling ---
-- Every fifteen minutes. Not every minute: nothing here changes faster than
-- browsers can report, and the events table buckets by the hour anyway.
do $$
begin
  perform cron.unschedule('merik-product-health-analyze');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule('merik-product-health-analyze', '*/15 * * * *', $cron$
    select public.analyze_product_health();
  $cron$);
exception when others then
  raise notice 'could not schedule merik-product-health-analyze (%)', sqlerrm;
end $$;
