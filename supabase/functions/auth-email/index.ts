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
import { verifySignature } from "./verify.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Subject and lead line per Auth action. Anything unlisted still gets a working
// link under the neutral wording, so a new Supabase action type degrades to a
// plain confirmation instead of an exception.
const COPY: Record<string, { subject: string; heading: string; lead: string; cta: string }> = {
  recovery: {
    subject: "Reset your Merik password",
    heading: "Reset your password",
    lead: "We got a request to reset the password on your Merik account. Click below to choose a new one.",
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

function template(heading: string, lead: string, cta: string, link: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1b1b1f">
  <img src="https://www.merik.in/assets/images/wordmark.png" alt="Merik" width="102" height="24" style="display:block;margin-bottom:28px">
  <h1 style="font-size:20px;margin:0 0 12px">${heading}</h1>
  <p style="font-size:15px;line-height:1.6;color:#55555f;margin:0 0 24px">${lead}</p>
  <a href="${link}" style="display:inline-block;background:#D93A31;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px">${cta}</a>
  <p style="font-size:13px;line-height:1.6;color:#8a8a94;margin:26px 0 0">If the button doesn't work, paste this into your browser:<br>
    <a href="${link}" style="color:#D93A31;word-break:break-all">${link}</a></p>
  <p style="font-size:13px;line-height:1.6;color:#8a8a94;margin:18px 0 0">If you didn't ask for this, you can ignore this email — nothing changes until the link is used.</p>
</div>`;
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
      ? template("Confirm it's you", `Enter this code to continue: <b style="font-size:20px">${email_data.token}</b>`, "", "")
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
    return json({ error: { http_code: 500, message: `auth-email: ${message}` } });
  }
});
