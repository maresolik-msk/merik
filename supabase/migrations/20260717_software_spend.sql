-- Pay-as-you-go software: usage-based services (AWS, Supabase, MongoDB, Google
-- AI Studio) don't have a fixed per-cycle price, seats you buy, or a renewal
-- date — they bill on usage and the amount changes every month.
--
-- Modelling:
--   * software.billing_cycle gains a third value, 'Pay as you go'. It is a plain
--     text column with no check constraint, so no DDL is needed for that — the
--     UI simply offers the extra option and branches on it.
--   * For those services a single software.cost can never be right, so the real
--     amount billed is logged per month here. The UI hides seats/cost/renewal
--     for them and uses the latest logged month as their monthly cost instead.
--   * software_seats is reused as "who has console access" for these services
--     (no seat cap, no over-allocation warning) — which is what matters for
--     offboarding.

create table if not exists public.software_spend (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references public.orgs(id),
  software_id uuid not null references public.software(id) on delete cascade,
  spend_month date not null,          -- always the 1st of the month it covers
  amount      numeric not null,       -- actual amount billed that month
  notes       text,
  created_at  timestamptz default now(),
  unique (software_id, spend_month)
);
create index if not exists idx_software_spend_sw on public.software_spend(software_id, spend_month desc);

drop trigger if exists trg_setorg_software_spend on public.software_spend;
create trigger trg_setorg_software_spend before insert on public.software_spend
  for each row execute function public.set_org();

alter table public.software_spend enable row level security;

-- Admin-only, matching the rest of the asset module (no org-wide read policy).
drop policy if exists p_software_spend_w on public.software_spend;
create policy p_software_spend_w on public.software_spend for all to authenticated
  using (is_admin() and org_id = my_org())
  with check (is_admin() and (org_id is null or org_id = my_org()));
drop policy if exists p_software_spend_super on public.software_spend;
create policy p_software_spend_super on public.software_spend for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

grant select, insert, update, delete on public.software_spend to authenticated, service_role;
