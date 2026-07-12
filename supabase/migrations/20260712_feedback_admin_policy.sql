-- Tenant admins had no org-wide policy on feedback (only own-row access via
-- employee_id, which is NULL for most admin accounts since create_org() never
-- sets employee_id). That silently blocked admins from submitting or viewing
-- feedback in the admin portal.
--
-- Mirrors the existing admin-scoped pattern already used on clients, tasks,
-- payroll, etc. Applied to production directly via the Supabase MCP tools;
-- this file records it in migration history.
CREATE POLICY p_fb_adm ON public.feedback
  FOR ALL
  USING (is_admin() AND org_id = my_org())
  WITH CHECK (is_admin() AND (org_id IS NULL OR org_id = my_org()));
