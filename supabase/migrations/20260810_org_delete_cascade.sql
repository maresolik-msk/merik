-- Make deleting a tenant actually possible.
--
-- Symptom: the super admin's "Delete tenant" did nothing. suDelTenant() ran
-- `delete from orgs where id = ?` from the browser, and Postgres refused it.
--
-- Cause: foreign keys pointing at orgs(id) were created without an ON DELETE
-- action, which means NO ACTION — the delete is blocked while any child row
-- exists. Six are visible in this repo (assets, asset_assignments, software,
-- software_seats, software_spend, emp_tasks); the base schema was created in
-- the Supabase dashboard and is not in version control, so there are almost
-- certainly more.
--
-- Rather than list tables we cannot see, this reads pg_constraint and rewrites
-- every FK that references public.orgs to ON DELETE CASCADE. That covers the
-- base schema too, and it stays correct if new tables are added before this
-- migration is applied.
--
-- After this, `delete from orgs where id = ?` removes the tenant's rows in one
-- statement. It does NOT remove that tenant's auth.users logins — no foreign
-- key can reach auth.users from here. That is handled by the su-manage edge
-- function's delete_org action, which collects the user ids first.

do $$
declare
  r   record;
  def text;
begin
  for r in
    select c.conname,
           c.conrelid::regclass::text as tbl,
           pg_get_constraintdef(c.oid)  as cdef
    from pg_constraint c
    join pg_class     ref on ref.oid = c.confrelid
    join pg_namespace n   on n.oid   = ref.relnamespace
    where c.contype  = 'f'
      and ref.relname = 'orgs'
      and n.nspname   = 'public'
      and c.confdeltype <> 'c'          -- 'c' = already ON DELETE CASCADE
  loop
    def := r.cdef;
    if def ~ 'ON DELETE' then
      def := regexp_replace(def, 'ON DELETE [A-Z ]+', 'ON DELETE CASCADE');
    else
      def := def || ' ON DELETE CASCADE';
    end if;

    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add  constraint %I %s', r.tbl, r.conname, def);
    raise notice 'org FK now cascades: % (%)', r.tbl, r.conname;
  end loop;
end $$;

-- Deleting a tenant is a super-admin-only act. The edge function runs as the
-- service role and bypasses RLS, so this policy is not what makes deletion
-- work — it exists so the capability is declared in the schema rather than
-- resting entirely on one function being the only caller.
do $$
begin
  if exists (select 1 from pg_policies
             where schemaname = 'public' and tablename = 'orgs'
               and policyname = 'superadmin_delete_orgs') then
    drop policy superadmin_delete_orgs on public.orgs;
  end if;
  create policy superadmin_delete_orgs on public.orgs
    for delete using (public.is_super_admin());
exception
  when undefined_function then
    raise notice 'is_super_admin() not found — skipping orgs delete policy';
end $$;
