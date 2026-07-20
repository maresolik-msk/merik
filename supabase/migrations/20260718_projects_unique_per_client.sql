-- Allow the same project name across different clients.
--
-- Before: projects_org_name = UNIQUE (org_id, name) made a project name unique
-- per company, so "Website" could exist only once — the whole reason admins
-- couldn't reuse a common name for several clients.
--
-- After: uniqueness is per (org_id, name, client_id), so each client can have
-- its own "Website", while a single client still can't get the same project
-- twice. NULLS NOT DISTINCT means two Internal (no-client) projects also can't
-- share a name — matching the app, which treats "Internal" as one bucket.
--
-- Note: task_updates records a task's project by name only, so when two clients
-- share a project name the client shown next to such a task in the task log is
-- derived by name and may be ambiguous. Accepted for now (see the add-project
-- multi-client flow); revisit if per-task client attribution is needed.

drop index if exists public.projects_org_name;

create unique index if not exists projects_org_name_client
  on public.projects (org_id, name, client_id) nulls not distinct;
