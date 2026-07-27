-- Feedback was the only org-scoped table without a set_org trigger: org_id and
-- employee_id came straight off the client's in-memory session state. When that
-- state is stale (a tab left open after the account in localStorage changed),
-- the insert arrives with a NULL or foreign employee_id and RLS rejects it —
-- the "403 on POST /rest/v1/feedback" seen in the browser console.
--
-- Filling both columns from the caller's own JWT closes that gap. It can only
-- ever attribute a row to whoever is actually authenticated: an employee_id
-- supplied by the client is left untouched, so p_fb_own_i still rejects an
-- attempt to file feedback as somebody else.
--
-- Applied to production directly via the Supabase MCP tools; this file records
-- it in migration history.

create or replace function public.set_feedback_actor()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.org_id is null then new.org_id := my_org(); end if;
  if new.employee_id is null then new.employee_id := my_employee_id(); end if;
  return new;
end $$;

drop trigger if exists trg_setactor_feedback on public.feedback;
create trigger trg_setactor_feedback
  before insert on public.feedback
  for each row execute function public.set_feedback_actor();
