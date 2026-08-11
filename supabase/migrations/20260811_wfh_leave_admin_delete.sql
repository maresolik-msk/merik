-- Let an admin remove any WFH/Leave request in their own org.
--
-- Rejecting a request records a decision against the employee. That is the wrong
-- tool for one raised in error, and it is no tool at all for handing a day back:
-- the leave balance is computed from these rows, so a wrongly approved leave keeps
-- costing the employee a day until the row itself goes.
--
-- Companion to wfh_leave_withdraw_own_pending (20260811_wfh_leave_withdraw.sql),
-- which covers the employee withdrawing their own still-pending request.
--
-- Scoped through employees rather than wfh_leave.org_id: org_id is nullable on this
-- table and older rows were written without it, which would silently put them out of
-- every admin's reach.
drop policy if exists wfh_leave_admin_delete on public.wfh_leave;
create policy wfh_leave_admin_delete on public.wfh_leave
  for delete to authenticated
  using (
    public.is_admin()
    and exists (
      select 1 from public.employees e
      where e.id = wfh_leave.employee_id
        and e.org_id = public.my_org()
    )
  );
