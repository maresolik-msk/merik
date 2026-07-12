// Merik — Send Email Edge Function (Deno)
// Sends transactional/notification email via SMTP (configured for Gmail).
//
// Security model:
//   - Caller must be an authenticated admin or superadmin.
//   - A tenant admin may only email an address that belongs to an employee in
//     their OWN org, so this function can't be used as an open spam relay.
//   - The Gmail App Password lives only in the SMTP_PASS env secret, never here.
//
// Required env (set in Supabase → Edge Functions → send-email → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (provided automatically)
//   SMTP_HOST      smtp.gmail.com
//   SMTP_PORT      465
//   SMTP_USER      merik.msk@gmail.com
//   SMTP_PASS      <16-char Gmail App Password>
//   SMTP_FROM      Merik <merik.msk@gmail.com>
//
// Request body: { to: string, subject: string, html?: string, text?: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);

    // --- Authenticate + authorize the caller ---
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: caller } = await admin.auth.getUser(jwt);
    if (!caller?.user) throw new Error("Not authenticated");
    const { data: prof } = await admin
      .from("profiles").select("role, org_id").eq("id", caller.user.id).single();
    if (!prof || !["admin", "superadmin"].includes(prof.role)) {
      throw new Error("Only an admin may send email");
    }

    // --- Validate the payload ---
    const { to, subject, html, text } = await req.json();
    if (typeof to !== "string" || !EMAIL_RE.test(to)) throw new Error("Valid 'to' email required");
    if (typeof subject !== "string" || !subject.trim()) throw new Error("'subject' required");
    if (!html && !text) throw new Error("'html' or 'text' body required");

    // --- Anti-abuse: tenant admins can only email their own org's employees ---
    if (prof.role !== "superadmin") {
      const { data: emp } = await admin
        .from("employees").select("id").eq("org_id", prof.org_id).ilike("email", to).maybeSingle();
      if (!emp) throw new Error("Recipient must be an employee in your organization");
    }

    // --- Send via SMTP ---
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
      subject,
      content: text || undefined,
      html: html || undefined,
    });
    await client.close();

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
