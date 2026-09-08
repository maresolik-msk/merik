-- Product Health — Merik watching Merik.
--
-- Every monitoring table before this one points outward. `frontend_errors`
-- catches what breaks in a visitor's browser on a *client's* site; `monitors`
-- and `check_results` watch a *client's* endpoints. The product those clients
-- log into is the one thing nothing observes: a tenant admin whose payslip page
-- throws gets a console error nobody reads, and Merik finds out when they send
-- an email — if they send one.
--
-- This is the same instrument turned around. Deliberately the same shape as
-- frontend_errors rather than a new one, because the questions are identical
-- (which error, how often, since when, who is hit) and the answers come from a
-- counter, not from a row per occurrence.
--
-- Deliberately NOT here, and why:
--   * No row per event. A view that throws on every render produces thousands of
--     identical rows in an afternoon and the count is the whole of what anybody
--     reads. The fingerprint groups them; the hour bucket bounds the table.
--   * No distinct-user count. It needs either a per-user set (unbounded) or a
--     HyperLogLog, and the metric that actually ranks work is how many *tenants*
--     are hit — which is `count(distinct org_id)` over the rows already here.
--     ponytail: add a per-user counter if "one loud user or forty quiet ones"
--     ever becomes a question a tenant column can't answer.
--   * No stack traces. They are the most useful debugging field and the most
--     dangerous storage: a trace through a render function carries the values it
--     was rendering, which here means salaries and performance reviews. Message,
--     source file and line only.
--   * No severity column. Severity is a judgement made when reading, from how
--     many tenants are hit and whether it blocked a write. Storing it would mean
--     deciding at capture time, which is exactly when the least is known.

-- ==================================================================== events ---
create table if not exists public.product_events (
  id          bigserial primary key,
  -- Null is meaningful and common: the Merik super admin has no tenant, and an
  -- error on the login screen belongs to nobody yet. Both are rows worth having,
  -- which is why this is nullable and why the unique index below coalesces.
  org_id      uuid references public.orgs(id) on delete cascade,
  -- Stable hash of kind + normalised message + source, computed in the browser
  -- by the same FNV-1a used for client sites. Digits, UUIDs and query strings
  -- are stripped before hashing, so "employee 4821 not found" and "employee 9317
  -- not found" are one group rather than two thousand.
  fingerprint text not null,
  hour        timestamptz not null,
  kind        text not null check (kind in ('error','rejection','view','function','db')),
  count       int  not null default 1,
  -- One representative of the group, redacted in the browser before it was sent.
  message     text,
  source      text,
  -- The Merik nav key the user was on ('myslip', 'suoverview'). Not a URL — the
  -- app is one page and the URL never changes, so the route is in JS state.
  page        text,
  -- Who hits it. A bug only super admins can reach is not the same bug as one
  -- every employee reaches, and the fix order depends on knowing which.
  actor_role  text,
  browser     text,
  -- Which build was running. This is what makes "started after Tuesday's deploy"
  -- answerable instead of a guess.
  build       text,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

-- The grouping key. An expression index rather than a plain unique constraint
-- because org_id is nullable and NULLs are distinct from each other in a unique
-- index — without the coalesce, every signed-out error would insert its own row
-- and the counter would never increment.
create unique index if not exists uq_product_events_group on public.product_events
  (coalesce(org_id, '00000000-0000-0000-0000-000000000000'::uuid), fingerprint, hour);
create index if not exists idx_product_events_hour on public.product_events(hour desc);
create index if not exists idx_product_events_fp   on public.product_events(fingerprint, hour desc);
create index if not exists idx_product_events_org  on public.product_events(org_id, hour desc);

-- ==================================================================== ingest ---
-- Counter arithmetic, which PostgREST cannot express: an upsert through the REST
-- API overwrites the count instead of adding to it, and the count is the point.
--
-- security definer, and the tenant is read from the caller's own profile rather
-- than accepted as an argument — the same rule as the set_org() trigger every
-- user-authored table uses. A tenant admin calling this cannot file an error
-- against somebody else's workspace, because nothing they send decides where the
-- row lands.
--
-- What the caller *does* control is `count`, unlike the public collect endpoint
-- which computes it. The caller here is a signed-in Merik user rather than an
-- anonymous stranger, so the worst case is a tenant admin inflating their own
-- error counts; the clamp below bounds that to noise rather than an invented
-- outage, and is cheaper than refusing to trust a session we already trust for
-- payroll.
create or replace function public.report_product_events(p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $function$
declare
  n int;
  v_org  uuid;
  v_role text;
begin
  select p.org_id, p.role into v_org, v_role
    from public.profiles p where p.id = auth.uid();
  -- No profile means no session we can attribute anything to. Silence, not an
  -- error: this is called from a catch block and must never raise inside one.
  if not found then return 0; end if;

  with input as (
    select r.fingerprint, r.kind, r.count as qty, r.message, r.source, r.page, r.browser, r.build
      from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
        as r(fingerprint text, kind text, count int, message text, source text,
             page text, browser text, build text)
     where r.fingerprint is not null
       and r.kind in ('error','rejection','view','function','db')
     limit 50                                   -- one flush, bounded
  ),
  -- Fold duplicates before the insert. ON CONFLICT cannot update the same row
  -- twice in one statement, and a client that sent the same fingerprint in two
  -- rows would otherwise abort the whole batch.
  grouped as (
    select fingerprint, kind,
           least(sum(greatest(coalesce(qty,1),1)), 500)::int as count,
           min(left(message,300)) as message,
           min(left(source,300))  as source,
           min(left(page,60))     as page,
           min(left(browser,40))  as browser,
           min(left(build,40))    as build
      from input group by fingerprint, kind
  )
  insert into public.product_events
        (org_id, fingerprint, hour, kind, count, message, source, page, actor_role, browser, build)
  select v_org, g.fingerprint, date_trunc('hour', now()), g.kind, g.count,
         g.message, g.source, g.page, v_role, g.browser, g.build
    from grouped g
      on conflict (coalesce(org_id, '00000000-0000-0000-0000-000000000000'::uuid), fingerprint, hour)
      do update set count     = public.product_events.count + excluded.count,
                    last_seen = now(),
                    -- Keep the newest build that still shows the bug: "is this
                    -- still happening after the fix" is read off this column.
                    build     = coalesce(excluded.build, public.product_events.build);
  get diagnostics n = row_count;
  return n;
end $function$;

-- The same write for callers with no session: Edge Functions running on a cron
-- or a webhook, where there is no user to attribute the failure to and no
-- browser to catch it. Service role only, and the org is explicit because a
-- background job legitimately reports on behalf of a tenant nobody is signed in
-- as.
create or replace function public.ingest_product_events(p_org uuid, p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $function$
declare n int;
begin
  with input as (
    select r.fingerprint, r.kind, r.count as qty, r.message, r.source, r.page, r.build
      from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
        as r(fingerprint text, kind text, count int, message text, source text,
             page text, build text)
     where r.fingerprint is not null
       and r.kind in ('error','rejection','view','function','db')
     limit 50
  ),
  grouped as (
    select fingerprint, kind,
           least(sum(greatest(coalesce(qty,1),1)), 500)::int as count,
           min(left(message,300)) as message,
           min(left(source,300))  as source,
           min(left(page,60))     as page,
           min(left(build,40))    as build
      from input group by fingerprint, kind
  )
  insert into public.product_events
        (org_id, fingerprint, hour, kind, count, message, source, page, actor_role, build)
  select p_org, g.fingerprint, date_trunc('hour', now()), g.kind, g.count,
         g.message, g.source, g.page, 'system', g.build
    from grouped g
      on conflict (coalesce(org_id, '00000000-0000-0000-0000-000000000000'::uuid), fingerprint, hour)
      do update set count     = public.product_events.count + excluded.count,
                    last_seen = now(),
                    build     = coalesce(excluded.build, public.product_events.build);
  get diagnostics n = row_count;
  return n;
end $function$;

-- ======================================================================= RLS ---
-- This table is Merik's own operational data and it spans every tenant: a single
-- select without a filter would show one client the shape of another client's
-- failures. Super admin only, with no org-level read at all — the same rule
-- ops_config gets, for the same reason.
alter table public.product_events enable row level security;

drop policy if exists p_product_events_super on public.product_events;
create policy p_product_events_super on public.product_events for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

-- No insert grant for authenticated: every write goes through
-- report_product_events, which is what stamps the tenant. Handing out a direct
-- insert would hand out the ability to choose org_id.
grant select on public.product_events to authenticated;
grant select, insert, update, delete on public.product_events to service_role;
grant usage, select on sequence public.product_events_id_seq to service_role;

revoke execute on function public.report_product_events(jsonb) from public, anon;
grant   execute on function public.report_product_events(jsonb) to authenticated, service_role;
revoke execute on function public.ingest_product_events(uuid, jsonb) from public, anon, authenticated;
grant   execute on function public.ingest_product_events(uuid, jsonb) to service_role;

-- ================================================================= retention ---
-- Ninety days. Long enough to answer "did the fix hold" across a quarter, short
-- enough that the table stays a working surface rather than an archive. The
-- history that matters longer than that is the fix, and that lives in git.
do $$
begin
  perform cron.unschedule('merik-product-health-retention');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule('merik-product-health-retention', '23 3 * * *', $cron$
    delete from public.product_events where hour < now() - interval '90 days';
  $cron$);
exception when others then
  raise notice 'could not schedule merik-product-health-retention (%)', sqlerrm;
end $$;
