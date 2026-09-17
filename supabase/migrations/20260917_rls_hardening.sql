-- Row-level security hardening, from the first read of the live policies
-- (supabase/schema.sql). Every change here is stricter than what it replaces;
-- nothing widens. Safe to re-run.
--
-- What was wrong, in order of severity:
--   1. p_prof_adm let a tenant admin update any profile in their org with no
--      check on what changed — including their own role, to 'superadmin'.
--   2. handle_new_user() took the new profile's role from sign-up metadata, so
--      an email sign-up could ask to be a superadmin.
--   3. p_emp_r let every employee read every colleague's row: CTC, PAN, UAN,
--      bank account.
--   4. p_att_own_i / p_att_own_u let an employee insert or rewrite their own
--      attendance for any date, which is what payroll reads.
--   5. p_wfh_own_i let an employee insert a leave request already approved.

-- 1. Profiles: the app never writes profiles from the browser. Logins are
--    provisioned by edge functions with the service key, and create_org() is
--    SECURITY DEFINER. So admins need no write policy at all.
drop policy if exists p_prof_adm on public.profiles;

-- Belt and braces: even if a broad policy is ever added back, a member of an
-- org cannot change role or org_id unless the caller is a superadmin or the
-- service key (auth.uid() is null for the service key). A profile with no org
-- yet is exempt so create_org() can still turn it into that org's admin.
create or replace function public.profiles_lock_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.org_id is not null
     and (new.role is distinct from old.role or new.org_id is distinct from old.org_id)
     and not (public.is_super_admin() or auth.uid() is null) then
    raise exception 'role and workspace can only be changed by Merik';
  end if;
  return new;
end $$;
drop trigger if exists trg_profiles_lock_role on public.profiles;
create trigger trg_profiles_lock_role before update on public.profiles
  for each row execute function public.profiles_lock_role();

-- 2. New auth users are always employees. Superadmins and tenant admins are
--    created only by su-manage / review-signup, which set the role afterwards
--    with the service key.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare erec record;
begin
  select id, org_id into erec from employees where lower(email)=lower(new.email) limit 1;
  insert into profiles (id, role, employee_id, org_id)
  values (new.id, 'employee', erec.id, erec.org_id)
  on conflict (id) do nothing;
  return new;
end $$;

-- 3. Employees read their own row; admins read the org. Every employee-side
--    page loads only the signed-in person's employee row.
drop policy if exists p_emp_r on public.employees;
create policy p_emp_r on public.employees for select to authenticated
  using ((org_id = public.my_org() and public.is_admin()) or id = public.my_employee_id());

-- 4. Attendance from the employee's own device: today only, with a day either
--    side because the database day is UTC and India is 5h30 ahead. History
--    stays admin-only, which is what payroll trusts.
drop policy if exists p_att_own_i on public.attendance;
create policy p_att_own_i on public.attendance for insert to authenticated
  with check (employee_id = public.my_employee_id()
              and att_date between current_date - 1 and current_date + 1);
drop policy if exists p_att_own_u on public.attendance;
create policy p_att_own_u on public.attendance for update to authenticated
  using (employee_id = public.my_employee_id()
         and att_date between current_date - 1 and current_date + 1)
  with check (employee_id = public.my_employee_id()
              and att_date between current_date - 1 and current_date + 1);

-- 5. A leave request is born Pending. Only p_wfh_adm can set approved.
drop policy if exists p_wfh_own_i on public.wfh_leave;
create policy p_wfh_own_i on public.wfh_leave for insert to authenticated
  with check (employee_id = public.my_employee_id()
              and coalesce(approved, 'Pending') = 'Pending');

-- Not changed, on purpose, pending a decision: p_notes_adm gives admins full
-- access to employees' private notes and to-dos; org_upd lets an admin edit
-- their own org row including modules and status.
