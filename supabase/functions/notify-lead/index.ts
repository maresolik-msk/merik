// Merik — Notify Lead Edge Function (Deno)
// Called from the public marketing site right after a signup_requests insert,
// so the Merik team hears about a new lead immediately instead of having to
// check the Signup Requests page.
//
// Also sends the lead an acknowledgement saying what happens next.
//
// Deliberately anon-callable (verify_jwt: false) since marketing-site visitors
// are not authenticated. The team mail goes to a hardcoded inbox; the
// acknowledgement goes only to an address that has a signup_requests row from
// the last ten minutes, so this cannot be used to email arbitrary addresses.
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { REPLY_TO, textOf } from '../_shared/mail.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const clean = (v: unknown, max = 500) => String(v ?? '').slice(0, max).trim();
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// Same frame as the credentials and auth emails (docs/DESIGN_SYSTEM.md).
const F = "font-family:Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const LABEL = 'font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#767B85';
const step = (n: number, t: string, d: string) =>
  `<tr><td style="padding:0 0 14px;vertical-align:top;width:34px"><div style="width:26px;height:26px;border-radius:50%;background:#F0EEE9;color:#CA3934;font-size:12px;font-weight:700;text-align:center;line-height:26px">${n}</div></td><td style="padding:0 0 14px;font-size:14px;line-height:1.5;color:#41454E"><b style="color:#110101">${t}</b><br>${d}</td></tr>`;

export function ackHtml(contact: string, company: string, email: string): string {
  const co = esc(company), first = esc(contact.split(/\s+/)[0] || 'there'), em = esc(email);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EEE9"><tr><td align="center" style="padding:32px 20px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;${F};color:#110101;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#CA3934;padding:18px 28px"><img src="https://www.merik.in/assets/images/wordmark-badge.png" alt="Merik" width="112" height="35" style="display:block"></td></tr>
<tr><td style="padding:30px 28px 0;font-size:23px;font-weight:700;letter-spacing:-.4px;line-height:1.25">Thanks, ${first}. We have your request.</td></tr>
<tr><td style="padding:10px 28px 22px;font-size:15px;line-height:1.6;color:#41454E">You asked for a Merik workspace for <b style="color:#110101">${co}</b>. Nothing to do on your side for now. Here is what happens next.</td></tr>
<tr><td style="padding:0 28px 6px;${LABEL}">What happens next</td></tr>
<tr><td style="padding:8px 28px 6px"><table role="presentation" cellpadding="0" cellspacing="0">
${step(1, 'A person reads your request', 'Usually within one working day. If anything is unclear we reply to this email.')}
${step(2, 'We set up your workspace', `${co} gets its own space. No card, nothing to install.`)}
${step(3, 'Your admin login lands in this inbox', `Email and a temporary password, sent to ${em}.`)}
</table></td></tr>
<tr><td style="padding:12px 28px 0;font-size:15px;line-height:1.6;color:#41454E">Meanwhile, see what your team will be using:</td></tr>
<tr><td style="padding:14px 28px 28px"><a href="https://www.merik.in/how-it-works.html" style="display:inline-block;background:#CA3934;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">See how Merik works</a></td></tr>
<tr><td style="padding:0 28px 28px;font-size:13px;line-height:1.6;color:#767B85;border-top:1px solid #E6E2DA;padding-top:18px">Have a question already? Reply to this email.</td></tr>
</table>
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%"><tr><td style="padding:16px 8px 0;font-size:12px;color:#767B85;${F}">Merik &middot; sent to ${em} because this address was used to request access on www.merik.in. Not you? Ignore this and nothing will be created.</td></tr></table>
</td></tr></table>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const company = clean(body.company_name, 200) || '(no company given)';
    const contact = clean(body.contact_name, 200) || '(no name given)';
    const email = clean(body.email, 200);
    const phone = clean(body.phone, 50);
    const message = clean(body.message, 2000);

    const user = Deno.env.get('SMTP_USER');
    const pass = Deno.env.get('SMTP_PASS');
    if (!user || !pass) return json({ ok: false, error: 'SMTP not configured' }, 200); // don't block the lead form on this

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
      to: 'merik.msk@gmail.com',
      subject: `New lead: ${company}`,
      html: `<p>New signup request from the website.</p><table cellpadding="6">
        <tr><td>Company</td><td><b>${esc(company)}</b></td></tr>
        <tr><td>Contact</td><td>${esc(contact)}</td></tr>
        <tr><td>Email</td><td>${esc(email)}</td></tr>
        <tr><td>Phone</td><td>${esc(phone) || '-'}</td></tr>
        <tr><td>Message</td><td>${esc(message).replace(/\n/g, '<br>') || '-'}</td></tr></table>
        <p>Review it in Merik under Signup Requests.</p>`,
    });

    // Acknowledge the lead, but only an address that really just requested access.
    if (email) {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const since = new Date(Date.now() - 10 * 60_000).toISOString();
      const { data: rq } = await admin.from('signup_requests').select('id').eq('email', email).gte('created_at', since).limit(1);
      if (rq?.length) {
        await client.send({
          from: Deno.env.get('SMTP_FROM') || user,
          to: email,
          replyTo: REPLY_TO,
          subject: `We got your request for ${company}`,
          content: textOf(ackHtml(contact, company, email)),
          html: ackHtml(contact, company, email),
        });
      }
    }
    await client.close();

    return json({ ok: true });
  } catch (e) {
    // Never let a notification failure look like an error to the visitor.
    return json({ ok: false, error: (e as Error).message }, 200);
  }
});
