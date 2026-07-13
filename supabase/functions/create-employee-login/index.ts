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

    // identify caller
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: caller } = await admin.auth.getUser(jwt);
    if (!caller?.user) throw new Error('Not authenticated');
    const { data: prof } = await admin.from('profiles').select('role,org_id').eq('id', caller.user.id).single();
    if (!prof || prof.role !== 'admin') throw new Error('Only admins can create employee logins');

    const { employee_id, password } = await req.json();
    if (!employee_id || !password || password.length < 6) throw new Error('Employee and a password (min 6 chars) are required');

    const { data: emp } = await admin.from('employees').select('id,email,org_id,full_name').eq('id', employee_id).single();
    if (!emp) throw new Error('Employee not found');
    if (emp.org_id !== prof.org_id) throw new Error('Employee belongs to a different company');
    if (!emp.email) throw new Error('Set an email for this employee first (Edit employee)');

    const { data: nu, error: cErr } = await admin.auth.admin.createUser({
      email: emp.email, password, email_confirm: true,
    });
    let userId: string;
    if (cErr) {
      // Likely already registered — reuse the existing account and reset the password
      // instead, so "resend credentials" works for employees who already have a login.
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((u) => (u.email || '').toLowerCase() === emp.email!.toLowerCase());
      if (!existing) throw cErr;
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    } else {
      userId = nu.user.id;
    }
    await admin.from('profiles').upsert({ id: userId, role: 'employee', employee_id: emp.id, org_id: emp.org_id });

    return new Response(JSON.stringify({ ok: true, email: emp.email }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
