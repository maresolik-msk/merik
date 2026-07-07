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
      await admin.from('profiles').update({ role }).eq('id', user_id);
      return json({ ok: true });
    }

    if (action === 'delete_user') {
      const { user_id } = body;
      if (!user_id) throw new Error('user_id required');
      if (user_id === caller.user.id) throw new Error('You cannot delete your own account');
      await admin.auth.admin.deleteUser(user_id);
      return json({ ok: true });
    }

    throw new Error('Unknown action');
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});

function json(o: unknown) {
  return new Response(JSON.stringify(o), { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
}
