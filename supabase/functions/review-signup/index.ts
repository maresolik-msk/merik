import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Best-effort welcome email — approval must succeed even if SMTP is misconfigured
// or the send fails, so this never throws.
async function sendWelcomeEmail(to: string, companyName: string, password: string) {
  try {
    const user = Deno.env.get('SMTP_USER');
    const pass = Deno.env.get('SMTP_PASS');
    if (!user || !pass) return;
    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get('SMTP_HOST') || 'smtp.gmail.com',
        port: Number(Deno.env.get('SMTP_PORT') || '465'),
        tls: true,
        auth: { username: user, password: pass },
      },
    });
    await client.send({
      from: Deno.env.get('SMTP_FROM') || user,
      to,
      subject: `Your Merik workspace for ${companyName} is ready`,
      html: `<p>Hi,</p><p>Your company workspace <b>${companyName}</b> has been approved and is ready to use.</p>
        <table cellpadding="6"><tr><td>Sign in at</td><td><a href="https://www.merik.in/app/">https://www.merik.in/app/</a></td></tr>
        <tr><td>Email</td><td><b>${to}</b></td></tr>
        <tr><td>Password</td><td><b>${password}</b></td></tr></table>
        <p>We recommend changing your password after your first sign-in.</p>`,
    });
    await client.close();
  } catch {
    // never block approval on a notification failure
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, service);

    // Only the Merik super admin may review signups.
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: caller } = await admin.auth.getUser(jwt);
    if (!caller?.user) throw new Error('Not authenticated');
    const { data: prof } = await admin.from('profiles').select('role').eq('id', caller.user.id).single();
    if (!prof || prof.role !== 'superadmin') throw new Error('Only the Merik super admin can review signups');

    const { request_id, action, password, notes } = await req.json();
    if (!request_id) throw new Error('request_id is required');

    const { data: rq } = await admin.from('signup_requests').select('*').eq('id', request_id).single();
    if (!rq) throw new Error('Signup request not found');
    if (rq.status !== 'Pending') throw new Error('This request has already been ' + rq.status.toLowerCase());

    if (action === 'reject') {
      await admin.from('signup_requests').update({ status: 'Rejected', review_notes: notes || null, reviewed_at: new Date().toISOString() }).eq('id', request_id);
      return new Response(JSON.stringify({ ok: true, status: 'Rejected' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    if (action === 'approve') {
      if (!password || password.length < 6) throw new Error('A password (min 6 chars) is required to approve');

      // Reuse an existing auth user with this email if present, otherwise create one.
      let userId: string | null = null;
      const { data: created, error: cErr } = await admin.auth.admin.createUser({ email: rq.email, password, email_confirm: true });
      if (cErr) {
        // Likely already registered — find and reset their password instead.
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list?.users?.find((u) => (u.email || '').toLowerCase() === rq.email.toLowerCase());
        if (!existing) throw cErr;
        userId = existing.id;
        await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
      } else {
        userId = created.user.id;
      }

      // Create the company workspace and make this account its admin.
      const { data: org, error: oErr } = await admin.from('orgs').insert({ name: rq.company_name }).select('id').single();
      if (oErr) throw oErr;
      await admin.from('profiles').upsert({ id: userId, role: 'admin', org_id: org.id, employee_id: null });

      await admin.from('signup_requests').update({ status: 'Approved', reviewed_at: new Date().toISOString(), created_org_id: org.id, review_notes: notes || null }).eq('id', request_id);

      await sendWelcomeEmail(rq.email, rq.company_name, password);

      return new Response(JSON.stringify({ ok: true, status: 'Approved', email: rq.email, org_id: org.id }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    throw new Error('Unknown action');
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
