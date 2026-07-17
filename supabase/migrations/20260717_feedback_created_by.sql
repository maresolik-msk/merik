-- Let a tenant admin see the feedback they personally submitted (and its reply),
-- the way employees already can via employee_id.
--
-- Admins have employee_id IS NULL (create_org() never sets it), so their rows
-- were indistinguishable from any other admin's in the same org — there was no
-- safe way to show "your own" without also showing a colleague admin's. This
-- adds the missing attribution.
--
--   * created_by defaults to auth.uid(), so the app doesn't pass it and every
--     new row is attributed to whoever actually submitted it.
--   * p_fb_own_created grants SELECT strictly on rows you created yourself.
--     It is scoped by auth.uid(), not by org or role, so it can never expose
--     someone else's feedback.
--   * p_fb_adm_i's WITH CHECK now pins created_by to auth.uid(), so an admin
--     can't submit a row attributed to another user.
--
-- Existing rows keep created_by NULL and therefore stay invisible to admins
-- (NULL = auth.uid() is NULL, never true) — they predate attribution and only
-- the super admin can read them. That is intentional, not an oversight.

alter table public.feedback
  add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete set null;

create index if not exists idx_feedback_created_by on public.feedback(created_by);

-- Own-row read, by authenticated user id.
drop policy if exists p_fb_own_created on public.feedback;
create policy p_fb_own_created on public.feedback
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Re-assert the admin insert policy, now pinning attribution.
drop policy if exists p_fb_adm_i on public.feedback;
create policy p_fb_adm_i on public.feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() AND (org_id IS NULL OR org_id = my_org()) AND created_by = auth.uid());
