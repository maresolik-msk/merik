-- Feedback is private to the Merik super admin.
--
-- Problem: p_fb_adm (added 2026-07-12) granted tenant admins FOR ALL on every
-- feedback row in their org. Feedback is candid input to the Merik team — an
-- employee may well be raising something *about* their own admin — so letting
-- the company's admin read, re-status and reply to it is the wrong default.
-- The admin portal's Feedback page was actively listing every employee's
-- feedback with the author's name.
--
-- After this migration:
--   * Tenant admins may SUBMIT feedback and nothing else — no select, update
--     or delete. (p_fb_adm_i is INSERT-only.)
--   * Employees keep own-row access via p_fb_own_i / p_fb_own_r, so the
--     employee portal still shows their own submissions and any reply. That's
--     their own words, not a disclosure.
--   * Only the super admin (p_fb_super) can read all feedback, set status and
--     write replies.
--
-- Note: admins have employee_id IS NULL (create_org() never sets it), so
-- p_fb_own_r's `employee_id = my_employee_id()` yields NULL and never matches
-- for them — dropping p_fb_adm genuinely removes all admin read access.

drop policy if exists p_fb_adm on public.feedback;

create policy p_fb_adm_i on public.feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() AND (org_id IS NULL OR org_id = my_org()));
