// Merik — Auth Email Hook (Deno).
//
// Supabase Auth's own SMTP client could not talk to Gmail (every recovery mail
// came back 500 "Error sending recovery email"), while send-email has been
// delivering through the same server for months. Rather than get a second,
// pickier mail client working, Auth now calls this function and we send the
// mail with denomailer — the client already proven against this account.
//
// Configure at Authentication → Hooks → "Send Email hook":
//   URI     https://<ref>.supabase.co/functions/v1/auth-email
//   Secret  generated there, then set as SEND_EMAIL_HOOK_SECRET below.
//
// Deploy with verify_jwt = false: the caller is Supabase Auth, which presents
// the webhook signature below rather than a user session.
//
// Required env (Supabase → Edge Functions → auth-email → Secrets):
//   SEND_EMAIL_HOOK_SECRET   v1,whsec_…  from the hook config
//   SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM   same values as send-email
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifySignature } from "./verify.ts";
import { serverReport } from "../_shared/report.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Subject and lead line per Auth action. Anything unlisted still gets a working
// link under the neutral wording, so a new Supabase action type degrades to a
// plain confirmation instead of an exception.
const COPY: Record<string, { subject: string; heading: string; lead: string; cta: string }> = {
  recovery: {
    subject: "Reset your Merik password",
    heading: "Reset your password",
    lead: "Someone asked to reset the password on your Merik account. If that was you, choose a new one below. If not, your password stays as it is.",
    cta: "Set a new password",
  },
  signup: {
    subject: "Confirm your Merik email",
    heading: "Confirm your email",
    lead: "Welcome to Merik. Confirm this address to finish setting up your account.",
    cta: "Confirm email",
  },
  invite: {
    subject: "You've been invited to Merik",
    heading: "You've been invited",
    lead: "You've been invited to a Merik workspace. Click below to set your password and sign in.",
    cta: "Accept invitation",
  },
  magiclink: {
    subject: "Your Merik sign-in link",
    heading: "Sign in to Merik",
    lead: "Click below to sign in. The link works once and expires shortly.",
    cta: "Sign in",
  },
  email_change: {
    subject: "Confirm your new Merik email",
    heading: "Confirm your new email",
    lead: "Confirm this address to finish changing the email on your Merik account.",
    cta: "Confirm email",
  },
};

const FALLBACK = {
  subject: "Confirm your Merik request",
  heading: "Confirm your request",
  lead: "Click below to confirm this request on your Merik account.",
  cta: "Confirm",
};

// Same frame as the credentials emails in review-signup (docs/DESIGN_SYSTEM.md):
// Cloud Dancer ground, white card, red brand row. An empty link means "no
// button" (the reauthentication code is typed back into the app instead).
export function template(heading: string, lead: string, cta: string, link: string): string {
  const F = "font-family:Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
  const action = link
    ? `<tr><td style="padding:0 28px 26px"><a href="${link}" style="display:inline-block;background:#CA3934;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">${cta}</a></td></tr>
<tr><td style="padding:0 28px 8px;font-size:13px;line-height:1.6;color:#767B85">If the button doesn't work, paste this into your browser:<br><a href="${link}" style="color:#CA3934;word-break:break-all">${link}</a></td></tr>
<tr><td style="padding:10px 28px 28px;font-size:13px;line-height:1.6;color:#767B85">Didn't ask for this? Ignore this email. Nothing changes until the link is used.</td></tr>`
    : `<tr><td style="padding:0 28px 28px;font-size:13px;line-height:1.6;color:#767B85">Didn't ask for this? Ignore this email and the code will expire on its own.</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EEE9"><tr><td align="center" style="padding:32px 20px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;${F};color:#110101;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#CA3934;padding:18px 28px"><img src="https://www.merik.in/assets/images/wordmark-badge.png" alt="Merik" width="112" height="35" style="display:block"></td></tr>
<tr><td style="padding:30px 28px 0;font-size:23px;font-weight:700;letter-spacing:-.4px;line-height:1.25">${heading}</td></tr>
<tr><td style="padding:10px 28px 24px;font-size:15px;line-height:1.6;color:#41454E">${lead}</td></tr>
${action}
</table>
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%"><tr><td style="padding:16px 8px 0;font-size:12px;color:#767B85;${F}">Merik &middot; www.merik.in</td></tr></table>
</td></tr></table>`;
}

Deno.serve(async (req) => {
  try {
    const raw = await req.text();

    const secret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
    if (!secret) throw new Error("SEND_EMAIL_HOOK_SECRET is not set");
    await verifySignature(secret, req.headers, raw);

    const { user, email_data } = JSON.parse(raw);
    const to = user?.email;
    if (!to) throw new Error("Payload carried no user email");

    const action = String(email_data?.email_action_type || "");
    const copy = COPY[action] || FALLBACK;

    // Auth hands over a token hash, not a finished URL — the clickable link is
    // always the project's own /auth/v1/verify, which redeems it and then
    // forwards to redirect_to.
    const base = Deno.env.get("SUPABASE_URL")!;
    const redirect = email_data?.redirect_to || `${email_data?.site_url || ""}`;
    const link = `${base}/auth/v1/verify?token=${encodeURIComponent(email_data.token_hash)}` +
      `&type=${encodeURIComponent(action)}` +
      (redirect ? `&redirect_to=${encodeURIComponent(redirect)}` : "");

    // Reauthentication is a 6-digit code typed back into the app, not a link.
    const html = action === "reauthentication"
      ? template("Confirm it's you", `Enter this code in Merik to continue:<br><b style="font-size:26px;letter-spacing:.12em;font-family:'SF Mono',Menlo,Consolas,monospace">${email_data.token}</b>`, "", "")
      : template(copy.heading, copy.lead, copy.cta, link);

    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST") || "smtp.gmail.com",
        port: Number(Deno.env.get("SMTP_PORT") || "465"),
        tls: true,
        auth: {
          username: Deno.env.get("SMTP_USER")!,
          password: Deno.env.get("SMTP_PASS")!,
        },
      },
    });
    await client.send({
      from: Deno.env.get("SMTP_FROM") || Deno.env.get("SMTP_USER")!,
      to,
      subject: copy.subject,
      html,
    });
    await client.close();

    return json({});
  } catch (e) {
    // Auth hooks report failure IN BAND: HTTP 200 carrying an error object. A
    // non-2xx status is swallowed as "Unexpected status code returned from
    // hook", which loses the only sentence that says what actually broke.
    const message = (e as Error).message;
    console.error("auth-email:", message);
    // A failing auth hook is the highest-stakes silent failure in the product:
    // nobody can sign in and nobody can reset a password, and the only trace is
    // a log line in a dashboard nobody is subscribed to. Record it where it gets
    // read — built here rather than at module scope, and wrapped, because an
    // exception on the way to reporting an exception would take out sign-in for
    // everybody to no purpose.
    try {
      const url = Deno.env.get("SUPABASE_URL");
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (url && key) {
        await serverReport(createClient(url, key), {
          kind: "error", message, source: "auth-email:send",
        });
      }
    } catch (_) { /* reporting never gets to break the hook */ }
    return json({ error: { http_code: 500, message: `auth-email: ${message}` } });
  }
});
