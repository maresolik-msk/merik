-- Asset management: company hardware (laptops, tools) and software subscriptions.
--
-- Scope decisions:
--   * Hardware is a pure inventory — no purchase cost / warranty fields.
--   * Software subscriptions are owned by a team (department); cost, billing
--     cycle and renewal date are tracked. Individual employees hold seats.
--   * Full assignment history for hardware — who held what, and when.
--   * Admin-only. Employees get no self-service view, so unlike clients/projects
--     these tables deliberately have NO org-wide read policy: only is_admin()
--     (own org) and is_super_admin() can read or write.
--
-- Conventions copied from the existing schema:
--   org_id uuid -> orgs(id) (NO ACTION), set on insert by the set_org() trigger;
--   employee_id -> employees(id) ON DELETE CASCADE / SET NULL as appropriate.

-- ---------------------------------------------------------------- hardware ---
create table if not exists public.assets (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references public.orgs(id),
  name        text not null,
  category    text not null default 'Laptop',   -- Laptop | Desktop | Monitor | Phone | Tool | Other
  serial_no   text,
  status      text not null default 'Available',-- Available | In Use | Repair | Retired
  assigned_to uuid references public.employees(id) on delete set null,
  notes       text,
  created_at  timestamptz default now()
);
create index if not exists idx_assets_org      on public.assets(org_id);
create index if not exists idx_assets_assigned on public.assets(assigned_to);

-- Assignment history. The currently-open holding is the row with returned_on IS
-- NULL; assets.assigned_to mirrors it for cheap listing/filtering.
create table if not exists public.asset_assignments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references public.orgs(id),
  asset_id    uuid not null references public.assets(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  assigned_on date not null default current_date,
  returned_on date,
  notes       text,
  created_at  timestamptz default now()
);
create index if not exists idx_asset_assign_asset on public.asset_assignments(asset_id);
create index if not exists idx_asset_assign_open  on public.asset_assignments(asset_id) where returned_on is null;

-- ---------------------------------------------------------------- software ---
create table if not exists public.software (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references public.orgs(id),
  name          text not null,
  vendor        text,
  department    text,                            -- owning team, free text like employees.department
  seats         integer,                         -- total seats purchased
  cost          numeric,                         -- cost per billing cycle
  billing_cycle text not null default 'Monthly', -- Monthly | Annual
  renewal_date  date,
  status        text not null default 'Active',  -- Active | Cancelled
  notes         text,
  created_at    timestamptz default now()
);
create index if not exists idx_software_org on public.software(org_id);

-- Which employees currently hold a seat on a subscription.
create table if not exists public.software_seats (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references public.orgs(id),
  software_id uuid not null references public.software(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (software_id, employee_id)
);
create index if not exists idx_software_seats_sw  on public.software_seats(software_id);
create index if not exists idx_software_seats_emp on public.software_seats(employee_id);

-- ------------------------------------------------------ org stamping + RLS ---
drop trigger if exists trg_setorg_assets on public.assets;
create trigger trg_setorg_assets            before insert on public.assets            for each row execute function public.set_org();
drop trigger if exists trg_setorg_asset_assignments on public.asset_assignments;
create trigger trg_setorg_asset_assignments before insert on public.asset_assignments for each row execute function public.set_org();
drop trigger if exists trg_setorg_software on public.software;
create trigger trg_setorg_software          before insert on public.software          for each row execute function public.set_org();
drop trigger if exists trg_setorg_software_seats on public.software_seats;
create trigger trg_setorg_software_seats    before insert on public.software_seats    for each row execute function public.set_org();

alter table public.assets            enable row level security;
alter table public.asset_assignments enable row level security;
alter table public.software          enable row level security;
alter table public.software_seats    enable row level security;

-- Admin of the owning org: full access. No org-wide SELECT policy — asset data
-- is admin-only by design.
drop policy if exists p_assets_w on public.assets;
create policy p_assets_w on public.assets for all to authenticated
  using (is_admin() and org_id = my_org())
  with check (is_admin() and (org_id is null or org_id = my_org()));
drop policy if exists p_assets_super on public.assets;
create policy p_assets_super on public.assets for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

drop policy if exists p_asset_assign_w on public.asset_assignments;
create policy p_asset_assign_w on public.asset_assignments for all to authenticated
  using (is_admin() and org_id = my_org())
  with check (is_admin() and (org_id is null or org_id = my_org()));
drop policy if exists p_asset_assign_super on public.asset_assignments;
create policy p_asset_assign_super on public.asset_assignments for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

drop policy if exists p_software_w on public.software;
create policy p_software_w on public.software for all to authenticated
  using (is_admin() and org_id = my_org())
  with check (is_admin() and (org_id is null or org_id = my_org()));
drop policy if exists p_software_super on public.software;
create policy p_software_super on public.software for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

drop policy if exists p_software_seats_w on public.software_seats;
create policy p_software_seats_w on public.software_seats for all to authenticated
  using (is_admin() and org_id = my_org())
  with check (is_admin() and (org_id is null or org_id = my_org()));
drop policy if exists p_software_seats_super on public.software_seats;
create policy p_software_seats_super on public.software_seats for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

-- Table privileges mirror the rest of public.* (RLS above does the real gating).
grant select, insert, update, delete on public.assets            to authenticated, service_role;
grant select, insert, update, delete on public.asset_assignments to authenticated, service_role;
grant select, insert, update, delete on public.software          to authenticated, service_role;
grant select, insert, update, delete on public.software_seats    to authenticated, service_role;
