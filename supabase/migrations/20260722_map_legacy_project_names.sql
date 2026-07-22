-- Map free-typed legacy project names onto real projects.
--
-- APPLIED to doms-global on 2026-07-22 as migration `map_legacy_project_names`,
-- with exactly the seven mappings listed below. Afterwards 438 project
-- references carried a client code and 57 were still bare — all of them entries
-- from the UNRESOLVED block further down, which were deliberately not applied.
-- Re-running is a no-op: a mapped value becomes a label containing " · ", which
-- never matches a legacy string again.
--
-- Back when the task log's project field was free text, people typed whatever
-- they liked ("Rajvi Packaging Website", "SCLY-Website", "theoak land website").
-- Those strings never matched a row in `projects`, so
-- 20260721_backfill_task_project_labels could not attribute them to a client and
-- left them alone. This migration maps them onto real projects by hand.
--
-- Every mapping below is a JUDGEMENT CALL made from the client/project list, not
-- something derivable from the data — that is why they are spelled out here
-- rather than guessed at by a fuzzy-matching query. To take on an unresolved
-- entry later, move it up into the list with a client and project and re-run;
-- only the new line will have any effect.
--
-- The migration refuses to run if any mapping names a client or project that
-- does not exist, so a typo fails loudly instead of silently doing nothing.
-- Counts in comments are occurrences found on 2026-07-22 across the day-level
-- project column, the per-task items, and the task sheet.

begin;

-- Same code generator as 20260721 / app/index.html / web/src/lib/project-label.ts.
create or replace function public._prj_words(p_name text)
returns text[] language sql immutable as $$
  select coalesce(array_agg(w order by ord), '{}')
  from unnest(regexp_split_to_array(coalesce(p_name, ''), '[^A-Za-z0-9]+')) with ordinality as t(w, ord)
  where w <> '' and lower(w) not in ('and','the','of','for','pvt','ltd','llp','inc','co');
$$;

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

-- One project row carries a trailing space in its name, which is why the task
-- value "Tryon integration" never matched it. Fix the source of that mismatch.
update public.projects set name = btrim(name) where name <> btrim(name);

do $do$
declare
  v_org uuid;
  v_client record;
  v_codes jsonb;
  v_taken text[];
  v_code text;
  v_letters text;
  v_len int;
  v_n int;
  v_bad text;
  v_rows int;
begin
  ---------------------------------------------------------------------------
  -- THE MAPPING. legacy value typed in a task  ->  real client + real project.
  ---------------------------------------------------------------------------
  create temp table _map(legacy text primary key, client_name text, project_name text) on commit drop;
  insert into _map(legacy, client_name, project_name) values
    -- Case-only difference from the real project name. (39)
    ('Marketing - kLAR WORLD', 'Klar',            'Marketing - KLAR WORLD'),
    -- Rajvi Packaging's only website project is called "Website New". (11)
    ('Rajvi Packaging Website','Rajvi Packaging', 'Website New'),
    -- SCLY = Scaleezy. (5)
    ('SCLY-Website',           'Scaleezy',        'Website'),
    -- (5)
    ('Shrutham Website',       'Shrutham',        'Website'),
    -- Seven SIsters (sic — that is how the client name is spelled) has exactly
    -- one project, so the client name alone identifies it. (4)
    ('Seven Sisters',          'Seven SIsters',   'Social Media Marketing'),
    -- Spacing/case variant of theoakland's only website project. (2)
    ('theoak land website',    'theoakland',      'Website'),
    -- Matches once the trailing space above is trimmed. (2)
    ('Tryon integration',      'Sirimalle',       'Tryon integration');

  ---------------------------------------------------------------------------
  -- UNRESOLVED — fill in a client and project, then move these up into the list
  -- above. Left out deliberately: each names a client (or nothing) without
  -- saying WHICH project, and guessing would put hours against the wrong one.
  --
  --   'Shrutham Social Media'   (3) — Shrutham has only "Marketing" and "Website",
  --                                   so "Marketing" is the likely target — but it
  --                                   is a guess, so it is not applied. Confirm.
  --   'Rajvi SEO & Marketing'  (19) — Rajvi Packaging has "Social Media Marketing"
  --                                   and "Website New"; SEO matches neither.
  --                                   Retired project, or should it be created?
  --   'Klar'                    (5) — Klar has 5 projects. Which?
  --   'New Website'             (4) — client unknown.
  --   'Website 01'              (3) — client unknown.
  --   'Scaleezy'                (3) — 4 projects: CRM(B), Super Admin, TryOn2Buy, Website.
  --   'Topper Lens'             (2) — TopperLens: "Graphic Design" or "Website"?
  --   'Rajvi Packaging'         (2) — "Social Media Marketing" or "Website New"?
  --   'Internal'                (1) — 4 internal projects.
  --
  -- NOT mappable at all, and intentionally so: the bare names 'Website' (13) and
  -- 'Social Media Marketing' (2) are each used by several clients. Nothing in
  -- the stored row says which one, so they stay as they are.
  ---------------------------------------------------------------------------

  -- Fail loudly on a mapping that points at something non-existent.
  select string_agg(format('%s -> %s / %s', m.legacy, m.client_name, m.project_name), E'\n  ')
    into v_bad
  from _map m
  where not exists (
    select 1 from public.projects p join public.clients c on c.id = p.client_id
    where c.name = m.client_name and p.name = m.project_name);
  if v_bad is not null then
    raise exception E'These mappings name a client/project that does not exist:\n  %', v_bad;
  end if;

  -- Client codes, per org, exactly as the other migration builds them.
  create temp table _prj_codes(org_id uuid, client_name text, code text,
    primary key (org_id, client_name)) on commit drop;
  for v_org in select distinct org_id from public.projects where org_id is not null loop
    v_taken := array['INT'];
    insert into _prj_codes values (v_org, 'Internal', 'INT') on conflict do nothing;
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
      insert into _prj_codes values (v_org, v_client.name, v_code) on conflict do nothing;
    end loop;
  end loop;

  -- legacy value -> finished label, per org.
  create temp table _lbl(org_id uuid, legacy text, label text,
    primary key (org_id, legacy)) on commit drop;
  insert into _lbl(org_id, legacy, label)
  select c.org_id, m.legacy, c.code || ' · ' || m.project_name
  from _map m join _prj_codes c on c.client_name = m.client_name
  on conflict do nothing;

  -- 1. task_updates.project — comma-separated, order preserved.
  with mapped as (
    select u.id, string_agg(coalesce(l.label, t.part), ', ' order by s.ord) as project
    from public.task_updates u
    join public.employees e on e.id = u.employee_id
    cross join lateral unnest(string_to_array(u.project, ',')) with ordinality as s(raw, ord)
    cross join lateral (select btrim(s.raw)) as t(part)
    left join _lbl l on l.org_id = coalesce(u.org_id, e.org_id) and l.legacy = t.part
    where coalesce(u.project, '') <> '' and t.part <> ''
    group by u.id
    having bool_or(l.label is not null)
  )
  update public.task_updates u set project = m.project
  from mapped m where m.id = u.id and m.project is distinct from u.project;
  get diagnostics v_rows = row_count;
  raise notice 'task_updates.project: % row(s) mapped', v_rows;

  -- 2. task_updates.tasks[].project
  with mapped as (
    select u.id,
           jsonb_agg(case when l.label is null then x.item
                          else x.item || jsonb_build_object('project', l.label) end
                     order by x.ord) as tasks
    from public.task_updates u
    join public.employees e on e.id = u.employee_id
    cross join lateral jsonb_array_elements(u.tasks) with ordinality as x(item, ord)
    left join _lbl l on l.org_id = coalesce(u.org_id, e.org_id)
                    and l.legacy = btrim(x.item ->> 'project')
    where jsonb_typeof(u.tasks) = 'array' and jsonb_array_length(u.tasks) > 0
    group by u.id
    having bool_or(l.label is not null)
  )
  update public.task_updates u set tasks = m.tasks
  from mapped m where m.id = u.id and m.tasks is distinct from u.tasks;
  get diagnostics v_rows = row_count;
  raise notice 'task_updates.tasks: % row(s) mapped', v_rows;

  -- 3. emp_tasks (task sheet). The lock trigger guards user edits, not a data
  -- migration, so it is stepped around here as in 20260721.
  alter table public.emp_tasks disable trigger trg_emp_tasks_lock;
  update public.emp_tasks t
  set project = l.label,
      client  = coalesce(nullif(btrim(t.client), ''), m.client_name)
  from public.employees e, _lbl l, _map m
  where e.id = t.employee_id
    and l.org_id = coalesce(t.org_id, e.org_id)
    and l.legacy = btrim(t.project)
    and m.legacy = l.legacy;
  get diagnostics v_rows = row_count;
  alter table public.emp_tasks enable trigger trg_emp_tasks_lock;
  raise notice 'emp_tasks.project: % row(s) mapped', v_rows;
end;
$do$;

drop function if exists public._prj_base_code(text);
drop function if exists public._prj_words(text);

commit;
