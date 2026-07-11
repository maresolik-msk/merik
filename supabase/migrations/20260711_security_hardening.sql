-- Security hardening: reduce the public RPC attack surface.
--
-- Context: the Supabase advisor flagged several SECURITY DEFINER functions as
-- callable by anon / authenticated over PostgREST (/rest/v1/rpc/<fn>).
--
-- IMPORTANT — do NOT revoke EXECUTE on the RLS helper functions
--   is_admin(), is_super_admin(), my_org(), my_employee_id()
-- They are called inside RLS policy expressions, which are evaluated with the
-- querying role's privileges. Revoking EXECUTE would make every policy that
-- references them fail with "permission denied" and lock users out of their
-- own data. Their advisor warnings are expected and accepted.
--
-- The functions below are trigger or cron/admin functions that have no reason
-- to be in the exposed API surface.

-- Trigger functions: only ever fired by the database, never called directly.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_org()                    FROM anon, authenticated;

-- Cron/admin function that writes 'No Update' rows across ALL orgs.
-- Left callable it lets anyone insert junk task_updates at will. Restrict to
-- the service_role (the scheduled job runs with the service key).
REVOKE EXECUTE ON FUNCTION public.mark_missing_task_updates(date) FROM anon, authenticated;

-- create_org() is the self-serve "create my workspace" call. A signed-in user
-- who has no org yet is the only legitimate caller; anon never is.
REVOKE EXECUTE ON FUNCTION public.create_org(text)            FROM anon;

-- Note (manual, not SQL): also enable Auth > "Leaked password protection"
-- (HaveIBeenPwned check) in the Supabase dashboard. It cannot be toggled here.
