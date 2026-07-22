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
-- share a project name the client shown next to such a task in the task log was
-- derived by name and could be ambiguous — every project-keyed lookup silently
-- kept just one of the clients.
--
-- Resolved by 20260721_backfill_task_project_labels: tasks now store the project
-- as "<CLIENT CODE> · <name>" (e.g. "ACM · Website"), which is unique per client,
-- and that migration relabels the historical rows. Rows written before then whose
-- name was shared by several clients cannot be attributed from the stored data
-- and stay bare — that migration lists them for manual review.

drop index if exists public.projects_org_name;

create unique index if not exists projects_org_name_client
  on public.projects (org_id, name, client_id) nulls not distinct;
