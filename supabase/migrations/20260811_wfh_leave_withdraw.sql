-- Let an employee withdraw their own un-actioned WFH/Leave request.
--
-- The portal has had a Withdraw button since 6324fff, but wfh_leave carries no
-- DELETE policy. RLS does not error on a delete it disallows — it simply matches
-- zero rows and returns success. So the button reported "already actioned by your
-- admin" for a request nobody had touched, and an employee who typed the wrong
-- date could still only get it cleared by asking an admin to REJECT it, which left
-- a permanent rejection on record for their own typo.
--
-- Scope: own row, and only while it is still Pending. An approved leave has already
-- been stamped across the attendance log by apprWfh(), so unwinding it is the
-- admin's job, not a delete the employee can fire.
drop policy if exists wfh_leave_withdraw_own_pending on public.wfh_leave;
create policy wfh_leave_withdraw_own_pending on public.wfh_leave
  for delete to authenticated
  using (
    employee_id = public.my_employee_id()
    and coalesce(approved, 'Pending') = 'Pending'
  );

-- Older rows were written with approved null, which reads as Pending everywhere in
-- the UI but matches no equality filter. Make the two the same thing for good.
update public.wfh_leave set approved = 'Pending' where approved is null;
alter table public.wfh_leave alter column approved set default 'Pending';
