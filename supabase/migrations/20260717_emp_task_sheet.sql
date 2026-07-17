-- Employee task sheet: a personal drafting list on the Notes page. An employee
-- writes a task once here, then pushes it into their daily Task Log without
-- retyping it — including on each of several days for multi-day work.
--
-- Locking rule: once a task has been reported in a Task Log on an EARLIER day,
-- its details are frozen. The task_updates row for that day is itself locked
-- (employees may only edit today's update), so letting the sheet text drift
-- afterwards would mean the sheet no longer matches what was actually reported.
-- Ticking `done` stays allowed, since that's progress rather than a rewrite.
--
--   * first_logged_on drives the lock (NOT last_logged_on) — a task re-logged
--     today must stay frozen if it was first reported on an earlier day.
--   * last_logged_on tracks the most recent push, so the UI can tell you it's
--     already on today's log.
--   * The lock is enforced by a trigger, not just hidden in the UI, so it holds
--     against direct API calls too.
--
-- Visibility: own-row only (plus super admin). Deliberately NOT readable by
-- tenant admins — this is a private drafting pad, and admins already see the
-- real Task Log. (emp_notes grants admins org-wide access; that precedent is
-- not copied here on purpose.)

create table if not exists public.emp_tasks (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.employees(id) on delete cascade,
  org_id          uuid references public.orgs(id),
  task            text not null,
  client          text,
  project         text,
  est_min         integer,
  done            boolean not null default false,
  first_logged_on date,
  last_logged_on  date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists idx_emp_tasks_emp on public.emp_tasks(employee_id, done);

drop trigger if exists trg_setorg_emp_tasks on public.emp_tasks;
create trigger trg_setorg_emp_tasks before insert on public.emp_tasks
  for each row execute function public.set_org();

-- Freeze the details of a task that has already been reported on an earlier day.
create or replace function public.emp_tasks_lock()
returns trigger
language plpgsql
as $function$
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
end $function$;

drop trigger if exists trg_emp_tasks_lock on public.emp_tasks;
create trigger trg_emp_tasks_lock before update on public.emp_tasks
  for each row execute function public.emp_tasks_lock();

alter table public.emp_tasks enable row level security;

drop policy if exists p_emp_tasks_own_r on public.emp_tasks;
create policy p_emp_tasks_own_r on public.emp_tasks for select to authenticated
  using (employee_id = my_employee_id());
drop policy if exists p_emp_tasks_own_i on public.emp_tasks;
create policy p_emp_tasks_own_i on public.emp_tasks for insert to authenticated
  with check (employee_id = my_employee_id());
drop policy if exists p_emp_tasks_own_u on public.emp_tasks;
create policy p_emp_tasks_own_u on public.emp_tasks for update to authenticated
  using (employee_id = my_employee_id()) with check (employee_id = my_employee_id());
drop policy if exists p_emp_tasks_own_d on public.emp_tasks;
create policy p_emp_tasks_own_d on public.emp_tasks for delete to authenticated
  using (employee_id = my_employee_id());
drop policy if exists p_emp_tasks_super on public.emp_tasks;
create policy p_emp_tasks_super on public.emp_tasks for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

grant select, insert, update, delete on public.emp_tasks to authenticated, service_role;
