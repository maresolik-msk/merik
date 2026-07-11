-- Security hardening: reduce the public RPC attack surface.
--
-- Context: the Supabase advisor flagged several SECURITY DEFINER functions as
-- callable by anon / authenticated over PostgREST (/rest/v1/rpc/<fn>).
--
-- Postgres grants EXECUTE on functions to PUBLIC by default, and anon /
-- authenticated inherit that. Revoking from those roles alone is a no-op — you
-- must REVOKE ... FROM PUBLIC and then GRANT back to the roles that need it.
--
-- IMPORTANT — the RLS helper functions is_admin(), is_super_admin(), my_org(),
-- my_employee_id() are deliberately left executable. They are called inside RLS
-- policy expressions, which are evaluated with the querying role's privileges;
-- revoking EXECUTE would make every policy referencing them fail and lock users
-- out of their own data. Their advisor warnings are expected and accepted.

-- Trigger functions: fire via the trigger mechanism regardless of EXECUTE
-- grants, so no role needs direct EXECUTE. Remove from the RPC surface entirely.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_org()                       FROM PUBLIC, anon, authenticated;

-- Cron/admin function that writes 'No Update' rows across ALL orgs. Left open it
-- lets anyone insert junk task_updates. Restrict to service_role (the scheduled
-- job runs with the service key).
REVOKE EXECUTE ON FUNCTION public.mark_missing_task_updates(date) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.mark_missing_task_updates(date) TO service_role;

-- create_org(): the self-serve "create my workspace" call. Only a signed-in
-- user (who has no org yet) is a legitimate caller; anon never is.
REVOKE EXECUTE ON FUNCTION public.create_org(text)               FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_org(text)               TO authenticated, service_role;

-- Note (manual, not SQL): also enable Auth > "Leaked password protection"
-- (HaveIBeenPwned check) in the Supabase dashboard. It cannot be toggled here.
