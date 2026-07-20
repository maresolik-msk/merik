-- Employee offboarding: preserve a former employee's history instead of deleting it.
--
-- Problem: removing an employee hard-deleted the row, and attendance,
-- task_updates, payroll and salary_history all CASCADE — so a mid-month
-- removal destroyed the person's entire record, final pay included. Marking
-- them Inactive instead made them vanish everywhere (every screen filters
-- status = 'Active'), stranding their history and skipping their final pay.
--
-- Fix (app side): "Remove" now archives — sets status = 'Inactive' and records
-- the last working day here — and never deletes. Their records stay, visible
-- under a Previous Employees view; attendance/tasks stop after left_on; and the
-- leaving month's pay is pro-rated to left_on.
--
-- This migration only adds the column the app needs.

alter table public.employees
  add column if not exists left_on date;

comment on column public.employees.left_on is
  'Last working day for a former (Inactive) employee. NULL for current staff. Attendance/tasks stop after this date and the leaving month''s pay is pro-rated to it.';
