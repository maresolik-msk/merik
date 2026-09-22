import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { REPLY_TO, textOf } from '../_shared/mail.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Best-effort welcome email — approval must succeed even if SMTP is misconfigured
// or the send fails, so this never throws. Design: docs/DESIGN_SYSTEM.md (option B).
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const APP = 'https://www.merik.in/app/';
const F = "font-family:Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const LABEL = 'font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#767B85';
const step = (n: number, t: string, d: string) =>
  `<tr><td style="padding:0 0 14px;vertical-align:top;width:34px"><div style="width:26px;height:26px;border-radius:50%;background:#F0EEE9;color:#CA3934;font-size:12px;font-weight:700;text-align:center;line-height:26px">${n}</div></td><td style="padding:0 0 14px;font-size:14px;line-height:1.5;color:#41454E"><b style="color:#110101">${t}</b><br>${d}</td></tr>`;

export function welcomeHtml(name: string, company: string, email: string, password: string): string {
  const co = esc(company), first = esc((name || '').trim().split(/\s+/)[0] || 'there');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EEE9"><tr><td align="center" style="padding:32px 20px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;${F};color:#110101;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#CA3934;padding:18px 28px"><img src="https://www.merik.in/assets/images/wordmark-badge.png" alt="Merik" width="112" height="35" style="display:block"></td></tr>
<tr><td style="padding:30px 28px 0;font-size:23px;font-weight:700;letter-spacing:-.4px;line-height:1.25">Welcome to Merik, ${first}.</td></tr>
<tr><td style="padding:10px 28px 22px;font-size:15px;line-height:1.6;color:#41454E">Your workspace for <b style="color:#110101">${co}</b> is set up and you are its admin. Here is your first sign-in.</td></tr>
<tr><td style="padding:0 28px 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EEE9;border-radius:10px"><tr><td style="padding:18px 20px">
<div style="${LABEL}">Email</div><div style="font-size:15px;margin:3px 0 14px">${esc(email)}</div>
<div style="${LABEL}">Temporary password</div><div style="font-size:22px;font-weight:600;font-family:'SF Mono',Menlo,Consolas,monospace;letter-spacing:.04em;margin:3px 0 0">${esc(password)}</div>
</td></tr></table></td></tr>
<tr><td style="padding:0 28px 28px"><a href="${APP}" style="display:inline-block;background:#CA3934;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">Sign in at www.merik.in/app</a></td></tr>
<tr><td style="padding:22px 28px 6px;${LABEL};border-top:1px solid #E6E2DA">Your first 15 minutes</td></tr>
<tr><td style="padding:8px 28px 6px"><table role="presentation" cellpadding="0" cellspacing="0">
${step(1, 'Change your password', 'Profile menu, top of the sidebar. Takes a minute.')}
${step(2, 'Turn on only what you need', 'Settings &rsaquo; Modules. Pick "Attendance + daily tasks" to start simple, or "Everything".')}
${step(3, 'Add your team', 'Employees &rsaquo; Add. Each person gets their own login by email.')}
</table></td></tr>
<tr><td style="padding:10px 28px 28px;font-size:13px;line-height:1.6;color:#767B85">Stuck anywhere? Reply to this email, a person answers. This password is temporary and this email shouldn't be forwarded.</td></tr>
</table>
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%"><tr><td style="padding:16px 8px 0;font-size:12px;color:#767B85;${F}">Merik &middot; sent to ${esc(email)} because ${co} requested a workspace.</td></tr></table>
</td></tr></table>`;
}

async function sendWelcomeEmail(to: string, companyName: string, password: string, contactName: string) {
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
      replyTo: REPLY_TO,
      subject: `Welcome to Merik: your ${companyName} admin login`,
      content: textOf(welcomeHtml(contactName, companyName, to, password)),
      html: welcomeHtml(contactName, companyName, to, password),
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

      await sendWelcomeEmail(rq.email, rq.company_name, password, rq.contact_name);

      return new Response(JSON.stringify({ ok: true, status: 'Approved', email: rq.email, org_id: org.id }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    throw new Error('Unknown action');
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
