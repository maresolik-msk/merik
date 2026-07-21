-- Merik AI control plane.
--
-- Design notes:
--   - The Anthropic API key is NOT stored here. It lives only in the `ai` edge
--     function's ANTHROPIC_API_KEY secret. Nothing in Postgres can read it, so a
--     DB compromise never leaks it. These tables hold *policy* only: whether AI
--     runs, for which features, for which tenants.
--   - Every AI call is gated by three checks, all evaluated server-side in the
--     edge function: global kill switch -> per-feature flag -> per-org grant.
--   - ai_settings is a singleton (id is fixed). Merik runs one central key, so
--     one row of policy is all we need.

-- ---------------------------------------------------------------------------
-- Global policy (singleton)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_settings (
  id                  boolean primary key default true,
  -- Master kill switch. False => the gateway refuses every request, whatever
  -- the per-feature or per-org state says.
  enabled             boolean not null default false,
  -- Per-feature flags. A feature absent from this map is treated as OFF.
  features            jsonb   not null default '{
                        "performance_summary": false,
                        "quote_draft": false,
                        "task_time_suggest": false
                      }'::jsonb,
  model               text    not null default 'claude-opus-4-8',
  -- Spend guard: hard ceiling on billed AI calls per org per calendar month.
  -- The gateway counts ai_usage rows and refuses past this.
  monthly_call_cap    integer not null default 2000,
  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users(id),
  constraint ai_settings_singleton check (id)
);

insert into public.ai_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Per-tenant grant. No row => that org has no AI, fail closed.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_org_access (
  org_id      uuid primary key references public.orgs(id) on delete cascade,
  enabled     boolean not null default false,
  granted_at  timestamptz not null default now(),
  granted_by  uuid references auth.users(id)
);

-- ---------------------------------------------------------------------------
-- Usage log. Drives the spend cap and gives superadmin an audit trail of who
-- generated what. Prompt/output text is deliberately NOT stored -- this is HR
-- data and the log is a billing artifact, not a transcript store.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid references public.orgs(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete set null,
  feature        text not null,
  model          text,
  input_tokens   integer,
  output_tokens  integer,
  ok             boolean not null default true,
  error          text,
  created_at     timestamptz not null default now()
);

create index if not exists ai_usage_org_month_idx on public.ai_usage (org_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.ai_settings   enable row level security;
alter table public.ai_org_access enable row level security;
alter table public.ai_usage      enable row level security;

-- Policy is superadmin-only, read and write. Tenants never see the control
-- plane; the gateway reads it with the service role.
drop policy if exists ai_settings_su on public.ai_settings;
create policy ai_settings_su on public.ai_settings
  for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists ai_org_access_su on public.ai_org_access;
create policy ai_org_access_su on public.ai_org_access
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Usage: superadmin sees everything; a tenant admin sees only their own org's
-- rows (so they can see their own consumption) and can never write.
drop policy if exists ai_usage_su on public.ai_usage;
create policy ai_usage_su on public.ai_usage
  for select using (public.is_super_admin() or (public.is_admin() and org_id = public.my_org()));

-- Writes come exclusively from the gateway via the service role, which bypasses
-- RLS. No insert/update policy for anon or authenticated: nobody can forge or
-- erase usage rows to escape the spend cap.
