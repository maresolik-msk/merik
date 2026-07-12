// Merik — Notify Lead Edge Function (Deno)
// Called from the public marketing site right after a signup_requests insert,
// so the Merik team hears about a new lead immediately instead of having to
// check the Signup Requests page.
//
// Deliberately anon-callable (verify_jwt: false) since marketing-site visitors
// are not authenticated. Safe because the destination is hardcoded to the
// Merik owner inbox — this can never be used to email an arbitrary address.
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const clean = (v: unknown, max = 500) => String(v ?? '').slice(0, max).trim();

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
        <tr><td>Company</td><td><b>${company}</b></td></tr>
        <tr><td>Contact</td><td>${contact}</td></tr>
        <tr><td>Email</td><td>${email}</td></tr>
        <tr><td>Phone</td><td>${phone || '—'}</td></tr>
        <tr><td>Message</td><td>${message || '—'}</td></tr></table>
        <p>Review it in Merik under Signup Requests.</p>`,
    });
    await client.close();

    return json({ ok: true });
  } catch (e) {
    // Never let a notification failure look like an error to the visitor.
    return json({ ok: false, error: (e as Error).message }, 200);
  }
});
