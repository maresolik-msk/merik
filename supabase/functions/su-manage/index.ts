import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, service);

    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: caller } = await admin.auth.getUser(jwt);
    if (!caller?.user) throw new Error('Not authenticated');
    const { data: prof } = await admin.from('profiles').select('role').eq('id', caller.user.id).single();
    if (!prof || prof.role !== 'superadmin') throw new Error('Only the Merik super admin may manage users');

    const body = await req.json();
    const action = body.action;

    if (action === 'list_users') {
      const { data: profs } = await admin.from('profiles').select('id, role, org_id, employee_id');
      const { data: emps } = await admin.from('employees').select('id, full_name');
      const { data: orgs } = await admin.from('orgs').select('id, name');
      const empName: Record<string, string> = {}; (emps || []).forEach((e) => empName[e.id] = e.full_name);
      const orgName: Record<string, string> = {}; (orgs || []).forEach((o) => orgName[o.id] = o.name);
      const emailById: Record<string, string> = {};
      let page = 1;
      for (;;) {
        const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        (list?.users || []).forEach((u) => emailById[u.id] = u.email || '');
        if (!list || list.users.length < 1000) break; page++;
      }
      const users = (profs || []).map((p) => ({ id: p.id, role: p.role, org_id: p.org_id, org_name: p.org_id ? (orgName[p.org_id] || '') : '', employee: p.employee_id ? empName[p.employee_id] || '' : '', email: emailById[p.id] || '' }));
      return json({ ok: true, users });
    }

    if (action === 'create_user') {
      const { email, password, role, org_id } = body;
      if (!email || !password || password.length < 6) throw new Error('Email and password (min 6 chars) required');
      // superadmin is a Merik product-owner role and must NOT belong to a tenant.
      if (role === 'superadmin' && org_id) throw new Error('Super admin cannot belong to a tenant');
      if (role !== 'superadmin' && !org_id) throw new Error('A tenant account requires a tenant (org_id)');
      let userId: string;
      const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (cErr) {
        const { data: list } = await admin.auth.admin.listUsers();
        const ex = list?.users?.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
        if (!ex) throw cErr;
        userId = ex.id;
        await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
      } else userId = created.user.id;
      await admin.from('profiles').upsert({ id: userId, role: role || 'admin', org_id: org_id || null });
      return json({ ok: true, user_id: userId });
    }

    if (action === 'set_password') {
      const { user_id, password } = body;
      if (!user_id || !password || password.length < 6) throw new Error('user_id and password (min 6 chars) required');
      await admin.auth.admin.updateUserById(user_id, { password });
      return json({ ok: true });
    }

    if (action === 'set_role') {
      const { user_id, role } = body;
      if (!user_id || !role) throw new Error('user_id and role required');
      const { data: target } = await admin.from('profiles').select('org_id').eq('id', user_id).single();
      // A tenant user can only be admin/employee; superadmin is Merik-only (no tenant).
      if (role === 'superadmin' && target?.org_id) throw new Error('A tenant user cannot be made super admin');
      if (role !== 'superadmin' && !target?.org_id) throw new Error('A Merik product-owner account stays super admin');
      await admin.from('profiles').update({ role }).eq('id', user_id);
      return json({ ok: true });
    }

    if (action === 'delete_user') {
      const { user_id } = body;
      if (!user_id) throw new Error('user_id required');
      if (user_id === caller.user.id) throw new Error('You cannot delete your own account');
      // profiles.id references auth.users; deleting the login should take the
      // profile with it, but do it explicitly so a missing cascade cannot leave
      // a profile row pointing at a user that no longer exists.
      await admin.from('profiles').delete().eq('id', user_id);
      await admin.auth.admin.deleteUser(user_id);
      return json({ ok: true });
    }

    // Deleting a tenant is the most destructive thing in the product, and the
    // browser cannot do it correctly: org rows are removed by cascade (see
    // migration 20260810_org_delete_cascade.sql) but auth.users logins are not
    // reachable from any foreign key, so a client-side delete leaves every one
    // of that tenant's people able to sign in to nothing.
    if (action === 'delete_org') {
      const { org_id, confirm_name } = body;
      if (!org_id) throw new Error('org_id required');

      const { data: org, error: oErr } = await admin
        .from('orgs').select('id, name').eq('id', org_id).single();
      if (oErr || !org) throw new Error('Tenant not found');

      // Typed-name confirmation. The client also asks, but the client is not
      // what makes an irreversible delete safe.
      if ((confirm_name || '').trim() !== org.name) {
        throw new Error(`Type the tenant name exactly to confirm: "${org.name}"`);
      }

      // Collect the logins BEFORE the cascade removes their profiles rows.
      const { data: members } = await admin
        .from('profiles').select('id, role').eq('org_id', org_id);
      const memberIds = (members || []).map((m) => m.id);
      if (memberIds.includes(caller.user.id)) {
        throw new Error('You belong to this tenant — refusing to delete your own access');
      }
      // A superadmin has no org, so this should never match. If it somehow does,
      // deleting would lock the product owner out of the control plane.
      if ((members || []).some((m) => m.role === 'superadmin')) {
        throw new Error('This tenant has a superadmin member — resolve that before deleting');
      }

      const { error: dErr } = await admin.from('orgs').delete().eq('id', org_id);
      if (dErr) {
        // Cascade missing => Postgres reports a foreign key violation here.
        throw new Error(
          `Could not delete tenant: ${dErr.message}. ` +
          'If this mentions a foreign key, migration 20260810_org_delete_cascade.sql has not been applied.',
        );
      }

      // Now the logins. Report per-user outcomes rather than failing the whole
      // operation — the tenant's data is already gone at this point.
      const failed: string[] = [];
      for (const id of memberIds) {
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) failed.push(id);
      }

      return json({
        ok: true,
        deleted_org: org.name,
        logins_removed: memberIds.length - failed.length,
        logins_failed: failed,
      });
    }

    throw new Error('Unknown action');
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});

function json(o: unknown) {
  return new Response(JSON.stringify(o), { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
}
