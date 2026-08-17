-- Digital Health — from "is it down" to "is it going wrong".
--
-- Everything before this migration answers a question about the present: the
-- probe checks, the state machine confirms, an incident opens. That is reactive
-- by construction — the first person to know is still a user, just a few minutes
-- later than they would otherwise have been.
--
-- This adds the three pieces that make it proactive, and nothing else:
--
--   1. A baseline. What "normal" is for this monitor, measured rather than
--      declared. Static thresholds are why every monitoring tool ends up muted:
--      a 900ms API that has always taken 900ms is fine, and one that took 180ms
--      yesterday is not.
--   2. Early warnings. One row per asset, carrying every signal that fired,
--      with a risk and a confidence. Not an alert per signal — §26 of the brief
--      is the whole product: twenty correlated signals are one warning.
--   3. Browser errors. The only failure class the probe structurally cannot
--      see: the page loads, returns 200, and is broken in the user's browser.
--
-- Deliberately NOT here, and why:
--   * No `digital_products` table above `digital_assets`. An asset already
--     joins to a client and a project, which is the grouping an agency
--     actually files work under; a third parent level would be a table whose
--     only content is a name, and two more joins on every query. Add it when
--     an asset needs to belong to something that is neither.
--   * No `anomalies` / `risk_scores` / `baselines` tables as separate rows per
--     detection. An anomaly with no warning attached is a row nobody reads, and
--     storing every scoring run is a time-series of a derived number. The
--     evidence lives on the warning it justifies, as jsonb, because it is only
--     ever read with that warning.
--   * No asset→asset dependency graph. `asset_dependencies` covers third-party
--     vendors, which is the correlation that already pays for itself (one
--     Stripe outage, one story). An internal graph — frontend → API → database —
--     needs backend and database telemetry to be worth traversing, and Merik
--     collects neither yet. An empty graph is not a graph.
--   * No seasonality model. A day-of-week and hour-of-day profile needs weeks
--     of data per monitor to beat a flat baseline, and every monitor here is
--     days old. The baseline window is 14 days and the comparison is one hour,
--     which is the crude version that works now.
--     ponytail: flat baseline; add an hour-of-day profile when a monitor has a
--     month of data and the false-positive rate says it needs one.

-- ================================================================= baseline ---
-- One row per monitor, recomputed hourly. A table rather than a view: the
-- percentiles scan two weeks of check_results, and the analyzer reads them for
-- every asset every five minutes.
create table if not exists public.monitor_baseline (
  monitor_id      uuid primary key references public.monitors(id) on delete cascade,
  org_id          uuid references public.orgs(id),
  asset_id        uuid references public.digital_assets(id) on delete cascade,
  -- How much evidence is behind the numbers below. This is what confidence is
  -- built from — a baseline from 40 checks is a guess, and saying so is the
  -- difference between a prediction and a horoscope.
  samples         int not null default 0,
  p50_latency_ms  int,
  p95_latency_ms  int,
  p99_latency_ms  int,
  -- 0..1 over the window. Almost always 0, which is exactly why a jump to 0.04
  -- is worth saying out loud.
  error_rate      numeric(6,5),
  checks_per_hour numeric(8,2),
  window_days     int not null default 14,
  computed_at     timestamptz not null default now()
);
create index if not exists idx_monitor_baseline_asset on public.monitor_baseline(asset_id);

-- Recompute every http monitor's normal behaviour.
--
-- Two windows deliberately excluded:
--   * the last hour, because that is the hour being judged against this — bake
--     the current degradation into "normal" and the degradation disappears;
--   * failed checks, when computing latency percentiles. A timeout records
--     10,000ms, and a handful of those would move p95 far enough to hide a real
--     latency regression behind it. Failures are counted in error_rate, which
--     is where they belong.
create or replace function public.refresh_baselines()
returns int
language plpgsql
security definer
set search_path = public
as $function$
declare
  n int;
begin
  insert into public.monitor_baseline as b
        (monitor_id, org_id, asset_id, samples, p50_latency_ms, p95_latency_ms,
         p99_latency_ms, error_rate, checks_per_hour, window_days, computed_at)
  select m.id,
         m.org_id,
         m.asset_id,
         count(c.*)::int,
         percentile_cont(0.50) within group (order by c.latency_ms)
           filter (where c.ok and c.latency_ms is not null)::int,
         percentile_cont(0.95) within group (order by c.latency_ms)
           filter (where c.ok and c.latency_ms is not null)::int,
         percentile_cont(0.99) within group (order by c.latency_ms)
           filter (where c.ok and c.latency_ms is not null)::int,
         round(count(*) filter (where not c.ok)::numeric / greatest(count(c.*), 1), 5),
         round(count(c.*)::numeric / (14 * 24), 2),
         14,
         now()
    from public.monitors m
    join public.check_results c
      on c.monitor_id = m.id
     and c.ts > now() - interval '14 days'
     and c.ts < now() - interval '1 hour'
   where m.type = 'http'
     and m.enabled
   group by m.id, m.org_id, m.asset_id
      on conflict (monitor_id) do update
         set org_id          = excluded.org_id,
             asset_id        = excluded.asset_id,
             samples         = excluded.samples,
             p50_latency_ms  = excluded.p50_latency_ms,
             p95_latency_ms  = excluded.p95_latency_ms,
             p99_latency_ms  = excluded.p99_latency_ms,
             error_rate      = excluded.error_rate,
             checks_per_hour = excluded.checks_per_hour,
             computed_at     = excluded.computed_at;
  get diagnostics n = row_count;
  return n;
end $function$;

revoke execute on function public.refresh_baselines() from public, anon, authenticated;
grant execute on function public.refresh_baselines() to service_role;

-- ========================================================== browser telemetry ---
-- The key the SDK carries. Per asset, rotatable by clearing the column, and
-- worth exactly one thing: appending events to this asset. It is public by
-- design — it ships inside the client's own JavaScript — which is why the
-- ingest endpoint accepts nothing that could be used to read anything back.
alter table public.digital_assets
  add column if not exists ingest_key text default encode(gen_random_bytes(16), 'hex');
create unique index if not exists idx_digital_assets_ingest_key
  on public.digital_assets(ingest_key) where ingest_key is not null;

-- Aggregated at write time, never one row per error.
--
-- A single broken deploy produces tens of thousands of identical stack traces in
-- an afternoon, and storing them individually buys nothing: the questions are
-- "which error, how often, since when", and all three are answerable from a
-- counter. The fingerprint groups them; the hour bucket bounds the table.
create table if not exists public.frontend_errors (
  org_id      uuid references public.orgs(id),
  asset_id    uuid not null references public.digital_assets(id) on delete cascade,
  -- Stable hash of kind + normalised message + source. Digits, UUIDs and query
  -- strings are stripped before hashing, so "user 4821 not found" and
  -- "user 9317 not found" are one group rather than two thousand.
  fingerprint text not null,
  hour        timestamptz not null,
  kind        text not null check (kind in ('error','rejection','network','resource')),
  count       int not null default 1,
  -- One representative of the group. Truncated, and never a request body.
  message     text,
  source      text,
  page        text,
  browser     text,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  primary key (asset_id, fingerprint, hour)
);
create index if not exists idx_frontend_errors_asset_hour on public.frontend_errors(asset_id, hour desc);
create index if not exists idx_frontend_errors_org_hour   on public.frontend_errors(org_id, hour desc);

-- Counter arithmetic, which PostgREST cannot express: an upsert there overwrites
-- the count instead of adding to it, and the count is the entire point of the
-- table. Called only by the `collect` Edge Function, with the service role.
--
-- The org is looked up from the asset rather than accepted as an argument. The
-- caller is a public endpoint reached with a key that ships inside a client's
-- JavaScript, so nothing it says about which tenant it belongs to can be trusted.
create or replace function public.ingest_frontend_errors(p_asset uuid, p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $function$
declare
  n int;
  v_org uuid;
begin
  select org_id into v_org from public.digital_assets where id = p_asset and archived_at is null;
  if v_org is null then return 0; end if;

  insert into public.frontend_errors
        (org_id, asset_id, fingerprint, hour, kind, count, message, source, page, browser)
  select v_org, p_asset, r.fingerprint, date_trunc('hour', now()), r.kind,
         r.count, r.message, r.source, r.page, r.browser
    from jsonb_to_recordset(p_rows) as r(fingerprint text, kind text, count int,
                                         message text, source text, page text, browser text)
   where r.fingerprint is not null and r.kind is not null
      on conflict (asset_id, fingerprint, hour) do update
         set count     = public.frontend_errors.count + excluded.count,
             last_seen = now();
  get diagnostics n = row_count;
  return n;
end $function$;

revoke execute on function public.ingest_frontend_errors(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.ingest_frontend_errors(uuid, jsonb) to service_role;

-- ============================================================ early warnings ---
-- The output of the whole module: one row per asset that is behaving abnormally,
-- holding every signal that fired.
--
-- One row per asset and not one per signal, enforced by the partial unique index
-- below. That constraint IS the anti-noise design — there is nowhere to put a
-- second concurrent warning for the same asset, so the code cannot drift into
-- sending six.
create table if not exists public.early_warnings (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid references public.orgs(id),
  asset_id       uuid not null references public.digital_assets(id) on delete cascade,
  -- The strongest signal, for filtering and for the icon. The rest are in evidence.
  --
  -- No 'certificate' kind. An expiring certificate already warns 14 days out
  -- through the ssl monitor, which fails the check and opens an incident — a
  -- second warning about the same fact is precisely the duplication §26 is
  -- about. (That check is inert on Supabase's Edge Runtime today; see the note
  -- in probe/index.ts. Where it works, it works, and it needs no help here.)
  kind           text not null check (kind in
                   ('latency','error_rate','latency_trend','budget_burn','frontend_errors')),
  -- 0..100. Deliberately two numbers, never one: risk is how bad the evidence
  -- looks, confidence is how much evidence there is. A 78% risk at 30%
  -- confidence is a different sentence from 78% at 91%, and collapsing them
  -- into a single score is how monitoring tools end up lying politely.
  risk           int not null check (risk between 0 and 100),
  confidence     int not null check (confidence between 0 and 100),
  severity       int not null default 3 check (severity between 1 and 4),
  title          text not null,
  -- Plain English, written by the scorer, and always conditional. "may",
  -- "likely", never "will".
  impact         text,
  recommendation text,
  -- [{code,label,detail,magnitude}] — the "why Merik thinks this" list. On the
  -- warning rather than in its own table because it is never read without it.
  evidence       jsonb not null default '[]',
  state          text not null default 'open'
                   check (state in ('open','acknowledged','resolved','dismissed')),
  -- Set once, like incidents.alerted_at: the dedupe mechanism and the lock.
  notified_at    timestamptz,
  -- The prediction came true. Set when an incident opens on the asset while the
  -- warning is live — which also makes "how many warnings became incidents"
  -- answerable, and that number is the only honest advertisement this feature has.
  incident_id    uuid references public.incidents(id) on delete set null,
  detected_at    timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  resolved_at    timestamptz,
  updated_at     timestamptz not null default now()
);
create unique index if not exists idx_early_warnings_one_open
  on public.early_warnings(asset_id) where state in ('open','acknowledged');
create index if not exists idx_early_warnings_org
  on public.early_warnings(org_id, detected_at desc);
create index if not exists idx_early_warnings_unnotified
  on public.early_warnings(detected_at) where notified_at is null and state = 'open';

-- ==================================================================== pulse ---
-- Everything the analyzer needs about one asset, in one row.
--
-- The alternative is five queries per asset per pass, which at a few hundred
-- assets is a few thousand round trips every five minutes. The view is doing the
-- joining where the data already is.
--
-- security_invoker is not optional: without it this view runs as its definer and
-- hands every tenant's latency to every authenticated user, quietly undoing the
-- RLS on the four tables underneath.
create or replace view public.asset_pulse
with (security_invoker = true) as
with mon as (
  select m.id as monitor_id, m.asset_id, m.org_id
    from public.monitors m
    join public.digital_assets a on a.id = m.asset_id
   where m.type = 'http' and m.enabled and a.archived_at is null
),
obs as (
  -- The hour being judged. Latency percentiles over successful checks only, for
  -- the same reason the baseline excludes failures.
  select mo.asset_id,
         count(c.*)::int                                              as checks_1h,
         count(*) filter (where not c.ok)::int                        as failures_1h,
         percentile_cont(0.95) within group (order by c.latency_ms)
           filter (where c.ok and c.latency_ms is not null)::int      as p95_1h,
         avg(c.latency_ms) filter (where c.ok)::int                   as avg_1h
    from mon mo
    join public.check_results c
      on c.monitor_id = mo.monitor_id and c.ts > now() - interval '1 hour'
   group by mo.asset_id
),
trend as (
  -- The last eight complete hours of average latency, oldest first. The shape of
  -- a slow leak is only visible over hours; one sample cannot show a direction.
  select mo.asset_id,
         array_agg(r.avg_latency order by r.hour) filter (where r.avg_latency is not null)
           as latency_by_hour
    from mon mo
    join public.check_rollup_1h r
      on r.monitor_id = mo.monitor_id
     and r.hour >= date_trunc('hour', now()) - interval '8 hours'
     and r.hour <  date_trunc('hour', now())
   group by mo.asset_id
),
fe as (
  -- Browser errors: this hour against the median hour of the past week. Median,
  -- not mean, because one bad afternoon would drag a mean up far enough to hide
  -- the next one.
  select f.asset_id,
         sum(f.count) filter (where f.hour = date_trunc('hour', now()))::int as fe_1h,
         percentile_cont(0.5) within group (
           order by f.count) filter (where f.hour < date_trunc('hour', now()))  as fe_median_hour
    from public.frontend_errors f
   where f.hour > now() - interval '7 days'
   group by f.asset_id
)
select a.id                            as asset_id,
       a.org_id,
       a.name                          as asset_name,
       a.criticality,
       a.status,
       a.maintenance_until,
       a.owner_employee_id,
       b.samples                       as baseline_samples,
       b.p50_latency_ms                as baseline_p50,
       b.p95_latency_ms                as baseline_p95,
       b.error_rate                    as baseline_error_rate,
       coalesce(o.checks_1h, 0)        as checks_1h,
       coalesce(o.failures_1h, 0)      as failures_1h,
       o.p95_1h,
       o.avg_1h,
       t.latency_by_hour,
       coalesce(f.fe_1h, 0)            as frontend_errors_1h,
       f.fe_median_hour                as frontend_errors_median_hour,
       s.burn_rate_1h,
       s.burn_rate_6h,
       s.burn_rate_3d,
       s.health,
       -- Already broken is not an early warning: this suppresses one, and when a
       -- warning was already open it is what the warning graduates into. That
       -- link is the only honest measure this feature has of whether it works.
       (select i.id from public.incidents i
         where i.asset_id = a.id and i.state <> 'resolved'
         order by i.started_at desc limit 1)                           as open_incident_id,
       -- What shipped recently, for the evidence list. Not a cause — the wording
       -- everywhere downstream says "correlates with", and means it.
       (select jsonb_build_object('ts', ce.ts, 'title', ce.title, 'actor', ce.actor,
                                  'ref', ce.ref, 'url', ce.url, 'kind', ce.kind)
          from public.change_events ce
         where ce.asset_id = a.id and ce.ts > now() - interval '3 hours'
         order by ce.ts desc limit 1)                                  as recent_change
  from public.digital_assets a
  left join mon                     mo on mo.asset_id = a.id
  left join public.monitor_baseline b  on b.monitor_id = mo.monitor_id
  left join obs                     o  on o.asset_id   = a.id
  left join trend                   t  on t.asset_id   = a.id
  left join fe                      f  on f.asset_id   = a.id
  left join public.asset_slo        s  on s.asset_id   = a.id
 where a.archived_at is null;

grant select on public.asset_pulse to authenticated, service_role;

-- ========================================================= org stamping + RLS ---
drop trigger if exists trg_setorg_early_warnings on public.early_warnings;
create trigger trg_setorg_early_warnings before insert on public.early_warnings
  for each row execute function public.set_org();

alter table public.monitor_baseline enable row level security;
alter table public.frontend_errors  enable row level security;
alter table public.early_warnings   enable row level security;

-- Read org-wide, write admin-only — the same split as the rest of the module.
do $$
declare t text;
begin
  foreach t in array array['monitor_baseline','frontend_errors','early_warnings'] loop
    execute format('drop policy if exists p_%s_read on public.%I', t, t);
    execute format($p$create policy p_%s_read on public.%I for select to authenticated
                     using (org_id = my_org())$p$, t, t);
    execute format('drop policy if exists p_%s_super on public.%I', t, t);
    execute format($p$create policy p_%s_super on public.%I for all to authenticated
                     using (is_super_admin()) with check (is_super_admin())$p$, t, t);
  end loop;
end $$;

-- Acknowledging and dismissing a warning is an admin action; nothing else about
-- these tables is user-writable. The baseline and the error counts are
-- measurements — a UI that can edit them is a UI that can launder a bad month.
drop policy if exists p_early_warnings_w on public.early_warnings;
create policy p_early_warnings_w on public.early_warnings for update to authenticated
  using (is_admin() and org_id = my_org())
  with check (is_admin() and org_id = my_org());

grant select on public.monitor_baseline to authenticated;
grant select on public.frontend_errors  to authenticated;
grant select, update on public.early_warnings to authenticated;
grant select, insert, update, delete on public.monitor_baseline to service_role;
grant select, insert, update, delete on public.frontend_errors  to service_role;
grant select, insert, update, delete on public.early_warnings   to service_role;

-- ================================================================ scheduling ---
-- Baselines hourly at :20 — after the :10 rollup, before the 03:17 retention
-- job that deletes the raw rows both of them read.
do $$
begin
  perform cron.unschedule('merik-health-baselines');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule('merik-health-baselines', '20 * * * *',
    $cron$select public.refresh_baselines();$cron$);
exception when others then
  raise notice 'could not schedule merik-health-baselines (%)', sqlerrm;
end $$;

-- The analyzer every five minutes. Not every minute: the signals it reads are
-- hour-windowed, so a minutely pass would re-derive the same answer sixty times
-- and the only thing that changes is the bill.
do $$
begin
  perform cron.unschedule('merik-health-analyze');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule('merik-health-analyze', '*/5 * * * *', $cron$
    select net.http_post(
      url     := c.probe_url || '?job=analyze',
      headers := jsonb_build_object('Content-Type','application/json',
                                    'x-probe-secret', c.probe_secret),
      body    := '{}'::jsonb)
    from public.ops_config c
    where c.probe_url is not null and c.probe_secret is not null;
  $cron$);
exception when others then
  raise notice 'could not schedule merik-health-analyze (%)', sqlerrm;
end $$;

-- Retention. Browser errors are debugging material with a short shelf life;
-- resolved warnings are kept a year because "has this happened before" is the
-- question they exist to answer.
do $$
begin
  perform cron.unschedule('merik-health-retention');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule('merik-health-retention', '31 3 * * *', $cron$
    delete from public.frontend_errors where hour < now() - interval '45 days';
    delete from public.early_warnings
     where state in ('resolved','dismissed') and updated_at < now() - interval '12 months';
  $cron$);
exception when others then
  raise notice 'could not schedule merik-health-retention (%)', sqlerrm;
end $$;

-- First baseline now, so the analyzer has something to compare against on its
-- next tick rather than waiting for the top of the hour.
select public.refresh_baselines();
