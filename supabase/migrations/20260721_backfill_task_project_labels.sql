-- Backfill historical task rows with client-prefixed project labels.
--
-- Tasks record their project by NAME ("Website") — in task_updates.project
-- (comma-separated), in task_updates.tasks[].project, and in the task sheet
-- (emp_tasks.project). Since a name may now exist for several clients
-- (20260718_projects_unique_per_client), a bare name no longer identifies a
-- project, so the app writes labels of the form "<CLIENT CODE> · <name>"
-- (e.g. "ACM · Website"; Internal projects use "INT").
--
-- The code generator below MIRRORS buildClientCodes()/projLabel() in
-- app/index.html and web/src/lib/project-label.ts — change all three together.
--
-- Attribution: for task_updates only names that are UNAMBIGUOUS within their
-- org (used by exactly one client) can be rewritten — a name shared by several
-- clients cannot be attributed from the stored data. Those rows are left as
-- bare names and listed in a NOTICE for manual review; the app still renders
-- them, just without a code. emp_tasks has its own `client` column, so its
-- rows are always attributable.
--
-- Idempotent: labels contain " · " and so never match a bare project name,
-- meaning a second run maps nothing.

begin;

-- Words used to build a code, minus the noise words the JS drops.
create or replace function public._prj_words(p_name text)
returns text[] language sql immutable as $$
  select coalesce(array_agg(w order by ord), '{}')
  from unnest(regexp_split_to_array(coalesce(p_name, ''), '[^A-Za-z0-9]+')) with ordinality as t(w, ord)
  where w <> '' and lower(w) not in ('and','the','of','for','pvt','ltd','llp','inc','co');
$$;

-- "Acme Retail" -> "AR", "Zoho" -> "ZOH"
create or replace function public._prj_base_code(p_name text)
returns text language plpgsql immutable as $$
declare w text[] := public._prj_words(p_name); i int; out text := '';
begin
  if array_length(w, 1) is null then
    return coalesce(nullif(upper(left(coalesce(p_name, ''), 3)), ''), 'INT');
  end if;
  if array_length(w, 1) = 1 then return upper(left(w[1], 3)); end if;
  for i in 1..least(3, array_length(w, 1)) loop out := out || upper(left(w[i], 1)); end loop;
  return out;
end;
$$;

do $$
declare
  v_org uuid;
  v_client record;
  v_codes jsonb;
  v_taken text[];
  v_code text;
  v_letters text;
  v_len int;
  v_n int;
  v_ambiguous text;
  v_rows int;
begin
  -- Client name -> code, per org. Used for the emp_tasks pass, which knows the client.
  create temp table _prj_codes(org_id uuid, client_name text, code text,
    primary key (org_id, client_name)) on commit drop;
  -- Project name -> label, per org, for names that belong to exactly one client.
  create temp table _prj_labels(org_id uuid, name text, label text,
    primary key (org_id, name)) on commit drop;

  for v_org in select distinct org_id from public.projects where org_id is not null loop
    -- Codes for this org's clients, in the same order and with the same collision
    -- handling as the JS: grow the code with more letters, then add a number.
    v_codes := jsonb_build_object('Internal', 'INT');
    v_taken := array['INT'];

    for v_client in
      select id, name from public.clients
      where org_id = v_org and name is not null and name <> 'Internal'
      order by name, id
    loop
      v_letters := upper(array_to_string(public._prj_words(v_client.name), ''));
      v_code := public._prj_base_code(v_client.name);
      v_len := length(v_code) + 1;
      while v_code = any(v_taken) and v_len <= length(v_letters) loop
        v_code := left(v_letters, v_len);
        v_len := v_len + 1;
      end loop;
      v_n := 2;
      while v_code = any(v_taken) loop
        v_code := public._prj_base_code(v_client.name) || v_n::text;
        v_n := v_n + 1;
      end loop;
      v_taken := v_taken || v_code;
      v_codes := v_codes || jsonb_build_object(v_client.id::text, v_code);
      insert into _prj_codes values (v_org, v_client.name, v_code)
        on conflict do nothing;
    end loop;
    insert into _prj_codes values (v_org, 'Internal', 'INT') on conflict do nothing;

    insert into _prj_labels(org_id, name, label)
    select v_org, p.name,
           coalesce(v_codes ->> p.client_id::text, 'INT') || ' · ' || p.name
    from public.projects p
    where p.org_id = v_org and p.name is not null
      -- unambiguous: within this org the name is used by exactly one client
      and (select count(distinct coalesce(q.client_id::text, 'internal'))
           from public.projects q where q.org_id = v_org and q.name = p.name) = 1
    on conflict do nothing;
  end loop;

  -- 1. task_updates.project — comma-separated names, order preserved.
  with mapped as (
    select u.id,
           string_agg(coalesce(l.label, t.part), ', ' order by s.ord) as project
    from public.task_updates u
    join public.employees e on e.id = u.employee_id
    cross join lateral unnest(string_to_array(u.project, ',')) with ordinality as s(raw, ord)
    cross join lateral (select btrim(s.raw)) as t(part)
    left join _prj_labels l
      on l.org_id = coalesce(u.org_id, e.org_id) and l.name = t.part
    where coalesce(u.project, '') <> '' and t.part <> ''
    group by u.id
    having bool_or(l.label is not null)
  )
  update public.task_updates u set project = m.project
  from mapped m where m.id = u.id and m.project is distinct from u.project;
  get diagnostics v_rows = row_count;
  raise notice 'task_updates.project: % row(s) relabelled', v_rows;

  -- 2. task_updates.tasks[].project
  with mapped as (
    select u.id,
           jsonb_agg(case when l.label is null then x.item
                          else x.item || jsonb_build_object('project', l.label) end
                     order by x.ord) as tasks
    from public.task_updates u
    join public.employees e on e.id = u.employee_id
    cross join lateral jsonb_array_elements(u.tasks) with ordinality as x(item, ord)
    left join _prj_labels l
      on l.org_id = coalesce(u.org_id, e.org_id) and l.name = btrim(x.item ->> 'project')
    where jsonb_typeof(u.tasks) = 'array' and jsonb_array_length(u.tasks) > 0
    group by u.id
    having bool_or(l.label is not null)
  )
  update public.task_updates u set tasks = m.tasks
  from mapped m where m.id = u.id and m.tasks is distinct from u.tasks;
  get diagnostics v_rows = row_count;
  raise notice 'task_updates.tasks: % row(s) relabelled', v_rows;

  -- 3. emp_tasks (task sheet). Its `client` column names the client outright, so
  -- every row is attributable. The lock trigger rejects edits to project on rows
  -- already reported on an earlier day; it guards user edits, not a format
  -- migration, so it is stepped around here.
  alter table public.emp_tasks disable trigger trg_emp_tasks_lock;
  update public.emp_tasks t
  set project = c.code || ' · ' || btrim(t.project)
  from public.employees e, _prj_codes c
  where e.id = t.employee_id
    and c.org_id = coalesce(t.org_id, e.org_id)
    and c.client_name = coalesce(nullif(btrim(t.client), ''), 'Internal')
    and coalesce(btrim(t.project), '') <> ''
    and exists (select 1 from public.projects p
                where p.org_id = c.org_id and p.name = btrim(t.project));
  get diagnostics v_rows = row_count;
  alter table public.emp_tasks enable trigger trg_emp_tasks_lock;
  raise notice 'emp_tasks.project: % row(s) relabelled', v_rows;

  -- 4. What could not be attributed.
  select string_agg(distinct name, ', ') into v_ambiguous
  from public.projects p
  where p.org_id is not null and p.name is not null
    and (select count(distinct coalesce(q.client_id::text, 'internal'))
         from public.projects q where q.org_id = p.org_id and q.name = p.name) > 1;
  if v_ambiguous is not null then
    raise notice 'Left as bare names in task_updates (shared by several clients, needs manual review): %', v_ambiguous;
  end if;
end;
$$;

drop function if exists public._prj_base_code(text);
drop function if exists public._prj_words(text);

commit;
