-- Product pulse and adoption: what users think, and where they stall.
--
-- product_pulse: one rating (1-5) and an optional line, asked from inside the
-- app at a few moments in a workspace's life. Rows carry who, which workspace,
-- which page and which prompt, so a person is never asked the same question
-- twice on any device (they can read back their own answers).
--
-- product_usage: page opens per workspace, role, page and day. Written only
-- through report_product_usage(), which attributes counts to the caller's own
-- workspace; the client sends page names and numbers, nothing else. From this
-- the Merik team can see modules switched on but never opened, employees with
-- logins who never act, and workspaces gone quiet.

create table if not exists public.product_pulse (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references public.orgs(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  role       text,
  score      int  not null check (score between 1 and 5),
  comment    text,
  page       text,
  trigger    text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_pulse_org  on public.product_pulse (org_id, created_at desc);
create index if not exists idx_product_pulse_user on public.product_pulse (user_id);
drop trigger if exists trg_setorg_product_pulse on public.product_pulse;
create trigger trg_setorg_product_pulse before insert on public.product_pulse
  for each row execute function public.set_org();
alter table public.product_pulse enable row level security;
drop policy if exists p_pulse_own_i on public.product_pulse;
create policy p_pulse_own_i on public.product_pulse for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists p_pulse_own_r on public.product_pulse;
create policy p_pulse_own_r on public.product_pulse for select to authenticated
  using (user_id = auth.uid());
drop policy if exists p_pulse_super on public.product_pulse;
create policy p_pulse_super on public.product_pulse for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
grant select, insert on public.product_pulse to authenticated;
grant all on public.product_pulse to service_role;

create table if not exists public.product_usage (
  org_id uuid not null references public.orgs(id) on delete cascade,
  role   text not null,
  view   text not null,
  day    date not null default current_date,
  count  int  not null default 0,
  primary key (org_id, role, view, day)
);
alter table public.product_usage enable row level security;
drop policy if exists p_usage_super on public.product_usage;
create policy p_usage_super on public.product_usage for select to authenticated
  using (public.is_super_admin());
grant select on public.product_usage to authenticated;
grant all on public.product_usage to service_role;

-- The caller's workspace and role come from their own profile, never from the
-- payload. No workspace (a superadmin, or no profile) counts nothing.
create or replace function public.report_product_usage(p_rows jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_role text; n int;
begin
  select p.org_id, p.role into v_org, v_role from public.profiles p where p.id = auth.uid();
  if not found or v_org is null then return 0; end if;
  insert into public.product_usage (org_id, role, view, day, count)
  select v_org, v_role, left(r.view, 40), current_date,
         least(sum(greatest(coalesce(r.n, 1), 1)), 500)::int
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(view text, n int)
   where r.view is not null
   group by r.view
   limit 60
  on conflict (org_id, role, view, day)
  do update set count = product_usage.count + excluded.count;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.report_product_usage(jsonb) from public, anon;
grant execute on function public.report_product_usage(jsonb) to authenticated;

-- Keep 400 days of usage; the pulse rows are few and kept.
do $$
begin
  perform cron.schedule('merik-product-usage-retention', '37 3 * * *',
    $cron$ delete from public.product_usage where day < current_date - 400 $cron$);
exception when others then
  raise notice 'pg_cron not available; skipping usage retention';
end $$;
