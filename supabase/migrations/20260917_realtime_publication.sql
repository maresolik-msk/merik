-- Live updates in the app.
--
-- The client subscribes to row changes on the tables where someone else's change
-- matters within the minute (a leave request lands, an update is filed, a check-in
-- happens, an incident opens, feedback arrives). Realtime applies row-level
-- security, so a user only hears about rows they can already read.
--
-- Idempotent: adding a table that is already published is an error, so each one
-- is checked first. Deletes are delivered only for tables with REPLICA IDENTITY
-- FULL; they are not set here because the app also refreshes on focus and every
-- 60 s, which covers the rare delete.
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'supabase_realtime publication not found; skipping';
    return;
  end if;
  foreach t in array array['wfh_leave','task_updates','attendance','incidents','feedback'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
