-- Company name, contact name and work email are mandatory on a lead.
--
-- The columns were already NOT NULL, but NOT NULL does not reject an empty
-- string, and p_signup_insert lets anon insert any row whose status is
-- 'Pending' — so the only thing actually enforcing these fields was a check in
-- the browser, which anything posting straight at PostgREST skips. A lead with
-- no name or no way to reach them is unusable, so enforce it where it holds for
-- every caller.
--
-- phone and message stay optional, as the form says.
--
-- Applied to production directly via the Supabase MCP tools; this file records
-- it in migration history.

alter table public.signup_requests
  add constraint signup_requests_company_name_present
    check (btrim(company_name) <> ''),
  add constraint signup_requests_contact_name_present
    check (btrim(contact_name) <> ''),
  add constraint signup_requests_email_valid
    check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
