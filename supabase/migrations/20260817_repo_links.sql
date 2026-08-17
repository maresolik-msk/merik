-- Connect a client's repository to the work it belongs to.
--
-- Until now the webhook receiver took the tenant from the URL and verified
-- against one shared secret in an environment variable. That works for a repo an
-- admin wires up by hand — it does not work for the actual job, which is an
-- agency connecting a repo per client project without anyone touching Supabase
-- secrets.
--
-- So a repo is a row. Merik generates the token and the signing secret, shows
-- the user exactly what to paste into GitHub once, and every event that arrives
-- afterwards already knows which client, which project and which asset it
-- belongs to.
--
-- On the choice not made: a GitHub App would remove the per-repo step entirely —
-- install once, every repo flows in. It also means holding an installation token
-- that can read a client's source, which §11.1 says gets envelope encryption
-- with a managed KMS before the first one is stored. This design deliberately
-- holds no credential of the client's at all: the secret here is one Merik
-- generated, and it can only verify inbound messages, never reach into anything.

create table if not exists public.repo_links (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid references public.orgs(id),
  provider       text not null default 'github' check (provider in ('github','vercel')),
  -- owner/name. Checked against every incoming payload, so a token issued for
  -- one repo cannot post events claiming to be another.
  repo           text not null,
  client_id      uuid references public.clients(id)        on delete set null,
  project_id     uuid references public.projects(id)       on delete set null,
  asset_id       uuid references public.digital_assets(id) on delete set null,
  -- In the URL. Identifies which link is speaking, which is what lets the
  -- signature be checked before the body is parsed or trusted.
  token          text not null unique default encode(gen_random_bytes(16), 'hex'),
  -- The HMAC secret the user pastes into GitHub. Merik's own, not the client's.
  webhook_secret text not null default encode(gen_random_bytes(24), 'hex'),
  active         bool not null default true,
  -- So the UI can say "nothing since you set this up", which is the difference
  -- between a quiet team and a webhook that was never saved.
  last_event_at  timestamptz,
  created_at     timestamptz not null default now(),
  unique (org_id, provider, repo)
);
create index if not exists idx_repo_links_token on public.repo_links(token);

drop trigger if exists trg_setorg_repo_links on public.repo_links;
create trigger trg_setorg_repo_links before insert on public.repo_links
  for each row execute function public.set_org();

alter table public.repo_links enable row level security;

-- Admin-only, including reads: the row carries a signing secret, and an
-- org-wide read policy would hand it to every employee.
drop policy if exists p_repo_links_w on public.repo_links;
create policy p_repo_links_w on public.repo_links for all to authenticated
  using (is_admin() and org_id = my_org())
  with check (is_admin() and (org_id is null or org_id = my_org()));
drop policy if exists p_repo_links_super on public.repo_links;
create policy p_repo_links_super on public.repo_links for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

grant select, insert, update, delete on public.repo_links to authenticated, service_role;

-- A repo usually belongs to a project rather than to one deployed asset, and
-- "what has the team shipped for this client this month" is the question the
-- activity feed exists to answer.
alter table public.change_events add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.change_events add column if not exists client_id  uuid references public.clients(id)  on delete set null;
alter table public.change_events add column if not exists repo_link_id uuid references public.repo_links(id) on delete set null;
create index if not exists idx_change_events_project on public.change_events(project_id, ts desc);
create index if not exists idx_change_events_client  on public.change_events(client_id, ts desc);
