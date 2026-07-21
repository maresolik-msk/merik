// Merik — AI Gateway Edge Function (Deno)
//
// The single entry point for every AI feature in Merik, across every provider.
// Nothing else in the product talks to an LLM.
//
// Providers: anthropic (Claude), openai (ChatGPT/GPT), google (Gemini),
// xai (Grok), and custom (any OpenAI-compatible endpoint). The superadmin adds
// keys from the dashboard; this function encrypts and stores them, and routes
// each request to whichever provider is active.
//
// Security model:
//   - Provider API keys are entered in the dashboard, so they live in the DB —
//     but ONLY as AES-GCM ciphertext. The master key is the AI_ENCRYPTION_KEY
//     secret, held only here. A DB dump can't recover a key without it.
//   - The caller sends IDs, never data. This function fetches the underlying
//     records itself, scoped to the caller's own org, so a tenant can never get
//     a summary of another tenant's employees by passing a foreign id.
//   - Four fail-closed gates on every feature call: global kill switch ->
//     per-feature flag -> per-org grant -> monthly cap.
//   - Key management (save/delete/activate) is superadmin-only.
//   - Output is advisory. Performance and quote drafts are returned for a human
//     to edit and approve; this function writes nothing to any business table.
//
// Required env (Supabase -> Edge Functions -> ai -> Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (provided automatically)
//   AI_ENCRYPTION_KEY   any high-entropy secret string — the master key for
//                       encrypting provider keys (hashed to a 32-byte AES key).
//                       Generate one with: openssl rand -base64 32
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PROVIDERS = new Set(["anthropic", "openai", "google", "xai", "custom"]);

/** Feature actions and who may call them. Key-management actions are handled separately (superadmin-only). */
const FEATURES: Record<string, { adminOnly: boolean }> = {
  performance_summary: { adminOnly: true },
  quote_draft: { adminOnly: true },
  task_time_suggest: { adminOnly: false },
};

// ---------------------------------------------------------------------------
// Encryption (AES-GCM, master key from AI_ENCRYPTION_KEY)
// ---------------------------------------------------------------------------
async function masterKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("AI_ENCRYPTION_KEY");
  if (!secret) throw new Error("AI is not configured — the AI_ENCRYPTION_KEY secret is not set");
  // Derive a 32-byte AES key by hashing the secret, so ANY value works — no
  // base64 or length rules to get wrong when pasting into the dashboard. Use a
  // high-entropy value (e.g. `openssl rand -base64 32`).
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
async function encryptSecret(plaintext: string): Promise<string> {
  const key = await masterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext)));
  return btoa(String.fromCharCode(...iv)) + ":" + btoa(String.fromCharCode(...ct));
}
async function decryptSecret(stored: string): Promise<string> {
  const key = await masterKey();
  const [ivb, ctb] = stored.split(":");
  const iv = Uint8Array.from(atob(ivb), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(ctb), (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// ---------------------------------------------------------------------------
// Provider-agnostic LLM call. Returns parsed JSON + best-effort token usage.
// ---------------------------------------------------------------------------
type ProviderCfg = { provider: string; apiKey: string; model: string; base_url?: string | null };

function stripFences(text: string): string {
  const t = text.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return (m ? m[1] : t).trim();
}

async function callLLM(cfg: ProviderCfg, opts: { system: string; user: string; maxTokens: number }) {
  const { system, user, maxTokens } = opts;
  // A uniform instruction so every provider returns bare JSON we can parse.
  const sys = system + "\n\nRespond with ONLY a single valid JSON object. No prose, no markdown, no code fences.";

  if (cfg.provider === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, system: sys, messages: [{ role: "user", content: user }] }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(`Claude: ${d?.error?.message || r.statusText}`);
    const text = (d.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    return { json: JSON.parse(stripFences(text)), usage: { input_tokens: d.usage?.input_tokens ?? 0, output_tokens: d.usage?.output_tokens ?? 0 } };
  }

  if (cfg.provider === "google") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: user }] }],
        systemInstruction: { parts: [{ text: sys }] },
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: maxTokens },
      }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(`Gemini: ${d?.error?.message || r.statusText}`);
    const text = (d.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
    return {
      json: JSON.parse(stripFences(text)),
      usage: { input_tokens: d.usageMetadata?.promptTokenCount ?? 0, output_tokens: d.usageMetadata?.candidatesTokenCount ?? 0 },
    };
  }

  // openai, xai, and custom all speak the OpenAI chat-completions shape.
  const base =
    cfg.provider === "openai" ? "https://api.openai.com/v1"
    : cfg.provider === "xai" ? "https://api.x.ai/v1"
    : (cfg.base_url || "").replace(/\/+$/, "");
  if (!base) throw new Error("Custom provider needs a base URL");
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`${cfg.provider}: ${d?.error?.message || r.statusText}`);
  const text = d.choices?.[0]?.message?.content || "";
  return { json: JSON.parse(stripFences(text)), usage: { input_tokens: d.usage?.prompt_tokens ?? 0, output_tokens: d.usage?.completion_tokens ?? 0 } };
}

/** Load the active provider key, decrypt it, and return a ready-to-use config. */
async function activeProvider(admin: ReturnType<typeof createClient>, settings: any): Promise<ProviderCfg> {
  if (!settings.active_key_id) throw new Error("No AI provider is configured — add a key in AI Control and set it active");
  const { data: k } = await admin.from("ai_provider_keys").select("*").eq("id", settings.active_key_id).maybeSingle();
  if (!k) throw new Error("The active AI provider key no longer exists — pick another in AI Control");
  if (!k.enabled) throw new Error("The active AI provider key is disabled");
  if (!k.model) throw new Error(`No model set for the active ${k.provider} key`);
  return { provider: k.provider, apiKey: await decryptSecret(k.key_cipher), model: k.model, base_url: k.base_url };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  let feature = "unknown";
  let orgId: string | null = null;
  let userId: string | null = null;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const action = String(body.action || "");

    // --- Who is calling? -----------------------------------------------------
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: caller } = await admin.auth.getUser(jwt);
    if (!caller?.user) throw new Error("Not authenticated");
    userId = caller.user.id;
    const { data: profile } = await admin.from("profiles").select("role, org_id, employee_id").eq("id", userId).maybeSingle();
    if (!profile) throw new Error("No profile for this user");
    const isSuper = profile.role === "superadmin";
    const isAdmin = isSuper || profile.role === "admin";

    // === Superadmin: key management + health (no feature gates) ==============
    if (action === "health") {
      if (!isSuper) throw new Error("Superadmin only");
      const { count } = await admin.from("ai_provider_keys").select("id", { count: "exact", head: true }).eq("enabled", true);
      return json({ ok: true, encryption_configured: Boolean(Deno.env.get("AI_ENCRYPTION_KEY")), keys: count ?? 0 });
    }
    if (action === "save_key") {
      if (!isSuper) throw new Error("Superadmin only");
      const provider = String(body.provider || "");
      const key = String(body.key || "").trim();
      if (!PROVIDERS.has(provider)) throw new Error("Unknown provider");
      if (!key) throw new Error("A key is required");
      if (provider === "custom" && !String(body.base_url || "").trim()) throw new Error("Custom provider needs a base URL");
      const row = {
        provider,
        label: String(body.label || "").trim() || null,
        key_cipher: await encryptSecret(key),
        key_last4: key.slice(-4),
        model: String(body.model || "").trim() || null,
        base_url: provider === "custom" ? String(body.base_url || "").trim() : null,
        created_by: userId,
      };
      const { data: ins, error } = await admin.from("ai_provider_keys").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      // First key added becomes active automatically.
      const { data: s } = await admin.from("ai_settings").select("active_key_id").eq("id", true).maybeSingle();
      if (s && !s.active_key_id) await admin.from("ai_settings").update({ active_key_id: ins.id }).eq("id", true);
      return json({ ok: true, id: ins.id, masked: "····" + row.key_last4 });
    }
    if (action === "delete_key") {
      if (!isSuper) throw new Error("Superadmin only");
      const { error } = await admin.from("ai_provider_keys").delete().eq("id", String(body.id || ""));
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }
    if (action === "set_active") {
      if (!isSuper) throw new Error("Superadmin only");
      const { error } = await admin.from("ai_settings").update({ active_key_id: String(body.id || "") || null }).eq("id", true);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    // === Feature actions (fully gated) ======================================
    const spec = FEATURES[action];
    if (!spec) throw new Error(`Unknown action: ${action}`);
    feature = action;
    if (spec.adminOnly && !isAdmin) throw new Error("This AI feature is available to admins only");

    orgId = profile.org_id;
    if (!orgId) throw new Error("AI features run inside a workspace; this account has none");

    const { data: settings } = await admin
      .from("ai_settings").select("enabled, features, monthly_call_cap, active_key_id").eq("id", true).maybeSingle();
    if (!settings?.enabled) throw new Error("AI is currently switched off for Merik");
    if (settings.features?.[action] !== true) throw new Error(`The ${action.replace(/_/g, " ")} feature is switched off`);

    const { data: access } = await admin.from("ai_org_access").select("enabled").eq("org_id", orgId).maybeSingle();
    if (!access?.enabled) throw new Error("AI is not enabled for this workspace");

    const monthStart = new Date();
    monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
    const { count } = await admin.from("ai_usage").select("id", { count: "exact", head: true })
      .eq("org_id", orgId).eq("ok", true).gte("created_at", monthStart.toISOString());
    if ((count ?? 0) >= settings.monthly_call_cap) throw new Error("This workspace has reached its monthly AI limit");

    const cfg = await activeProvider(admin, settings);

    let result: unknown;
    let usage = { input_tokens: 0, output_tokens: 0 };
    if (action === "performance_summary") ({ result, usage } = await performanceSummary(admin, cfg, orgId, body));
    else if (action === "quote_draft") ({ result, usage } = await quoteDraft(admin, cfg, orgId, body));
    else ({ result, usage } = await taskTimeSuggest(admin, cfg, orgId, profile, body));

    await admin.from("ai_usage").insert({
      org_id: orgId, user_id: userId, feature, model: `${cfg.provider}:${cfg.model}`,
      input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, ok: true,
    });
    return json({ ok: true, ...(result as object) });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (orgId) {
      await admin.from("ai_usage").insert({ org_id: orgId, user_id: userId, feature, ok: false, error: message.slice(0, 500) });
    }
    return json({ ok: false, error: message }, 400);
  }
});

// ---------------------------------------------------------------------------
// Feature: performance summary — cites the dates behind every point; draft only.
// ---------------------------------------------------------------------------
async function performanceSummary(admin: ReturnType<typeof createClient>, cfg: ProviderCfg, orgId: string, body: any) {
  const employeeId = String(body.employee_id || "");
  const month = String(body.month || "");
  if (!employeeId || !/^\d{4}-\d{2}$/.test(month)) throw new Error("employee_id and month (YYYY-MM) are required");

  const { data: employee } = await admin.from("employees")
    .select("id, full_name, designation, department, doj").eq("id", employeeId).eq("org_id", orgId).maybeSingle();
  if (!employee) throw new Error("Employee not found in this workspace");

  const from = `${month}-01`;
  const to = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).toISOString().slice(0, 10);
  const { data: tasks } = await admin.from("task_updates")
    .select("upd_date, project, task_assigned, completed, blocker, next_task, update_status, tasks")
    .eq("employee_id", employeeId).eq("org_id", orgId).gte("upd_date", from).lte("upd_date", to).order("upd_date");
  const { data: attendance } = await admin.from("attendance")
    .select("att_date, status").eq("employee_id", employeeId).eq("org_id", orgId).gte("att_date", from).lte("att_date", to);
  if (!tasks?.length) throw new Error("No task log for this employee in that month — nothing to summarise");

  const present = (attendance || []).filter((a: any) => a.status === "Present").length;
  const system = `You are drafting a monthly performance review for a manager to edit and approve. You are not the decision-maker.
Rules:
- Ground every statement in the task log you are given. Cite the specific dates (YYYY-MM-DD) that support each point.
- If the log is thin or ambiguous, say so plainly rather than inflating it.
- Do not infer attitude, motivation, or personality. You can see what work was logged and when — nothing about the person.
- Never recommend firing, promotion, or pay changes. Describe the work; the manager decides.
Return JSON with exactly these keys: summary (string), strengths (array of {point, evidence_dates:[string]}), gaps (array of {point, evidence_dates:[string]}), blockers_raised (array of string), evidence_quality ("strong"|"adequate"|"thin").`;
  const user = JSON.stringify({
    employee: { name: employee.full_name, designation: employee.designation, department: employee.department },
    month, attendance: { days_present: present, days_recorded: (attendance || []).length }, task_log: tasks,
  });

  const { json: draft, usage } = await callLLM(cfg, { system, user, maxTokens: 4000 });
  return { result: { draft, employee: employee.full_name, month, source_rows: tasks.length }, usage };
}

// ---------------------------------------------------------------------------
// Feature: quote draft — line items priced against the client's past quotes.
// ---------------------------------------------------------------------------
async function quoteDraft(admin: ReturnType<typeof createClient>, cfg: ProviderCfg, orgId: string, body: any) {
  const brief = String(body.brief || "").trim();
  if (!brief) throw new Error("A brief is required");
  if (brief.length > 8000) throw new Error("Brief is too long (8000 characters max)");

  let clientName: string | null = null;
  let history: unknown[] = [];
  if (body.client_id) {
    const { data: client } = await admin.from("clients").select("id, name").eq("id", String(body.client_id)).eq("org_id", orgId).maybeSingle();
    if (!client) throw new Error("Client not found in this workspace");
    clientName = client.name;
    const { data: past } = await admin.from("quotes")
      .select("quote_no, quote_date, items, subtotal, tax_pct").eq("client_id", client.id).eq("org_id", orgId)
      .order("quote_date", { ascending: false }).limit(5);
    history = past || [];
  }

  const system = `You draft quote line items from a project brief, for a human to price-check and send.
Rules:
- Base rates on the past quotes provided. If there is no comparable past line, set unit_price to 0 and flag it in assumptions rather than inventing a number.
- Only include work the brief actually asks for.
- List every assumption you made.
- Totals are computed by the app — give unit quantities and prices only.
Return JSON with exactly these keys: items (array of {description, qty:number, unit_price:number, basis:string}), assumptions (array of string), questions_for_client (array of string).`;
  const user = JSON.stringify({ client: clientName, brief, past_quotes: history });
  const { json: draft, usage } = await callLLM(cfg, { system, user, maxTokens: 4000 });
  return { result: { draft, client: clientName }, usage };
}

// ---------------------------------------------------------------------------
// Feature: task time suggestion — from the caller's OWN history only.
// ---------------------------------------------------------------------------
async function taskTimeSuggest(admin: ReturnType<typeof createClient>, cfg: ProviderCfg, orgId: string, profile: any, body: any) {
  const task = String(body.task || "").trim();
  if (!task) throw new Error("A task description is required");
  if (!profile.employee_id) throw new Error("No employee record linked to this account");

  const { data: past } = await admin.from("task_updates")
    .select("upd_date, task_assigned, completed, tasks").eq("employee_id", profile.employee_id).eq("org_id", orgId)
    .order("upd_date", { ascending: false }).limit(60);
  if (!past?.length) throw new Error("No task history yet — an estimate needs a few weeks of logged work first");

  const system = `You estimate how long a task will take, based only on this specific person's own logged history.
Rules:
- Anchor on comparable past tasks. Cite them.
- If nothing is comparable, say so and return low confidence.
- This is a starting suggestion the person will adjust. Do not be falsely precise.
Return JSON with exactly these keys: estimated_minutes (integer), confidence ("high"|"medium"|"low"), basis (string).`;
  const user = JSON.stringify({ new_task: task, my_history: past });
  const { json: suggestion, usage } = await callLLM(cfg, { system, user, maxTokens: 1500 });
  return { result: { suggestion }, usage };
}
