--
-- PostgreSQL database dump
--

\restrict 4xVHK74qGPWFLFoL4OvQX1PZek9NZ7CsoLzpnt81y4esIe7seKDw7RkAcq320Iw

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: asset_uptime_month(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.asset_uptime_month(p_year integer, p_month integer) RETURNS TABLE(asset_id uuid, name text, client_id uuid, sla_tier text, checks bigint, failures bigint, uptime_pct numeric)
    LANGUAGE sql STABLE
    AS $$
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
$$;


--
-- Name: create_org(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_org(org_name text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare oid uuid;
begin
  if (select org_id from profiles where id=auth.uid()) is not null then
    raise exception 'You already belong to a company workspace.';
  end if;
  insert into orgs(name) values (org_name) returning id into oid;
  insert into profiles(id,role,org_id) values (auth.uid(),'admin',oid)
    on conflict (id) do update set role='admin', org_id=oid;
  return oid;
end $$;


--
-- Name: digital_assets_sync_monitor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.digital_assets_sync_monitor() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
end $$;


--
-- Name: emp_tasks_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.emp_tasks_lock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if old.first_logged_on is not null and old.first_logged_on < current_date then
    if new.task    is distinct from old.task
    or new.client  is distinct from old.client
    or new.project is distinct from old.project
    or new.est_min is distinct from old.est_min then
      raise exception 'This task was already reported in a task log on %. Its details are locked — you can still mark it done.', old.first_logged_on;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare erec record;
begin
  select id, org_id into erec from employees where lower(email)=lower(new.email) limit 1;
  insert into profiles (id, role, employee_id, org_id)
  values (new.id, coalesce(new.raw_user_meta_data->>'role','employee'), erec.id, erec.org_id)
  on conflict (id) do nothing;
  return new;
end $$;


--
-- Name: ingest_frontend_errors(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ingest_frontend_errors(p_asset uuid, p_rows jsonb) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
end $$;


--
-- Name: ingest_product_events(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ingest_product_events(p_org uuid, p_rows jsonb) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
end $$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select exists(select 1 from profiles where id = auth.uid() and role = 'admin') $$;


--
-- Name: is_super_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select exists(select 1 from profiles where id = auth.uid() and role = 'superadmin') $$;


--
-- Name: mark_missing_task_updates(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_missing_task_updates(target date DEFAULT (CURRENT_DATE - 1)) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare n integer := 0;
begin
  if extract(dow from target) in (0,6) then return 0; end if;  -- Sun/Sat
  insert into public.task_updates (employee_id, upd_date, update_status, org_id)
  select e.id, target, 'No Update', e.org_id
  from public.employees e
  where e.status = 'Active'
    and not exists (select 1 from public.task_updates t where t.employee_id = e.id and t.upd_date = target)
    and not exists (select 1 from public.holidays h where h.holiday_date = target and (h.org_id is null or h.org_id = e.org_id));
  get diagnostics n = row_count;
  return n;
end $$;


--
-- Name: my_employee_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_employee_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select employee_id from profiles where id = auth.uid() $$;


--
-- Name: my_org(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_org() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select org_id from profiles where id=auth.uid() $$;


--
-- Name: refresh_baselines(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_baselines() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
end $$;


--
-- Name: report_product_events(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.report_product_events(p_rows jsonb) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
end $$;


--
-- Name: roll_up_check_results(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.roll_up_check_results() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
end $$;


--
-- Name: set_feedback_actor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_feedback_actor() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.org_id is null then new.org_id := my_org(); end if;
  if new.employee_id is null then new.employee_id := my_employee_id(); end if;
  return new;
end $$;


--
-- Name: set_org(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_org() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.org_id is null then new.org_id := my_org(); end if;
  return new;
end $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feature text NOT NULL,
    org_id uuid,
    subject_id text,
    period text,
    input_hash text NOT NULL,
    draft jsonb NOT NULL,
    model text,
    input_tokens integer,
    output_tokens integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feature text NOT NULL,
    org_id uuid,
    draft_id uuid,
    input_hash text,
    subject_id text,
    draft_text text,
    final_text text,
    edit_distance integer,
    accepted boolean,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: ai_org_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_org_access (
    org_id uuid NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    granted_by uuid
);


--
-- Name: ai_provider_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_provider_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    label text,
    key_cipher text NOT NULL,
    key_last4 text,
    model text,
    base_url text,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: ai_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_settings (
    id boolean DEFAULT true NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    features jsonb DEFAULT '{"quote_draft": false, "task_time_suggest": false, "performance_summary": false}'::jsonb NOT NULL,
    model text DEFAULT 'claude-opus-4-8'::text NOT NULL,
    monthly_call_cap integer DEFAULT 2000 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    active_key_id uuid,
    CONSTRAINT ai_settings_singleton CHECK (id)
);


--
-- Name: ai_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    user_id uuid,
    feature text NOT NULL,
    model text,
    input_tokens integer,
    output_tokens integer,
    ok boolean DEFAULT true NOT NULL,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    body text,
    audience text DEFAULT 'all'::text NOT NULL,
    kind text DEFAULT 'info'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_assets (
    name text NOT NULL,
    content text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: asset_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    asset_id uuid NOT NULL,
    employee_id uuid,
    assigned_on date DEFAULT CURRENT_DATE NOT NULL,
    returned_on date,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: asset_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    asset_id uuid NOT NULL,
    provider text NOT NULL,
    criticality text DEFAULT 'hard'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT asset_dependencies_criticality_check CHECK ((criticality = ANY (ARRAY['hard'::text, 'soft'::text])))
);


--
-- Name: check_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.check_results (
    id bigint NOT NULL,
    org_id uuid,
    monitor_id uuid NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    region text DEFAULT 'default'::text NOT NULL,
    ok boolean NOT NULL,
    status_code integer,
    latency_ms integer,
    failure_stage text,
    error text
);


--
-- Name: digital_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.digital_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    client_id uuid,
    project_id uuid,
    owner_employee_id uuid,
    name text NOT NULL,
    kind text DEFAULT 'website'::text NOT NULL,
    environment text DEFAULT 'production'::text NOT NULL,
    primary_url text,
    sla_tier text DEFAULT '99.9'::text NOT NULL,
    criticality text DEFAULT 'normal'::text NOT NULL,
    status text DEFAULT 'unknown'::text NOT NULL,
    maintenance_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    ingest_key text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text),
    CONSTRAINT digital_assets_criticality_check CHECK ((criticality = ANY (ARRAY['critical'::text, 'high'::text, 'normal'::text, 'low'::text]))),
    CONSTRAINT digital_assets_environment_check CHECK ((environment = ANY (ARRAY['production'::text, 'staging'::text]))),
    CONSTRAINT digital_assets_kind_check CHECK ((kind = ANY (ARRAY['website'::text, 'webapp'::text, 'api'::text, 'mobile_backend'::text, 'internal'::text]))),
    CONSTRAINT digital_assets_sla_tier_check CHECK ((sla_tier = ANY (ARRAY['99.99'::text, '99.9'::text, '99.5'::text, '99.0'::text, 'best_effort'::text]))),
    CONSTRAINT digital_assets_status_check CHECK ((status = ANY (ARRAY['operational'::text, 'degraded'::text, 'down'::text, 'maintenance'::text, 'unknown'::text])))
);


--
-- Name: monitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    asset_id uuid NOT NULL,
    type text DEFAULT 'http'::text NOT NULL,
    target text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    interval_seconds integer DEFAULT 300 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    next_run_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT monitors_interval_seconds_check CHECK ((interval_seconds = ANY (ARRAY[30, 60, 300, 900, 3600, 86400]))),
    CONSTRAINT monitors_type_check CHECK ((type = ANY (ARRAY['http'::text, 'ssl'::text, 'dns'::text, 'tcp'::text, 'synthetic_flow'::text, 'integration'::text])))
);


--
-- Name: asset_slo; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.asset_slo WITH (security_invoker='true') AS
 WITH tgt AS (
         SELECT a.id AS asset_id,
            a.org_id,
            a.sla_tier,
                CASE a.sla_tier
                    WHEN '99.99'::text THEN 0.0001
                    WHEN '99.9'::text THEN 0.0010
                    WHEN '99.5'::text THEN 0.0050
                    WHEN '99.0'::text THEN 0.0100
                    ELSE NULL::numeric
                END AS allowed
           FROM public.digital_assets a
          WHERE (a.archived_at IS NULL)
        ), obs AS (
         SELECT m.asset_id,
            count(*) FILTER (WHERE (c.ts > (now() - '30 days'::interval))) AS n30,
            count(*) FILTER (WHERE ((c.ts > (now() - '30 days'::interval)) AND (NOT c.ok))) AS f30,
            count(*) FILTER (WHERE (c.ts > (now() - '01:00:00'::interval))) AS n1h,
            count(*) FILTER (WHERE ((c.ts > (now() - '01:00:00'::interval)) AND (NOT c.ok))) AS f1h,
            count(*) FILTER (WHERE (c.ts > (now() - '06:00:00'::interval))) AS n6h,
            count(*) FILTER (WHERE ((c.ts > (now() - '06:00:00'::interval)) AND (NOT c.ok))) AS f6h,
            count(*) FILTER (WHERE (c.ts > (now() - '3 days'::interval))) AS n3d,
            count(*) FILTER (WHERE ((c.ts > (now() - '3 days'::interval)) AND (NOT c.ok))) AS f3d
           FROM (public.monitors m
             LEFT JOIN public.check_results c ON ((c.monitor_id = m.id)))
          WHERE (m.type = 'http'::text)
          GROUP BY m.asset_id
        )
 SELECT t.asset_id,
    t.org_id,
    t.sla_tier,
    t.allowed AS allowed_failure_ratio,
    COALESCE(o.n30, (0)::bigint) AS checks_30d,
    COALESCE(o.f30, (0)::bigint) AS failures_30d,
        CASE
            WHEN ((t.allowed IS NULL) OR (COALESCE(o.n30, (0)::bigint) = 0)) THEN NULL::numeric
            ELSE round((((o.f30)::numeric / (o.n30)::numeric) / t.allowed), 4)
        END AS budget_consumed_ratio,
        CASE
            WHEN ((t.allowed IS NULL) OR (COALESCE(o.n30, (0)::bigint) = 0)) THEN NULL::integer
            ELSE (GREATEST((0)::numeric, LEAST((100)::numeric, round(((100)::numeric * ((1)::numeric - (((o.f30)::numeric / (o.n30)::numeric) / t.allowed)))))))::integer
        END AS health,
        CASE
            WHEN ((t.allowed IS NULL) OR (COALESCE(o.n1h, (0)::bigint) = 0)) THEN NULL::numeric
            ELSE round((((o.f1h)::numeric / (o.n1h)::numeric) / t.allowed), 4)
        END AS burn_rate_1h,
        CASE
            WHEN ((t.allowed IS NULL) OR (COALESCE(o.n6h, (0)::bigint) = 0)) THEN NULL::numeric
            ELSE round((((o.f6h)::numeric / (o.n6h)::numeric) / t.allowed), 4)
        END AS burn_rate_6h,
        CASE
            WHEN ((t.allowed IS NULL) OR (COALESCE(o.n3d, (0)::bigint) = 0)) THEN NULL::numeric
            ELSE round((((o.f3d)::numeric / (o.n3d)::numeric) / t.allowed), 4)
        END AS burn_rate_3d
   FROM (tgt t
     LEFT JOIN obs o ON ((o.asset_id = t.asset_id)));


--
-- Name: change_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    asset_id uuid,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    source text NOT NULL,
    kind text NOT NULL,
    ref text,
    title text,
    url text,
    actor text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id uuid,
    client_id uuid,
    repo_link_id uuid,
    CONSTRAINT change_events_source_check CHECK ((source = ANY (ARRAY['github'::text, 'vercel'::text, 'cloudflare'::text, 'vendor_status'::text, 'manual'::text])))
);


--
-- Name: check_rollup_1h; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.check_rollup_1h (
    monitor_id uuid NOT NULL,
    org_id uuid,
    hour timestamp with time zone NOT NULL,
    checks integer NOT NULL,
    failures integer NOT NULL,
    avg_latency integer,
    max_latency integer
);


--
-- Name: frontend_errors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.frontend_errors (
    org_id uuid,
    asset_id uuid NOT NULL,
    fingerprint text NOT NULL,
    hour timestamp with time zone NOT NULL,
    kind text NOT NULL,
    count integer DEFAULT 1 NOT NULL,
    message text,
    source text,
    page text,
    browser text,
    first_seen timestamp with time zone DEFAULT now() NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_errors_kind_check CHECK ((kind = ANY (ARRAY['error'::text, 'rejection'::text, 'network'::text, 'resource'::text])))
);


--
-- Name: incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    asset_id uuid NOT NULL,
    detected_by_monitor_id uuid,
    assigned_employee_id uuid,
    severity integer DEFAULT 3 NOT NULL,
    state text DEFAULT 'detected'::text NOT NULL,
    title text NOT NULL,
    cause_category text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone,
    client_visible boolean DEFAULT false NOT NULL,
    client_summary text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    alerted_at timestamp with time zone,
    suppressed_reason text,
    suppressed_provider text,
    CONSTRAINT incidents_severity_check CHECK (((severity >= 1) AND (severity <= 4))),
    CONSTRAINT incidents_state_check CHECK ((state = ANY (ARRAY['detected'::text, 'acknowledged'::text, 'investigating'::text, 'mitigated'::text, 'resolved'::text]))),
    CONSTRAINT incidents_suppressed_reason_check CHECK ((suppressed_reason = ANY (ARRAY['maintenance_window'::text, 'dependency_outage'::text, 'flapping'::text])))
);


--
-- Name: monitor_baseline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitor_baseline (
    monitor_id uuid NOT NULL,
    org_id uuid,
    asset_id uuid,
    samples integer DEFAULT 0 NOT NULL,
    p50_latency_ms integer,
    p95_latency_ms integer,
    p99_latency_ms integer,
    error_rate numeric(6,5),
    checks_per_hour numeric(8,2),
    window_days integer DEFAULT 14 NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: asset_pulse; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.asset_pulse WITH (security_invoker='true') AS
 WITH mon AS (
         SELECT m.id AS monitor_id,
            m.asset_id,
            m.org_id
           FROM (public.monitors m
             JOIN public.digital_assets a_1 ON ((a_1.id = m.asset_id)))
          WHERE ((m.type = 'http'::text) AND m.enabled AND (a_1.archived_at IS NULL))
        ), obs AS (
         SELECT mo_1.asset_id,
            (count(c.*))::integer AS checks_1h,
            (count(*) FILTER (WHERE (NOT c.ok)))::integer AS failures_1h,
            (percentile_cont((0.95)::double precision) WITHIN GROUP (ORDER BY ((c.latency_ms)::double precision)) FILTER (WHERE (c.ok AND (c.latency_ms IS NOT NULL))))::integer AS p95_1h,
            (avg(c.latency_ms) FILTER (WHERE c.ok))::integer AS avg_1h
           FROM (mon mo_1
             JOIN public.check_results c ON (((c.monitor_id = mo_1.monitor_id) AND (c.ts > (now() - '01:00:00'::interval)))))
          GROUP BY mo_1.asset_id
        ), trend AS (
         SELECT mo_1.asset_id,
            array_agg(r.avg_latency ORDER BY r.hour) FILTER (WHERE (r.avg_latency IS NOT NULL)) AS latency_by_hour
           FROM (mon mo_1
             JOIN public.check_rollup_1h r ON (((r.monitor_id = mo_1.monitor_id) AND (r.hour >= (date_trunc('hour'::text, now()) - '08:00:00'::interval)) AND (r.hour < date_trunc('hour'::text, now())))))
          GROUP BY mo_1.asset_id
        ), fe AS (
         SELECT f_1.asset_id,
            (sum(f_1.count) FILTER (WHERE (f_1.hour = date_trunc('hour'::text, now()))))::integer AS fe_1h,
            percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((f_1.count)::double precision)) FILTER (WHERE (f_1.hour < date_trunc('hour'::text, now()))) AS fe_median_hour
           FROM public.frontend_errors f_1
          WHERE (f_1.hour > (now() - '7 days'::interval))
          GROUP BY f_1.asset_id
        )
 SELECT a.id AS asset_id,
    a.org_id,
    a.name AS asset_name,
    a.criticality,
    a.status,
    a.maintenance_until,
    a.owner_employee_id,
    b.samples AS baseline_samples,
    b.p50_latency_ms AS baseline_p50,
    b.p95_latency_ms AS baseline_p95,
    b.error_rate AS baseline_error_rate,
    COALESCE(o.checks_1h, 0) AS checks_1h,
    COALESCE(o.failures_1h, 0) AS failures_1h,
    o.p95_1h,
    o.avg_1h,
    t.latency_by_hour,
    COALESCE(f.fe_1h, 0) AS frontend_errors_1h,
    f.fe_median_hour AS frontend_errors_median_hour,
    s.burn_rate_1h,
    s.burn_rate_6h,
    s.burn_rate_3d,
    s.health,
    ( SELECT i.id
           FROM public.incidents i
          WHERE ((i.asset_id = a.id) AND (i.state <> 'resolved'::text))
          ORDER BY i.started_at DESC
         LIMIT 1) AS open_incident_id,
    ( SELECT jsonb_build_object('ts', ce.ts, 'title', ce.title, 'actor', ce.actor, 'ref', ce.ref, 'url', ce.url, 'kind', ce.kind) AS jsonb_build_object
           FROM public.change_events ce
          WHERE ((ce.asset_id = a.id) AND (ce.ts > (now() - '03:00:00'::interval)))
          ORDER BY ce.ts DESC
         LIMIT 1) AS recent_change
   FROM ((((((public.digital_assets a
     LEFT JOIN mon mo ON ((mo.asset_id = a.id)))
     LEFT JOIN public.monitor_baseline b ON ((b.monitor_id = mo.monitor_id)))
     LEFT JOIN obs o ON ((o.asset_id = a.id)))
     LEFT JOIN trend t ON ((t.asset_id = a.id)))
     LEFT JOIN fe f ON ((f.asset_id = a.id)))
     LEFT JOIN public.asset_slo s ON ((s.asset_id = a.id)))
  WHERE (a.archived_at IS NULL);


--
-- Name: asset_uptime_30d; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.asset_uptime_30d WITH (security_invoker='true') AS
 SELECT a.id AS asset_id,
    a.org_id,
    count(c.*) AS checks,
    count(*) FILTER (WHERE c.ok) AS ok_checks,
        CASE
            WHEN (count(c.*) = 0) THEN NULL::numeric
            ELSE round(((100.0 * (count(*) FILTER (WHERE c.ok))::numeric) / (count(c.*))::numeric), 2)
        END AS uptime_pct
   FROM ((public.digital_assets a
     LEFT JOIN public.monitors m ON (((m.asset_id = a.id) AND (m.type = 'http'::text))))
     LEFT JOIN public.check_results c ON (((c.monitor_id = m.id) AND (c.ts > (now() - '30 days'::interval)))))
  GROUP BY a.id, a.org_id;


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    name text NOT NULL,
    category text DEFAULT 'Laptop'::text NOT NULL,
    serial_no text,
    status text DEFAULT 'Available'::text NOT NULL,
    assigned_to uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    att_date date NOT NULL,
    status text,
    entry_time time without time zone,
    exit_time time without time zone,
    shift text DEFAULT 'General'::text,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    in_lat numeric,
    in_lng numeric,
    in_loc text,
    out_lat numeric,
    out_lng numeric,
    out_loc text,
    org_id uuid,
    CONSTRAINT attendance_status_check CHECK ((status = ANY (ARRAY['P'::text, 'A'::text, 'L'::text, 'H'::text, 'W'::text, 'OL'::text, 'UL'::text])))
);


--
-- Name: check_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.check_results ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.check_results_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact_person text,
    email text,
    phone text,
    address text,
    gstin text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    org_id uuid,
    start_date date DEFAULT CURRENT_DATE NOT NULL
);


--
-- Name: early_warnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.early_warnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    asset_id uuid NOT NULL,
    kind text NOT NULL,
    risk integer NOT NULL,
    confidence integer NOT NULL,
    severity integer DEFAULT 3 NOT NULL,
    title text NOT NULL,
    impact text,
    recommendation text,
    evidence jsonb DEFAULT '[]'::jsonb NOT NULL,
    state text DEFAULT 'open'::text NOT NULL,
    notified_at timestamp with time zone,
    incident_id uuid,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT early_warnings_confidence_check CHECK (((confidence >= 0) AND (confidence <= 100))),
    CONSTRAINT early_warnings_kind_check CHECK ((kind = ANY (ARRAY['latency'::text, 'error_rate'::text, 'latency_trend'::text, 'budget_burn'::text, 'frontend_errors'::text]))),
    CONSTRAINT early_warnings_risk_check CHECK (((risk >= 0) AND (risk <= 100))),
    CONSTRAINT early_warnings_severity_check CHECK (((severity >= 1) AND (severity <= 4))),
    CONSTRAINT early_warnings_state_check CHECK ((state = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text, 'dismissed'::text])))
);


--
-- Name: emp_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emp_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    org_id uuid,
    kind text DEFAULT 'note'::text NOT NULL,
    content text,
    done boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: emp_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emp_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    org_id uuid,
    task text NOT NULL,
    client text,
    project text,
    est_min integer,
    done boolean DEFAULT false NOT NULL,
    first_logged_on date,
    last_logged_on date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    emp_code text NOT NULL,
    full_name text NOT NULL,
    department text,
    designation text,
    email text,
    doj date,
    bank_account text,
    pan text,
    uan text,
    status text DEFAULT 'Active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    ctc numeric,
    org_id uuid,
    employment_type text,
    left_on date,
    CONSTRAINT employees_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Inactive'::text, 'On Leave'::text])))
);


--
-- Name: COLUMN employees.left_on; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.left_on IS 'Last working day for a former (Inactive) employee. NULL for current staff. Attendance/tasks stop after this date and the leaving month''s pay is pro-rated to it.';


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid,
    org_id uuid,
    category text DEFAULT 'Product'::text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'New'::text NOT NULL,
    admin_reply text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid DEFAULT auth.uid()
);


--
-- Name: holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.holidays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    holiday_date date NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'Company Holiday'::text,
    org_id uuid
);


--
-- Name: incident_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incident_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    incident_id uuid NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    kind text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    actor_employee_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT incident_events_kind_check CHECK ((kind = ANY (ARRAY['check_failed'::text, 'recovered'::text, 'note_added'::text, 'state_changed'::text, 'severity_changed'::text, 'assigned'::text, 'client_notified'::text, 'deploy_detected'::text, 'commit_linked'::text, 'dependency_down'::text])))
);


--
-- Name: incident_metrics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.incident_metrics WITH (security_invoker='true') AS
 SELECT i.id AS incident_id,
    i.org_id,
    i.asset_id,
    a.client_id,
    i.assigned_employee_id,
    i.severity,
    i.started_at,
    i.suppressed_reason,
        CASE
            WHEN (i.acknowledged_at IS NULL) THEN NULL::integer
            ELSE (round((EXTRACT(epoch FROM (i.acknowledged_at - i.started_at)) / (60)::numeric)))::integer
        END AS ack_minutes,
        CASE
            WHEN (i.resolved_at IS NULL) THEN NULL::integer
            ELSE (round((EXTRACT(epoch FROM (i.resolved_at - i.started_at)) / (60)::numeric)))::integer
        END AS resolve_minutes
   FROM (public.incidents i
     JOIN public.digital_assets a ON ((a.id = i.asset_id)));


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_no text NOT NULL,
    client_id uuid,
    quote_id uuid,
    invoice_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    subtotal numeric DEFAULT 0,
    tax_pct numeric DEFAULT 18,
    tax_amount numeric DEFAULT 0,
    total numeric DEFAULT 0,
    status text DEFAULT 'Unpaid'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    custom_html text,
    org_id uuid,
    CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['Unpaid'::text, 'Partially Paid'::text, 'Paid'::text, 'Overdue'::text, 'Cancelled'::text])))
);


--
-- Name: monitor_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitor_state (
    monitor_id uuid NOT NULL,
    org_id uuid,
    state text DEFAULT 'unknown'::text NOT NULL,
    consecutive_failures integer DEFAULT 0 NOT NULL,
    consecutive_successes integer DEFAULT 0 NOT NULL,
    since timestamp with time zone DEFAULT now() NOT NULL,
    last_ok_at timestamp with time zone,
    last_check_at timestamp with time zone,
    open_incident_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT monitor_state_state_check CHECK ((state = ANY (ARRAY['up'::text, 'down'::text, 'unknown'::text])))
);


--
-- Name: ops_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ops_config (
    id integer DEFAULT 1 NOT NULL,
    probe_url text,
    probe_secret text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ops_config_id_check CHECK ((id = 1))
);


--
-- Name: orgs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orgs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    logo text,
    address text,
    gstin text,
    website text,
    bank_details text,
    invoice_terms text,
    place_of_supply text,
    signature text,
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'Active'::text NOT NULL,
    plan text,
    modules jsonb,
    slack_webhook_url text
);


--
-- Name: payroll; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    pay_year integer NOT NULL,
    pay_month integer NOT NULL,
    total_days numeric DEFAULT 0,
    paid_days numeric DEFAULT 0,
    basic numeric DEFAULT 0,
    hra numeric DEFAULT 0,
    other_allowance numeric DEFAULT 0,
    gross numeric DEFAULT 0,
    incentives numeric DEFAULT 0,
    arrears numeric DEFAULT 0,
    gross_additions numeric DEFAULT 0,
    pt numeric DEFAULT 0,
    lop numeric DEFAULT 0,
    total_deductions numeric DEFAULT 0,
    net numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    pay_status text DEFAULT 'Unpaid'::text NOT NULL,
    org_id uuid,
    sent boolean DEFAULT false NOT NULL,
    sent_at timestamp with time zone,
    CONSTRAINT payroll_pay_month_check CHECK (((pay_month >= 1) AND (pay_month <= 12))),
    CONSTRAINT payroll_pay_status_check CHECK ((pay_status = ANY (ARRAY['Paid'::text, 'Unpaid'::text])))
);


--
-- Name: product_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_events (
    id bigint NOT NULL,
    org_id uuid,
    fingerprint text NOT NULL,
    hour timestamp with time zone NOT NULL,
    kind text NOT NULL,
    count integer DEFAULT 1 NOT NULL,
    message text,
    source text,
    page text,
    actor_role text,
    browser text,
    build text,
    first_seen timestamp with time zone DEFAULT now() NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_events_kind_check CHECK ((kind = ANY (ARRAY['error'::text, 'rejection'::text, 'view'::text, 'function'::text, 'db'::text])))
);


--
-- Name: product_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_events_id_seq OWNED BY public.product_events.id;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    role text DEFAULT 'employee'::text NOT NULL,
    employee_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    org_id uuid,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'employee'::text, 'superadmin'::text])))
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    client_id uuid,
    status text DEFAULT 'Active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    org_id uuid,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    description text,
    CONSTRAINT projects_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'On Hold'::text, 'Completed'::text])))
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_no text NOT NULL,
    client_id uuid,
    quote_date date DEFAULT CURRENT_DATE NOT NULL,
    valid_until date,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    subtotal numeric DEFAULT 0,
    tax_pct numeric DEFAULT 18,
    tax_amount numeric DEFAULT 0,
    total numeric DEFAULT 0,
    status text DEFAULT 'Draft'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    custom_html text,
    org_id uuid,
    CONSTRAINT quotes_status_check CHECK ((status = ANY (ARRAY['Draft'::text, 'Sent'::text, 'Accepted'::text, 'Rejected'::text, 'Expired'::text])))
);


--
-- Name: repo_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.repo_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    provider text DEFAULT 'github'::text NOT NULL,
    repo text NOT NULL,
    client_id uuid,
    project_id uuid,
    asset_id uuid,
    token text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text) NOT NULL,
    webhook_secret text DEFAULT encode(extensions.gen_random_bytes(24), 'hex'::text) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    last_event_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT repo_links_provider_check CHECK ((provider = ANY (ARRAY['github'::text, 'vercel'::text])))
);


--
-- Name: salary_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salary_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    org_id uuid,
    effective_month date NOT NULL,
    previous_ctc numeric,
    new_ctc numeric NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: signup_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.signup_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text NOT NULL,
    contact_name text NOT NULL,
    email text NOT NULL,
    phone text,
    message text,
    status text DEFAULT 'Pending'::text NOT NULL,
    review_notes text,
    created_org_id uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT signup_requests_company_name_present CHECK ((btrim(company_name) <> ''::text)),
    CONSTRAINT signup_requests_contact_name_present CHECK ((btrim(contact_name) <> ''::text)),
    CONSTRAINT signup_requests_email_valid CHECK ((email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::text))
);


--
-- Name: software; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.software (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    name text NOT NULL,
    vendor text,
    department text,
    seats integer,
    cost numeric,
    billing_cycle text DEFAULT 'Monthly'::text NOT NULL,
    renewal_date date,
    status text DEFAULT 'Active'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: software_seats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.software_seats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    software_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: software_spend; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.software_spend (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    software_id uuid NOT NULL,
    spend_month date NOT NULL,
    amount numeric NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: status_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.status_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    client_id uuid,
    token text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text) NOT NULL,
    title text NOT NULL,
    intro text,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: task_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    upd_date date DEFAULT CURRENT_DATE NOT NULL,
    task_assigned text,
    completed text,
    not_working text,
    blocker text,
    proof_link text,
    next_task text,
    update_status text DEFAULT 'Update Shared'::text,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    project text,
    org_id uuid,
    tasks jsonb,
    CONSTRAINT task_updates_update_status_check CHECK ((update_status = ANY (ARRAY['Update Shared'::text, 'No Update'::text, 'WFH'::text, 'Leave'::text, 'Sick Leave'::text, 'Holiday'::text])))
);


--
-- Name: usage_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    asset_id uuid,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    meter text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    region text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT usage_events_meter_check CHECK ((meter = ANY (ARRAY['check_run'::text, 'browser_run'::text, 'integration_poll'::text, 'incident_stored'::text, 'report_generated'::text])))
);


--
-- Name: vendor_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_status (
    provider text NOT NULL,
    label text NOT NULL,
    status_url text NOT NULL,
    format text DEFAULT 'statuspage'::text NOT NULL,
    indicator text DEFAULT 'unknown'::text NOT NULL,
    description text,
    checked_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendor_status_format_check CHECK ((format = 'statuspage'::text))
);


--
-- Name: wfh_leave; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wfh_leave (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    req_date date NOT NULL,
    status text NOT NULL,
    reason text,
    approved text DEFAULT 'Pending'::text,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    org_id uuid,
    end_date date,
    CONSTRAINT wfh_leave_approved_check CHECK ((approved = ANY (ARRAY['Yes'::text, 'No'::text, 'Pending'::text]))),
    CONSTRAINT wfh_leave_status_check CHECK ((status = ANY (ARRAY['WFH'::text, 'Leave'::text, 'Sick Leave'::text, 'Emergency Leave'::text, 'Half Day'::text])))
);


--
-- Name: product_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_events ALTER COLUMN id SET DEFAULT nextval('public.product_events_id_seq'::regclass);


--
-- Name: ai_drafts ai_drafts_org_id_feature_input_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_drafts
    ADD CONSTRAINT ai_drafts_org_id_feature_input_hash_key UNIQUE (org_id, feature, input_hash);


--
-- Name: ai_drafts ai_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_drafts
    ADD CONSTRAINT ai_drafts_pkey PRIMARY KEY (id);


--
-- Name: ai_feedback ai_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_pkey PRIMARY KEY (id);


--
-- Name: ai_org_access ai_org_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_org_access
    ADD CONSTRAINT ai_org_access_pkey PRIMARY KEY (org_id);


--
-- Name: ai_provider_keys ai_provider_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_provider_keys
    ADD CONSTRAINT ai_provider_keys_pkey PRIMARY KEY (id);


--
-- Name: ai_settings ai_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_settings
    ADD CONSTRAINT ai_settings_pkey PRIMARY KEY (id);


--
-- Name: ai_usage ai_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage
    ADD CONSTRAINT ai_usage_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: app_assets app_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_assets
    ADD CONSTRAINT app_assets_pkey PRIMARY KEY (name);


--
-- Name: asset_assignments asset_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_assignments
    ADD CONSTRAINT asset_assignments_pkey PRIMARY KEY (id);


--
-- Name: asset_dependencies asset_dependencies_asset_id_provider_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_dependencies
    ADD CONSTRAINT asset_dependencies_asset_id_provider_key UNIQUE (asset_id, provider);


--
-- Name: asset_dependencies asset_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_dependencies
    ADD CONSTRAINT asset_dependencies_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_employee_id_att_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_employee_id_att_date_key UNIQUE (employee_id, att_date);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: change_events change_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_events
    ADD CONSTRAINT change_events_pkey PRIMARY KEY (id);


--
-- Name: check_results check_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_results
    ADD CONSTRAINT check_results_pkey PRIMARY KEY (id);


--
-- Name: check_rollup_1h check_rollup_1h_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_rollup_1h
    ADD CONSTRAINT check_rollup_1h_pkey PRIMARY KEY (monitor_id, hour);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: digital_assets digital_assets_org_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.digital_assets
    ADD CONSTRAINT digital_assets_org_id_name_key UNIQUE (org_id, name);


--
-- Name: digital_assets digital_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.digital_assets
    ADD CONSTRAINT digital_assets_pkey PRIMARY KEY (id);


--
-- Name: early_warnings early_warnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.early_warnings
    ADD CONSTRAINT early_warnings_pkey PRIMARY KEY (id);


--
-- Name: emp_notes emp_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emp_notes
    ADD CONSTRAINT emp_notes_pkey PRIMARY KEY (id);


--
-- Name: emp_tasks emp_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emp_tasks
    ADD CONSTRAINT emp_tasks_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: frontend_errors frontend_errors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frontend_errors
    ADD CONSTRAINT frontend_errors_pkey PRIMARY KEY (asset_id, fingerprint, hour);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: incident_events incident_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_events
    ADD CONSTRAINT incident_events_pkey PRIMARY KEY (id);


--
-- Name: incidents incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: monitor_baseline monitor_baseline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_baseline
    ADD CONSTRAINT monitor_baseline_pkey PRIMARY KEY (monitor_id);


--
-- Name: monitor_state monitor_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_state
    ADD CONSTRAINT monitor_state_pkey PRIMARY KEY (monitor_id);


--
-- Name: monitors monitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitors
    ADD CONSTRAINT monitors_pkey PRIMARY KEY (id);


--
-- Name: ops_config ops_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_config
    ADD CONSTRAINT ops_config_pkey PRIMARY KEY (id);


--
-- Name: orgs orgs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orgs
    ADD CONSTRAINT orgs_pkey PRIMARY KEY (id);


--
-- Name: payroll payroll_employee_id_pay_year_pay_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_employee_id_pay_year_pay_month_key UNIQUE (employee_id, pay_year, pay_month);


--
-- Name: payroll payroll_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_pkey PRIMARY KEY (id);


--
-- Name: product_events product_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_events
    ADD CONSTRAINT product_events_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: repo_links repo_links_org_id_provider_repo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repo_links
    ADD CONSTRAINT repo_links_org_id_provider_repo_key UNIQUE (org_id, provider, repo);


--
-- Name: repo_links repo_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repo_links
    ADD CONSTRAINT repo_links_pkey PRIMARY KEY (id);


--
-- Name: repo_links repo_links_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repo_links
    ADD CONSTRAINT repo_links_token_key UNIQUE (token);


--
-- Name: salary_history salary_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_history
    ADD CONSTRAINT salary_history_pkey PRIMARY KEY (id);


--
-- Name: signup_requests signup_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signup_requests
    ADD CONSTRAINT signup_requests_pkey PRIMARY KEY (id);


--
-- Name: software software_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.software
    ADD CONSTRAINT software_pkey PRIMARY KEY (id);


--
-- Name: software_seats software_seats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.software_seats
    ADD CONSTRAINT software_seats_pkey PRIMARY KEY (id);


--
-- Name: software_seats software_seats_software_id_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.software_seats
    ADD CONSTRAINT software_seats_software_id_employee_id_key UNIQUE (software_id, employee_id);


--
-- Name: software_spend software_spend_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.software_spend
    ADD CONSTRAINT software_spend_pkey PRIMARY KEY (id);


--
-- Name: software_spend software_spend_software_id_spend_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.software_spend
    ADD CONSTRAINT software_spend_software_id_spend_month_key UNIQUE (software_id, spend_month);


--
-- Name: status_pages status_pages_org_id_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_pages
    ADD CONSTRAINT status_pages_org_id_client_id_key UNIQUE (org_id, client_id);


--
-- Name: status_pages status_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_pages
    ADD CONSTRAINT status_pages_pkey PRIMARY KEY (id);


--
-- Name: status_pages status_pages_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_pages
    ADD CONSTRAINT status_pages_token_key UNIQUE (token);


--
-- Name: task_updates task_updates_employee_id_upd_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_employee_id_upd_date_key UNIQUE (employee_id, upd_date);


--
-- Name: task_updates task_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_pkey PRIMARY KEY (id);


--
-- Name: usage_events usage_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_pkey PRIMARY KEY (id);


--
-- Name: vendor_status vendor_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_status
    ADD CONSTRAINT vendor_status_pkey PRIMARY KEY (provider);


--
-- Name: wfh_leave wfh_leave_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wfh_leave
    ADD CONSTRAINT wfh_leave_pkey PRIMARY KEY (id);


--
-- Name: ai_drafts_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_drafts_lookup_idx ON public.ai_drafts USING btree (org_id, feature, input_hash);


--
-- Name: ai_feedback_feature_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_feedback_feature_idx ON public.ai_feedback USING btree (org_id, feature, created_at DESC);


--
-- Name: ai_usage_org_month_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_usage_org_month_idx ON public.ai_usage USING btree (org_id, created_at DESC);


--
-- Name: emp_notes_emp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX emp_notes_emp_idx ON public.emp_notes USING btree (employee_id, kind, created_at DESC);


--
-- Name: employees_org_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX employees_org_code ON public.employees USING btree (org_id, emp_code);


--
-- Name: feedback_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_org_idx ON public.feedback USING btree (org_id, created_at DESC);


--
-- Name: holidays_org_date; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX holidays_org_date ON public.holidays USING btree (org_id, holiday_date);


--
-- Name: idx_asset_assign_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_assign_asset ON public.asset_assignments USING btree (asset_id);


--
-- Name: idx_asset_assign_open; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_assign_open ON public.asset_assignments USING btree (asset_id) WHERE (returned_on IS NULL);


--
-- Name: idx_asset_dependencies_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_dependencies_asset ON public.asset_dependencies USING btree (asset_id);


--
-- Name: idx_assets_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_assigned ON public.assets USING btree (assigned_to);


--
-- Name: idx_assets_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_org ON public.assets USING btree (org_id);


--
-- Name: idx_change_events_asset_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_events_asset_ts ON public.change_events USING btree (asset_id, ts DESC);


--
-- Name: idx_change_events_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_events_client ON public.change_events USING btree (client_id, ts DESC);


--
-- Name: idx_change_events_org_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_events_org_ts ON public.change_events USING btree (org_id, ts DESC);


--
-- Name: idx_change_events_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_events_project ON public.change_events USING btree (project_id, ts DESC);


--
-- Name: idx_check_results_monitor_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_check_results_monitor_ts ON public.check_results USING btree (monitor_id, ts DESC);


--
-- Name: idx_check_results_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_check_results_ts ON public.check_results USING btree (ts);


--
-- Name: idx_check_rollup_hour; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_check_rollup_hour ON public.check_rollup_1h USING btree (hour);


--
-- Name: idx_check_rollup_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_check_rollup_org ON public.check_rollup_1h USING btree (org_id, hour);


--
-- Name: idx_digital_assets_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_digital_assets_client ON public.digital_assets USING btree (client_id);


--
-- Name: idx_digital_assets_ingest_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_digital_assets_ingest_key ON public.digital_assets USING btree (ingest_key) WHERE (ingest_key IS NOT NULL);


--
-- Name: idx_digital_assets_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_digital_assets_org ON public.digital_assets USING btree (org_id);


--
-- Name: idx_digital_assets_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_digital_assets_owner ON public.digital_assets USING btree (owner_employee_id);


--
-- Name: idx_early_warnings_one_open; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_early_warnings_one_open ON public.early_warnings USING btree (asset_id) WHERE (state = ANY (ARRAY['open'::text, 'acknowledged'::text]));


--
-- Name: idx_early_warnings_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_early_warnings_org ON public.early_warnings USING btree (org_id, detected_at DESC);


--
-- Name: idx_early_warnings_unnotified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_early_warnings_unnotified ON public.early_warnings USING btree (detected_at) WHERE ((notified_at IS NULL) AND (state = 'open'::text));


--
-- Name: idx_emp_tasks_emp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emp_tasks_emp ON public.emp_tasks USING btree (employee_id, done);


--
-- Name: idx_feedback_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_created_by ON public.feedback USING btree (created_by);


--
-- Name: idx_frontend_errors_asset_hour; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_frontend_errors_asset_hour ON public.frontend_errors USING btree (asset_id, hour DESC);


--
-- Name: idx_frontend_errors_org_hour; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_frontend_errors_org_hour ON public.frontend_errors USING btree (org_id, hour DESC);


--
-- Name: idx_incident_events_incident; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incident_events_incident ON public.incident_events USING btree (incident_id, ts);


--
-- Name: idx_incidents_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidents_asset ON public.incidents USING btree (asset_id, started_at DESC);


--
-- Name: idx_incidents_org_open; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidents_org_open ON public.incidents USING btree (org_id, started_at DESC) WHERE (state <> 'resolved'::text);


--
-- Name: idx_incidents_unalerted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidents_unalerted ON public.incidents USING btree (started_at) WHERE ((alerted_at IS NULL) AND (state <> 'resolved'::text));


--
-- Name: idx_monitor_baseline_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monitor_baseline_asset ON public.monitor_baseline USING btree (asset_id);


--
-- Name: idx_monitors_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monitors_asset ON public.monitors USING btree (asset_id);


--
-- Name: idx_monitors_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monitors_due ON public.monitors USING btree (next_run_at) WHERE enabled;


--
-- Name: idx_product_events_fp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_events_fp ON public.product_events USING btree (fingerprint, hour DESC);


--
-- Name: idx_product_events_hour; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_events_hour ON public.product_events USING btree (hour DESC);


--
-- Name: idx_product_events_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_events_org ON public.product_events USING btree (org_id, hour DESC);


--
-- Name: idx_repo_links_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_repo_links_token ON public.repo_links USING btree (token);


--
-- Name: idx_software_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_software_org ON public.software USING btree (org_id);


--
-- Name: idx_software_seats_emp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_software_seats_emp ON public.software_seats USING btree (employee_id);


--
-- Name: idx_software_seats_sw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_software_seats_sw ON public.software_seats USING btree (software_id);


--
-- Name: idx_software_spend_sw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_software_spend_sw ON public.software_spend USING btree (software_id, spend_month DESC);


--
-- Name: idx_status_pages_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_pages_token ON public.status_pages USING btree (token);


--
-- Name: idx_usage_events_org_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_events_org_ts ON public.usage_events USING btree (org_id, ts);


--
-- Name: invoices_org_no; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invoices_org_no ON public.invoices USING btree (org_id, invoice_no);


--
-- Name: projects_org_name_client; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX projects_org_name_client ON public.projects USING btree (org_id, name, client_id) NULLS NOT DISTINCT;


--
-- Name: quotes_org_no; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX quotes_org_no ON public.quotes USING btree (org_id, quote_no);


--
-- Name: salary_history_emp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX salary_history_emp_idx ON public.salary_history USING btree (employee_id, effective_month DESC);


--
-- Name: signup_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX signup_requests_status_idx ON public.signup_requests USING btree (status, created_at DESC);


--
-- Name: uq_product_events_group; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_product_events_group ON public.product_events USING btree (COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid), fingerprint, hour);


--
-- Name: digital_assets trg_digital_assets_monitor; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_digital_assets_monitor AFTER INSERT OR UPDATE OF primary_url ON public.digital_assets FOR EACH ROW EXECUTE FUNCTION public.digital_assets_sync_monitor();


--
-- Name: emp_tasks trg_emp_tasks_lock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_emp_tasks_lock BEFORE UPDATE ON public.emp_tasks FOR EACH ROW EXECUTE FUNCTION public.emp_tasks_lock();


--
-- Name: feedback trg_setactor_feedback; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setactor_feedback BEFORE INSERT ON public.feedback FOR EACH ROW EXECUTE FUNCTION public.set_feedback_actor();


--
-- Name: ai_feedback trg_setorg_ai_feedback; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_ai_feedback BEFORE INSERT ON public.ai_feedback FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: asset_assignments trg_setorg_asset_assignments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_asset_assignments BEFORE INSERT ON public.asset_assignments FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: asset_dependencies trg_setorg_asset_dependencies; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_asset_dependencies BEFORE INSERT ON public.asset_dependencies FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: assets trg_setorg_assets; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_assets BEFORE INSERT ON public.assets FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: attendance trg_setorg_attendance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_attendance BEFORE INSERT ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: change_events trg_setorg_change_events; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_change_events BEFORE INSERT ON public.change_events FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: clients trg_setorg_clients; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_clients BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: digital_assets trg_setorg_digital_assets; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_digital_assets BEFORE INSERT ON public.digital_assets FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: early_warnings trg_setorg_early_warnings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_early_warnings BEFORE INSERT ON public.early_warnings FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: emp_tasks trg_setorg_emp_tasks; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_emp_tasks BEFORE INSERT ON public.emp_tasks FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: employees trg_setorg_employees; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_employees BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: holidays trg_setorg_holidays; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_holidays BEFORE INSERT ON public.holidays FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: incident_events trg_setorg_incident_events; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_incident_events BEFORE INSERT ON public.incident_events FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: invoices trg_setorg_invoices; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_invoices BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: monitors trg_setorg_monitors; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_monitors BEFORE INSERT ON public.monitors FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: payroll trg_setorg_payroll; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_payroll BEFORE INSERT ON public.payroll FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: projects trg_setorg_projects; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_projects BEFORE INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: quotes trg_setorg_quotes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_quotes BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: repo_links trg_setorg_repo_links; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_repo_links BEFORE INSERT ON public.repo_links FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: software trg_setorg_software; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_software BEFORE INSERT ON public.software FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: software_seats trg_setorg_software_seats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_software_seats BEFORE INSERT ON public.software_seats FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: software_spend trg_setorg_software_spend; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_software_spend BEFORE INSERT ON public.software_spend FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: status_pages trg_setorg_status_pages; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_status_pages BEFORE INSERT ON public.status_pages FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: task_updates trg_setorg_task_updates; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_task_updates BEFORE INSERT ON public.task_updates FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: wfh_leave trg_setorg_wfh_leave; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setorg_wfh_leave BEFORE INSERT ON public.wfh_leave FOR EACH ROW EXECUTE FUNCTION public.set_org();


--
-- Name: ai_drafts ai_drafts_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_drafts
    ADD CONSTRAINT ai_drafts_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;


--
-- Name: ai_feedback ai_feedback_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: ai_feedback ai_feedback_draft_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_draft_id_fkey FOREIGN KEY (draft_id) REFERENCES public.ai_drafts(id) ON DELETE SET NULL;


--
-- Name: ai_feedback ai_feedback_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;


--
-- Name: ai_org_access ai_org_access_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_org_access
    ADD CONSTRAINT ai_org_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id);


--
-- Name: ai_org_access ai_org_access_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_org_access
    ADD CONSTRAINT ai_org_access_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;


--
-- Name: ai_provider_keys ai_provider_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_provider_keys
    ADD CONSTRAINT ai_provider_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: ai_settings ai_settings_active_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_settings
    ADD CONSTRAINT ai_settings_active_key_id_fkey FOREIGN KEY (active_key_id) REFERENCES public.ai_provider_keys(id) ON DELETE SET NULL;


--
-- Name: ai_settings ai_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_settings
    ADD CONSTRAINT ai_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: ai_usage ai_usage_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage
    ADD CONSTRAINT ai_usage_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;


--
-- Name: ai_usage ai_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage
    ADD CONSTRAINT ai_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: asset_assignments asset_assignments_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_assignments
    ADD CONSTRAINT asset_assignments_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: asset_assignments asset_assignments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_assignments
    ADD CONSTRAINT asset_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: asset_assignments asset_assignments_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_assignments
    ADD CONSTRAINT asset_assignments_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: asset_dependencies asset_dependencies_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_dependencies
    ADD CONSTRAINT asset_dependencies_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.digital_assets(id) ON DELETE CASCADE;


--
-- Name: asset_dependencies asset_dependencies_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_dependencies
    ADD CONSTRAINT asset_dependencies_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: asset_dependencies asset_dependencies_provider_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_dependencies
    ADD CONSTRAINT asset_dependencies_provider_fkey FOREIGN KEY (provider) REFERENCES public.vendor_status(provider);


--
-- Name: assets assets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: assets assets_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: attendance attendance_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: change_events change_events_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_events
    ADD CONSTRAINT change_events_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.digital_assets(id) ON DELETE CASCADE;


--
-- Name: change_events change_events_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_events
    ADD CONSTRAINT change_events_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: change_events change_events_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_events
    ADD CONSTRAINT change_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: change_events change_events_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_events
    ADD CONSTRAINT change_events_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: change_events change_events_repo_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_events
    ADD CONSTRAINT change_events_repo_link_id_fkey FOREIGN KEY (repo_link_id) REFERENCES public.repo_links(id) ON DELETE SET NULL;


--
-- Name: check_results check_results_monitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_results
    ADD CONSTRAINT check_results_monitor_id_fkey FOREIGN KEY (monitor_id) REFERENCES public.monitors(id) ON DELETE CASCADE;


--
-- Name: check_results check_results_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_results
    ADD CONSTRAINT check_results_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: check_rollup_1h check_rollup_1h_monitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_rollup_1h
    ADD CONSTRAINT check_rollup_1h_monitor_id_fkey FOREIGN KEY (monitor_id) REFERENCES public.monitors(id) ON DELETE CASCADE;


--
-- Name: check_rollup_1h check_rollup_1h_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.check_rollup_1h
    ADD CONSTRAINT check_rollup_1h_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: clients clients_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: digital_assets digital_assets_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.digital_assets
    ADD CONSTRAINT digital_assets_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: digital_assets digital_assets_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.digital_assets
    ADD CONSTRAINT digital_assets_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: digital_assets digital_assets_owner_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.digital_assets
    ADD CONSTRAINT digital_assets_owner_employee_id_fkey FOREIGN KEY (owner_employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: digital_assets digital_assets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.digital_assets
    ADD CONSTRAINT digital_assets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: early_warnings early_warnings_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.early_warnings
    ADD CONSTRAINT early_warnings_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.digital_assets(id) ON DELETE CASCADE;


--
-- Name: early_warnings early_warnings_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.early_warnings
    ADD CONSTRAINT early_warnings_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON DELETE SET NULL;


--
-- Name: early_warnings early_warnings_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.early_warnings
    ADD CONSTRAINT early_warnings_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: emp_notes emp_notes_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emp_notes
    ADD CONSTRAINT emp_notes_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: emp_tasks emp_tasks_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emp_tasks
    ADD CONSTRAINT emp_tasks_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: emp_tasks emp_tasks_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emp_tasks
    ADD CONSTRAINT emp_tasks_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: employees employees_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: feedback feedback_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: feedback feedback_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: feedback feedback_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_org_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE SET NULL;


--
-- Name: frontend_errors frontend_errors_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frontend_errors
    ADD CONSTRAINT frontend_errors_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.digital_assets(id) ON DELETE CASCADE;


--
-- Name: frontend_errors frontend_errors_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frontend_errors
    ADD CONSTRAINT frontend_errors_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: holidays holidays_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: incident_events incident_events_actor_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_events
    ADD CONSTRAINT incident_events_actor_employee_id_fkey FOREIGN KEY (actor_employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: incident_events incident_events_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_events
    ADD CONSTRAINT incident_events_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON DELETE CASCADE;


--
-- Name: incident_events incident_events_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_events
    ADD CONSTRAINT incident_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: incidents incidents_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.digital_assets(id) ON DELETE CASCADE;


--
-- Name: incidents incidents_assigned_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_assigned_employee_id_fkey FOREIGN KEY (assigned_employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: incidents incidents_detected_by_monitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_detected_by_monitor_id_fkey FOREIGN KEY (detected_by_monitor_id) REFERENCES public.monitors(id) ON DELETE SET NULL;


--
-- Name: incidents incidents_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: invoices invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: invoices invoices_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: monitor_baseline monitor_baseline_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_baseline
    ADD CONSTRAINT monitor_baseline_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.digital_assets(id) ON DELETE CASCADE;


--
-- Name: monitor_baseline monitor_baseline_monitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_baseline
    ADD CONSTRAINT monitor_baseline_monitor_id_fkey FOREIGN KEY (monitor_id) REFERENCES public.monitors(id) ON DELETE CASCADE;


--
-- Name: monitor_baseline monitor_baseline_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_baseline
    ADD CONSTRAINT monitor_baseline_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: monitor_state monitor_state_monitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_state
    ADD CONSTRAINT monitor_state_monitor_id_fkey FOREIGN KEY (monitor_id) REFERENCES public.monitors(id) ON DELETE CASCADE;


--
-- Name: monitor_state monitor_state_open_incident_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_state
    ADD CONSTRAINT monitor_state_open_incident_fk FOREIGN KEY (open_incident_id) REFERENCES public.incidents(id) ON DELETE SET NULL;


--
-- Name: monitor_state monitor_state_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_state
    ADD CONSTRAINT monitor_state_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: monitors monitors_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitors
    ADD CONSTRAINT monitors_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.digital_assets(id) ON DELETE CASCADE;


--
-- Name: monitors monitors_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitors
    ADD CONSTRAINT monitors_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: payroll payroll_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: payroll payroll_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: product_events product_events_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_events
    ADD CONSTRAINT product_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: projects projects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: projects projects_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: quotes quotes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: quotes quotes_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: repo_links repo_links_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repo_links
    ADD CONSTRAINT repo_links_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.digital_assets(id) ON DELETE SET NULL;


--
-- Name: repo_links repo_links_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repo_links
    ADD CONSTRAINT repo_links_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: repo_links repo_links_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repo_links
    ADD CONSTRAINT repo_links_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: repo_links repo_links_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repo_links
    ADD CONSTRAINT repo_links_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: salary_history salary_history_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_history
    ADD CONSTRAINT salary_history_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: signup_requests signup_requests_created_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signup_requests
    ADD CONSTRAINT signup_requests_created_org_id_fkey FOREIGN KEY (created_org_id) REFERENCES public.orgs(id) ON DELETE SET NULL;


--
-- Name: software software_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.software
    ADD CONSTRAINT software_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: software_seats software_seats_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.software_seats
    ADD CONSTRAINT software_seats_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: software_seats software_seats_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.software_seats
    ADD CONSTRAINT software_seats_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: software_seats software_seats_software_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.software_seats
    ADD CONSTRAINT software_seats_software_id_fkey FOREIGN KEY (software_id) REFERENCES public.software(id) ON DELETE CASCADE;


--
-- Name: software_spend software_spend_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.software_spend
    ADD CONSTRAINT software_spend_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: software_spend software_spend_software_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.software_spend
    ADD CONSTRAINT software_spend_software_id_fkey FOREIGN KEY (software_id) REFERENCES public.software(id) ON DELETE CASCADE;


--
-- Name: status_pages status_pages_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_pages
    ADD CONSTRAINT status_pages_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: status_pages status_pages_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_pages
    ADD CONSTRAINT status_pages_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: task_updates task_updates_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: task_updates task_updates_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: usage_events usage_events_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.digital_assets(id) ON DELETE SET NULL;


--
-- Name: usage_events usage_events_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: wfh_leave wfh_leave_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wfh_leave
    ADD CONSTRAINT wfh_leave_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: wfh_leave wfh_leave_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wfh_leave
    ADD CONSTRAINT wfh_leave_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: ai_drafts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_drafts ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_drafts ai_drafts_su; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_drafts_su ON public.ai_drafts FOR SELECT USING (public.is_super_admin());


--
-- Name: ai_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_feedback ai_feedback_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_feedback_rw ON public.ai_feedback USING ((public.is_super_admin() OR (public.is_admin() AND (org_id = public.my_org())))) WITH CHECK ((public.is_super_admin() OR (public.is_admin() AND (org_id = public.my_org()))));


--
-- Name: ai_org_access; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_org_access ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_org_access ai_org_access_su; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_org_access_su ON public.ai_org_access USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: ai_provider_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_provider_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_provider_keys ai_provider_keys_su; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_provider_keys_su ON public.ai_provider_keys USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: ai_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_settings ai_settings_su; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_settings_su ON public.ai_settings USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: ai_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_usage ai_usage_su; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_usage_su ON public.ai_usage FOR SELECT USING ((public.is_super_admin() OR (public.is_admin() AND (org_id = public.my_org()))));


--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: app_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_dependencies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_dependencies ENABLE ROW LEVEL SECURITY;

--
-- Name: assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: change_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.change_events ENABLE ROW LEVEL SECURITY;

--
-- Name: check_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.check_results ENABLE ROW LEVEL SECURITY;

--
-- Name: check_rollup_1h; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.check_rollup_1h ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: digital_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.digital_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: early_warnings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.early_warnings ENABLE ROW LEVEL SECURITY;

--
-- Name: emp_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emp_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: emp_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emp_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: employees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: frontend_errors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.frontend_errors ENABLE ROW LEVEL SECURITY;

--
-- Name: holidays; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

--
-- Name: incident_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;

--
-- Name: incidents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: monitor_baseline; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monitor_baseline ENABLE ROW LEVEL SECURITY;

--
-- Name: monitor_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monitor_state ENABLE ROW LEVEL SECURITY;

--
-- Name: monitors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monitors ENABLE ROW LEVEL SECURITY;

--
-- Name: ops_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ops_config ENABLE ROW LEVEL SECURITY;

--
-- Name: orgs org_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_read ON public.orgs FOR SELECT TO authenticated USING ((id = public.my_org()));


--
-- Name: orgs org_upd; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_upd ON public.orgs FOR UPDATE TO authenticated USING (((id = public.my_org()) AND public.is_admin()));


--
-- Name: orgs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements p_ann_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_ann_read ON public.announcements FOR SELECT TO authenticated USING (((active = true) OR public.is_super_admin()));


--
-- Name: announcements p_ann_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_ann_super ON public.announcements TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: app_assets p_app_assets_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_app_assets_super ON public.app_assets TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: asset_assignments p_asset_assign_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_asset_assign_super ON public.asset_assignments TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: asset_assignments p_asset_assign_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_asset_assign_w ON public.asset_assignments TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: asset_dependencies p_asset_dependencies_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_asset_dependencies_read ON public.asset_dependencies FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: asset_dependencies p_asset_dependencies_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_asset_dependencies_super ON public.asset_dependencies TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: asset_dependencies p_asset_dependencies_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_asset_dependencies_w ON public.asset_dependencies TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: assets p_assets_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_assets_super ON public.assets TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: assets p_assets_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_assets_w ON public.assets TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: attendance p_att_adm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_att_adm ON public.attendance TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: attendance p_att_own_i; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_att_own_i ON public.attendance FOR INSERT TO authenticated WITH CHECK ((employee_id = public.my_employee_id()));


--
-- Name: attendance p_att_own_r; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_att_own_r ON public.attendance FOR SELECT TO authenticated USING ((employee_id = public.my_employee_id()));


--
-- Name: attendance p_att_own_u; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_att_own_u ON public.attendance FOR UPDATE TO authenticated USING ((employee_id = public.my_employee_id()));


--
-- Name: attendance p_attendance_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_attendance_super ON public.attendance TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: change_events p_change_events_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_change_events_read ON public.change_events FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: change_events p_change_events_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_change_events_super ON public.change_events TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: change_events p_change_events_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_change_events_w ON public.change_events TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: check_results p_check_results_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_check_results_read ON public.check_results FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: check_results p_check_results_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_check_results_super ON public.check_results TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: check_results p_check_results_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_check_results_w ON public.check_results TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: check_rollup_1h p_check_rollup_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_check_rollup_read ON public.check_rollup_1h FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: check_rollup_1h p_check_rollup_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_check_rollup_super ON public.check_rollup_1h TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: clients p_cli; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_cli ON public.clients TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: clients p_cli_r; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_cli_r ON public.clients FOR SELECT USING ((org_id = public.my_org()));


--
-- Name: clients p_clients_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_clients_super ON public.clients TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: digital_assets p_digital_assets_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_digital_assets_read ON public.digital_assets FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: digital_assets p_digital_assets_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_digital_assets_super ON public.digital_assets TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: digital_assets p_digital_assets_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_digital_assets_w ON public.digital_assets TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: early_warnings p_early_warnings_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_early_warnings_read ON public.early_warnings FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: early_warnings p_early_warnings_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_early_warnings_super ON public.early_warnings TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: early_warnings p_early_warnings_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_early_warnings_w ON public.early_warnings FOR UPDATE TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND (org_id = public.my_org())));


--
-- Name: employees p_emp_d; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_emp_d ON public.employees FOR DELETE TO authenticated USING ((public.is_admin() AND (org_id = public.my_org())));


--
-- Name: emp_notes p_emp_notes_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_emp_notes_super ON public.emp_notes TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: employees p_emp_r; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_emp_r ON public.employees FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: emp_tasks p_emp_tasks_own_d; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_emp_tasks_own_d ON public.emp_tasks FOR DELETE TO authenticated USING ((employee_id = public.my_employee_id()));


--
-- Name: emp_tasks p_emp_tasks_own_i; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_emp_tasks_own_i ON public.emp_tasks FOR INSERT TO authenticated WITH CHECK ((employee_id = public.my_employee_id()));


--
-- Name: emp_tasks p_emp_tasks_own_r; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_emp_tasks_own_r ON public.emp_tasks FOR SELECT TO authenticated USING ((employee_id = public.my_employee_id()));


--
-- Name: emp_tasks p_emp_tasks_own_u; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_emp_tasks_own_u ON public.emp_tasks FOR UPDATE TO authenticated USING ((employee_id = public.my_employee_id())) WITH CHECK ((employee_id = public.my_employee_id()));


--
-- Name: emp_tasks p_emp_tasks_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_emp_tasks_super ON public.emp_tasks TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: employees p_emp_u; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_emp_u ON public.employees FOR UPDATE TO authenticated USING ((public.is_admin() AND (org_id = public.my_org())));


--
-- Name: employees p_emp_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_emp_w ON public.employees FOR INSERT TO authenticated WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: employees p_employees_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_employees_super ON public.employees TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: feedback p_fb_adm_i; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_fb_adm_i ON public.feedback FOR INSERT TO authenticated WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org())) AND (created_by = auth.uid())));


--
-- Name: feedback p_fb_own_created; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_fb_own_created ON public.feedback FOR SELECT TO authenticated USING ((created_by = auth.uid()));


--
-- Name: feedback p_fb_own_i; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_fb_own_i ON public.feedback FOR INSERT WITH CHECK ((employee_id = public.my_employee_id()));


--
-- Name: feedback p_fb_own_r; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_fb_own_r ON public.feedback FOR SELECT USING ((employee_id = public.my_employee_id()));


--
-- Name: feedback p_fb_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_fb_super ON public.feedback USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: frontend_errors p_frontend_errors_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_frontend_errors_read ON public.frontend_errors FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: frontend_errors p_frontend_errors_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_frontend_errors_super ON public.frontend_errors TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: holidays p_hol_r; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_hol_r ON public.holidays FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: holidays p_hol_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_hol_w ON public.holidays TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: holidays p_holidays_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_holidays_super ON public.holidays TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: incident_events p_incident_events_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_incident_events_read ON public.incident_events FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: incident_events p_incident_events_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_incident_events_super ON public.incident_events TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: incident_events p_incident_events_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_incident_events_w ON public.incident_events TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: incidents p_incidents_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_incidents_read ON public.incidents FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: incidents p_incidents_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_incidents_super ON public.incidents TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: incidents p_incidents_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_incidents_w ON public.incidents TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: invoices p_inv; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_inv ON public.invoices TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: invoices p_invoices_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_invoices_super ON public.invoices TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: monitor_baseline p_monitor_baseline_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_monitor_baseline_read ON public.monitor_baseline FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: monitor_baseline p_monitor_baseline_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_monitor_baseline_super ON public.monitor_baseline TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: monitor_state p_monitor_state_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_monitor_state_read ON public.monitor_state FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: monitor_state p_monitor_state_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_monitor_state_super ON public.monitor_state TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: monitor_state p_monitor_state_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_monitor_state_w ON public.monitor_state TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: monitors p_monitors_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_monitors_read ON public.monitors FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: monitors p_monitors_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_monitors_super ON public.monitors TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: monitors p_monitors_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_monitors_w ON public.monitors TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: emp_notes p_notes_adm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_notes_adm ON public.emp_notes USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: emp_notes p_notes_own_d; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_notes_own_d ON public.emp_notes FOR DELETE USING ((employee_id = public.my_employee_id()));


--
-- Name: emp_notes p_notes_own_i; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_notes_own_i ON public.emp_notes FOR INSERT WITH CHECK ((employee_id = public.my_employee_id()));


--
-- Name: emp_notes p_notes_own_r; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_notes_own_r ON public.emp_notes FOR SELECT USING ((employee_id = public.my_employee_id()));


--
-- Name: emp_notes p_notes_own_u; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_notes_own_u ON public.emp_notes FOR UPDATE USING ((employee_id = public.my_employee_id())) WITH CHECK ((employee_id = public.my_employee_id()));


--
-- Name: ops_config p_ops_config_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_ops_config_super ON public.ops_config TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: orgs p_orgs_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_orgs_super ON public.orgs TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: payroll p_pay_adm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_pay_adm ON public.payroll TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: payroll p_pay_own_r; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_pay_own_r ON public.payroll FOR SELECT USING (((employee_id = public.my_employee_id()) AND (sent = true) AND (pay_status = 'Paid'::text) AND (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = public.my_employee_id()) AND (e.employment_type = 'Full-time'::text))))));


--
-- Name: payroll p_payroll_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_payroll_super ON public.payroll TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: projects p_prj_r; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_prj_r ON public.projects FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: projects p_prj_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_prj_w ON public.projects TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: product_events p_product_events_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_product_events_super ON public.product_events TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: profiles p_prof_adm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_prof_adm ON public.profiles USING ((public.is_admin() AND (org_id = public.my_org())));


--
-- Name: profiles p_prof_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_prof_own ON public.profiles FOR SELECT USING (((id = auth.uid()) OR (public.is_admin() AND (org_id = public.my_org()))));


--
-- Name: profiles p_profiles_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_profiles_super ON public.profiles TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: projects p_projects_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_projects_super ON public.projects TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: quotes p_quo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_quo ON public.quotes TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: quotes p_quotes_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_quotes_super ON public.quotes TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: repo_links p_repo_links_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_repo_links_super ON public.repo_links TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: repo_links p_repo_links_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_repo_links_w ON public.repo_links TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: salary_history p_salhist_adm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_salhist_adm ON public.salary_history USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: salary_history p_salhist_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_salhist_super ON public.salary_history USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: signup_requests p_signup_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_signup_insert ON public.signup_requests FOR INSERT TO authenticated, anon WITH CHECK ((status = 'Pending'::text));


--
-- Name: signup_requests p_signup_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_signup_super ON public.signup_requests TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: software_seats p_software_seats_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_software_seats_super ON public.software_seats TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: software_seats p_software_seats_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_software_seats_w ON public.software_seats TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: software_spend p_software_spend_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_software_spend_super ON public.software_spend TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: software_spend p_software_spend_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_software_spend_w ON public.software_spend TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: software p_software_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_software_super ON public.software TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: software p_software_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_software_w ON public.software TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: status_pages p_status_pages_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_status_pages_read ON public.status_pages FOR SELECT TO authenticated USING ((org_id = public.my_org()));


--
-- Name: status_pages p_status_pages_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_status_pages_super ON public.status_pages TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: status_pages p_status_pages_w; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_status_pages_w ON public.status_pages TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: task_updates p_task_adm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_task_adm ON public.task_updates TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: task_updates p_task_own_i; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_task_own_i ON public.task_updates FOR INSERT WITH CHECK (((employee_id = public.my_employee_id()) AND (upd_date = CURRENT_DATE)));


--
-- Name: task_updates p_task_own_r; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_task_own_r ON public.task_updates FOR SELECT TO authenticated USING ((employee_id = public.my_employee_id()));


--
-- Name: task_updates p_task_own_u; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_task_own_u ON public.task_updates FOR UPDATE USING (((employee_id = public.my_employee_id()) AND (upd_date = CURRENT_DATE))) WITH CHECK (((employee_id = public.my_employee_id()) AND (upd_date = CURRENT_DATE)));


--
-- Name: task_updates p_task_updates_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_task_updates_super ON public.task_updates TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: usage_events p_usage_events_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_usage_events_read ON public.usage_events FOR SELECT TO authenticated USING ((public.is_admin() AND (org_id = public.my_org())));


--
-- Name: usage_events p_usage_events_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_usage_events_super ON public.usage_events TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: vendor_status p_vendor_status_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_vendor_status_read ON public.vendor_status FOR SELECT TO authenticated USING (true);


--
-- Name: vendor_status p_vendor_status_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_vendor_status_super ON public.vendor_status TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: wfh_leave p_wfh_adm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_wfh_adm ON public.wfh_leave TO authenticated USING ((public.is_admin() AND (org_id = public.my_org()))) WITH CHECK ((public.is_admin() AND ((org_id IS NULL) OR (org_id = public.my_org()))));


--
-- Name: wfh_leave p_wfh_leave_super; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_wfh_leave_super ON public.wfh_leave TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


--
-- Name: wfh_leave p_wfh_own_i; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_wfh_own_i ON public.wfh_leave FOR INSERT TO authenticated WITH CHECK ((employee_id = public.my_employee_id()));


--
-- Name: wfh_leave p_wfh_own_r; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY p_wfh_own_r ON public.wfh_leave FOR SELECT TO authenticated USING ((employee_id = public.my_employee_id()));


--
-- Name: payroll; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

--
-- Name: product_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: repo_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.repo_links ENABLE ROW LEVEL SECURITY;

--
-- Name: salary_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.salary_history ENABLE ROW LEVEL SECURITY;

--
-- Name: signup_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: software; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.software ENABLE ROW LEVEL SECURITY;

--
-- Name: software_seats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.software_seats ENABLE ROW LEVEL SECURITY;

--
-- Name: software_spend; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.software_spend ENABLE ROW LEVEL SECURITY;

--
-- Name: status_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.status_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: task_updates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: usage_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_status; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_status ENABLE ROW LEVEL SECURITY;

--
-- Name: wfh_leave; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wfh_leave ENABLE ROW LEVEL SECURITY;

--
-- Name: wfh_leave wfh_leave_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wfh_leave_admin_delete ON public.wfh_leave FOR DELETE TO authenticated USING ((public.is_admin() AND (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = wfh_leave.employee_id) AND (e.org_id = public.my_org()))))));


--
-- Name: wfh_leave wfh_leave_withdraw_own_pending; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wfh_leave_withdraw_own_pending ON public.wfh_leave FOR DELETE TO authenticated USING (((employee_id = public.my_employee_id()) AND (COALESCE(approved, 'Pending'::text) = 'Pending'::text)));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION asset_uptime_month(p_year integer, p_month integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.asset_uptime_month(p_year integer, p_month integer) TO anon;
GRANT ALL ON FUNCTION public.asset_uptime_month(p_year integer, p_month integer) TO authenticated;
GRANT ALL ON FUNCTION public.asset_uptime_month(p_year integer, p_month integer) TO service_role;


--
-- Name: FUNCTION create_org(org_name text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_org(org_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_org(org_name text) TO authenticated;
GRANT ALL ON FUNCTION public.create_org(org_name text) TO service_role;


--
-- Name: FUNCTION digital_assets_sync_monitor(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.digital_assets_sync_monitor() TO anon;
GRANT ALL ON FUNCTION public.digital_assets_sync_monitor() TO authenticated;
GRANT ALL ON FUNCTION public.digital_assets_sync_monitor() TO service_role;


--
-- Name: FUNCTION emp_tasks_lock(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.emp_tasks_lock() TO anon;
GRANT ALL ON FUNCTION public.emp_tasks_lock() TO authenticated;
GRANT ALL ON FUNCTION public.emp_tasks_lock() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION ingest_frontend_errors(p_asset uuid, p_rows jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.ingest_frontend_errors(p_asset uuid, p_rows jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.ingest_frontend_errors(p_asset uuid, p_rows jsonb) TO service_role;


--
-- Name: FUNCTION ingest_product_events(p_org uuid, p_rows jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.ingest_product_events(p_org uuid, p_rows jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.ingest_product_events(p_org uuid, p_rows jsonb) TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- Name: FUNCTION is_super_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_super_admin() TO anon;
GRANT ALL ON FUNCTION public.is_super_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_super_admin() TO service_role;


--
-- Name: FUNCTION mark_missing_task_updates(target date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.mark_missing_task_updates(target date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.mark_missing_task_updates(target date) TO service_role;


--
-- Name: FUNCTION my_employee_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.my_employee_id() TO anon;
GRANT ALL ON FUNCTION public.my_employee_id() TO authenticated;
GRANT ALL ON FUNCTION public.my_employee_id() TO service_role;


--
-- Name: FUNCTION my_org(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.my_org() TO anon;
GRANT ALL ON FUNCTION public.my_org() TO authenticated;
GRANT ALL ON FUNCTION public.my_org() TO service_role;


--
-- Name: FUNCTION refresh_baselines(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.refresh_baselines() FROM PUBLIC;
GRANT ALL ON FUNCTION public.refresh_baselines() TO service_role;


--
-- Name: FUNCTION report_product_events(p_rows jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.report_product_events(p_rows jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.report_product_events(p_rows jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.report_product_events(p_rows jsonb) TO service_role;


--
-- Name: FUNCTION roll_up_check_results(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.roll_up_check_results() FROM PUBLIC;
GRANT ALL ON FUNCTION public.roll_up_check_results() TO service_role;


--
-- Name: FUNCTION set_feedback_actor(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_feedback_actor() TO anon;
GRANT ALL ON FUNCTION public.set_feedback_actor() TO authenticated;
GRANT ALL ON FUNCTION public.set_feedback_actor() TO service_role;


--
-- Name: FUNCTION set_org(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_org() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_org() TO service_role;


--
-- Name: TABLE ai_drafts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_drafts TO anon;
GRANT ALL ON TABLE public.ai_drafts TO authenticated;
GRANT ALL ON TABLE public.ai_drafts TO service_role;


--
-- Name: TABLE ai_feedback; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_feedback TO anon;
GRANT ALL ON TABLE public.ai_feedback TO authenticated;
GRANT ALL ON TABLE public.ai_feedback TO service_role;


--
-- Name: TABLE ai_org_access; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_org_access TO anon;
GRANT ALL ON TABLE public.ai_org_access TO authenticated;
GRANT ALL ON TABLE public.ai_org_access TO service_role;


--
-- Name: TABLE ai_provider_keys; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_provider_keys TO anon;
GRANT ALL ON TABLE public.ai_provider_keys TO authenticated;
GRANT ALL ON TABLE public.ai_provider_keys TO service_role;


--
-- Name: TABLE ai_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_settings TO anon;
GRANT ALL ON TABLE public.ai_settings TO authenticated;
GRANT ALL ON TABLE public.ai_settings TO service_role;


--
-- Name: TABLE ai_usage; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_usage TO anon;
GRANT ALL ON TABLE public.ai_usage TO authenticated;
GRANT ALL ON TABLE public.ai_usage TO service_role;


--
-- Name: TABLE announcements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.announcements TO anon;
GRANT ALL ON TABLE public.announcements TO authenticated;
GRANT ALL ON TABLE public.announcements TO service_role;


--
-- Name: TABLE app_assets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_assets TO anon;
GRANT ALL ON TABLE public.app_assets TO authenticated;
GRANT ALL ON TABLE public.app_assets TO service_role;


--
-- Name: TABLE asset_assignments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.asset_assignments TO anon;
GRANT ALL ON TABLE public.asset_assignments TO authenticated;
GRANT ALL ON TABLE public.asset_assignments TO service_role;


--
-- Name: TABLE asset_dependencies; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.asset_dependencies TO anon;
GRANT ALL ON TABLE public.asset_dependencies TO authenticated;
GRANT ALL ON TABLE public.asset_dependencies TO service_role;


--
-- Name: TABLE check_results; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.check_results TO anon;
GRANT ALL ON TABLE public.check_results TO authenticated;
GRANT ALL ON TABLE public.check_results TO service_role;


--
-- Name: TABLE digital_assets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.digital_assets TO anon;
GRANT ALL ON TABLE public.digital_assets TO authenticated;
GRANT ALL ON TABLE public.digital_assets TO service_role;


--
-- Name: TABLE monitors; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.monitors TO anon;
GRANT ALL ON TABLE public.monitors TO authenticated;
GRANT ALL ON TABLE public.monitors TO service_role;


--
-- Name: TABLE asset_slo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.asset_slo TO anon;
GRANT ALL ON TABLE public.asset_slo TO authenticated;
GRANT ALL ON TABLE public.asset_slo TO service_role;


--
-- Name: TABLE change_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.change_events TO anon;
GRANT ALL ON TABLE public.change_events TO authenticated;
GRANT ALL ON TABLE public.change_events TO service_role;


--
-- Name: TABLE check_rollup_1h; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.check_rollup_1h TO anon;
GRANT ALL ON TABLE public.check_rollup_1h TO authenticated;
GRANT ALL ON TABLE public.check_rollup_1h TO service_role;


--
-- Name: TABLE frontend_errors; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.frontend_errors TO anon;
GRANT ALL ON TABLE public.frontend_errors TO authenticated;
GRANT ALL ON TABLE public.frontend_errors TO service_role;


--
-- Name: TABLE incidents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.incidents TO anon;
GRANT ALL ON TABLE public.incidents TO authenticated;
GRANT ALL ON TABLE public.incidents TO service_role;


--
-- Name: TABLE monitor_baseline; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.monitor_baseline TO anon;
GRANT ALL ON TABLE public.monitor_baseline TO authenticated;
GRANT ALL ON TABLE public.monitor_baseline TO service_role;


--
-- Name: TABLE asset_pulse; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.asset_pulse TO anon;
GRANT ALL ON TABLE public.asset_pulse TO authenticated;
GRANT ALL ON TABLE public.asset_pulse TO service_role;


--
-- Name: TABLE asset_uptime_30d; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.asset_uptime_30d TO anon;
GRANT ALL ON TABLE public.asset_uptime_30d TO authenticated;
GRANT ALL ON TABLE public.asset_uptime_30d TO service_role;


--
-- Name: TABLE assets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.assets TO anon;
GRANT ALL ON TABLE public.assets TO authenticated;
GRANT ALL ON TABLE public.assets TO service_role;


--
-- Name: TABLE attendance; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.attendance TO anon;
GRANT ALL ON TABLE public.attendance TO authenticated;
GRANT ALL ON TABLE public.attendance TO service_role;


--
-- Name: SEQUENCE check_results_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.check_results_id_seq TO anon;
GRANT ALL ON SEQUENCE public.check_results_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.check_results_id_seq TO service_role;


--
-- Name: TABLE clients; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.clients TO anon;
GRANT ALL ON TABLE public.clients TO authenticated;
GRANT ALL ON TABLE public.clients TO service_role;


--
-- Name: TABLE early_warnings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.early_warnings TO anon;
GRANT ALL ON TABLE public.early_warnings TO authenticated;
GRANT ALL ON TABLE public.early_warnings TO service_role;


--
-- Name: TABLE emp_notes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.emp_notes TO anon;
GRANT ALL ON TABLE public.emp_notes TO authenticated;
GRANT ALL ON TABLE public.emp_notes TO service_role;


--
-- Name: TABLE emp_tasks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.emp_tasks TO anon;
GRANT ALL ON TABLE public.emp_tasks TO authenticated;
GRANT ALL ON TABLE public.emp_tasks TO service_role;


--
-- Name: TABLE employees; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.employees TO anon;
GRANT ALL ON TABLE public.employees TO authenticated;
GRANT ALL ON TABLE public.employees TO service_role;


--
-- Name: TABLE feedback; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.feedback TO anon;
GRANT ALL ON TABLE public.feedback TO authenticated;
GRANT ALL ON TABLE public.feedback TO service_role;


--
-- Name: TABLE holidays; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.holidays TO anon;
GRANT ALL ON TABLE public.holidays TO authenticated;
GRANT ALL ON TABLE public.holidays TO service_role;


--
-- Name: TABLE incident_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.incident_events TO anon;
GRANT ALL ON TABLE public.incident_events TO authenticated;
GRANT ALL ON TABLE public.incident_events TO service_role;


--
-- Name: TABLE incident_metrics; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.incident_metrics TO anon;
GRANT ALL ON TABLE public.incident_metrics TO authenticated;
GRANT ALL ON TABLE public.incident_metrics TO service_role;


--
-- Name: TABLE invoices; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.invoices TO anon;
GRANT ALL ON TABLE public.invoices TO authenticated;
GRANT ALL ON TABLE public.invoices TO service_role;


--
-- Name: TABLE monitor_state; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.monitor_state TO anon;
GRANT ALL ON TABLE public.monitor_state TO authenticated;
GRANT ALL ON TABLE public.monitor_state TO service_role;


--
-- Name: TABLE ops_config; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ops_config TO anon;
GRANT ALL ON TABLE public.ops_config TO authenticated;
GRANT ALL ON TABLE public.ops_config TO service_role;


--
-- Name: TABLE orgs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.orgs TO anon;
GRANT ALL ON TABLE public.orgs TO authenticated;
GRANT ALL ON TABLE public.orgs TO service_role;


--
-- Name: TABLE payroll; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payroll TO anon;
GRANT ALL ON TABLE public.payroll TO authenticated;
GRANT ALL ON TABLE public.payroll TO service_role;


--
-- Name: TABLE product_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.product_events TO anon;
GRANT ALL ON TABLE public.product_events TO authenticated;
GRANT ALL ON TABLE public.product_events TO service_role;


--
-- Name: SEQUENCE product_events_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.product_events_id_seq TO anon;
GRANT ALL ON SEQUENCE public.product_events_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.product_events_id_seq TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE projects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;


--
-- Name: TABLE quotes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quotes TO anon;
GRANT ALL ON TABLE public.quotes TO authenticated;
GRANT ALL ON TABLE public.quotes TO service_role;


--
-- Name: TABLE repo_links; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.repo_links TO anon;
GRANT ALL ON TABLE public.repo_links TO authenticated;
GRANT ALL ON TABLE public.repo_links TO service_role;


--
-- Name: TABLE salary_history; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.salary_history TO anon;
GRANT ALL ON TABLE public.salary_history TO authenticated;
GRANT ALL ON TABLE public.salary_history TO service_role;


--
-- Name: TABLE signup_requests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.signup_requests TO anon;
GRANT ALL ON TABLE public.signup_requests TO authenticated;
GRANT ALL ON TABLE public.signup_requests TO service_role;


--
-- Name: TABLE software; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.software TO anon;
GRANT ALL ON TABLE public.software TO authenticated;
GRANT ALL ON TABLE public.software TO service_role;


--
-- Name: TABLE software_seats; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.software_seats TO anon;
GRANT ALL ON TABLE public.software_seats TO authenticated;
GRANT ALL ON TABLE public.software_seats TO service_role;


--
-- Name: TABLE software_spend; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.software_spend TO anon;
GRANT ALL ON TABLE public.software_spend TO authenticated;
GRANT ALL ON TABLE public.software_spend TO service_role;


--
-- Name: TABLE status_pages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.status_pages TO anon;
GRANT ALL ON TABLE public.status_pages TO authenticated;
GRANT ALL ON TABLE public.status_pages TO service_role;


--
-- Name: TABLE task_updates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.task_updates TO anon;
GRANT ALL ON TABLE public.task_updates TO authenticated;
GRANT ALL ON TABLE public.task_updates TO service_role;


--
-- Name: TABLE usage_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.usage_events TO anon;
GRANT ALL ON TABLE public.usage_events TO authenticated;
GRANT ALL ON TABLE public.usage_events TO service_role;


--
-- Name: TABLE vendor_status; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.vendor_status TO anon;
GRANT ALL ON TABLE public.vendor_status TO authenticated;
GRANT ALL ON TABLE public.vendor_status TO service_role;


--
-- Name: TABLE wfh_leave; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wfh_leave TO anon;
GRANT ALL ON TABLE public.wfh_leave TO authenticated;
GRANT ALL ON TABLE public.wfh_leave TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict 4xVHK74qGPWFLFoL4OvQX1PZek9NZ7CsoLzpnt81y4esIe7seKDw7RkAcq320Iw

