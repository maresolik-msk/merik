-- Merik AI — draft cache + human-feedback capture.
--
-- Two jobs, both prerequisites for AI that gets cheaper and better with use:
--
--   ai_drafts    A cache. Keyed by a hash of the *aggregated* input, so the same
--                employee+month with unchanged task data is generated once and
--                re-served free forever. If the underlying log changes, the hash
--                changes and a fresh draft is generated — invalidation is automatic.
--
--   ai_feedback  The learning signal. What the model drafted vs. what the human
--                actually kept. This is the only place that records whether the
--                output was any good, and it is what later lets us feed accepted
--                examples back into prompts (and eventually harvest patterns into
--                plain code so the AI call disappears entirely).
--
-- Privacy note: ai_feedback stores review text, which is personal data about an
-- identifiable employee. It is org-scoped by RLS and must stay that way — any
-- future cross-tenant learning has to use structural patterns only, never this
-- content.

create table if not exists public.ai_drafts (
  id             uuid primary key default gen_random_uuid(),
  feature        text not null,
  org_id         uuid references public.orgs(id) on delete cascade,
  subject_id     text,                    -- e.g. employee id, for lookup/debug
  period         text,                    -- e.g. '2026-06'
  input_hash     text not null,           -- sha256 of the aggregated prompt input
  draft          jsonb not null,
  model          text,
  input_tokens   integer,
  output_tokens  integer,
  created_at     timestamptz not null default now(),
  unique (org_id, feature, input_hash)
);

create index if not exists ai_drafts_lookup_idx on public.ai_drafts (org_id, feature, input_hash);

create table if not exists public.ai_feedback (
  id             uuid primary key default gen_random_uuid(),
  feature        text not null,
  org_id         uuid references public.orgs(id) on delete cascade,
  draft_id       uuid references public.ai_drafts(id) on delete set null,
  input_hash     text,
  subject_id     text,
  draft_text     text,        -- what the human started from
  final_text     text,        -- what the human actually kept
  edit_distance  integer,     -- how much they changed it (quality signal)
  accepted       boolean,     -- kept essentially as-is
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id)
);

create index if not exists ai_feedback_feature_idx on public.ai_feedback (org_id, feature, created_at desc);

-- Same convention as assets/emp_tasks/software: org_id is stamped server-side
-- from my_org() so the client never supplies it (and can't set someone else's).
drop trigger if exists trg_setorg_ai_feedback on public.ai_feedback;
create trigger trg_setorg_ai_feedback before insert on public.ai_feedback
  for each row execute function public.set_org();

alter table public.ai_drafts   enable row level security;
alter table public.ai_feedback enable row level security;

-- Drafts are written by the gateway (service role, bypasses RLS). Nobody else
-- needs to write them; superadmin can read for inspection.
drop policy if exists ai_drafts_su on public.ai_drafts;
create policy ai_drafts_su on public.ai_drafts
  for select using (public.is_super_admin());

-- Feedback is written by the admin who edited the draft, and stays inside their
-- own org. Superadmin can read across tenants to measure acceptance rates.
drop policy if exists ai_feedback_rw on public.ai_feedback;
create policy ai_feedback_rw on public.ai_feedback
  for all
  using       (public.is_super_admin() or (public.is_admin() and org_id = public.my_org()))
  with check  (public.is_super_admin() or (public.is_admin() and org_id = public.my_org()));
