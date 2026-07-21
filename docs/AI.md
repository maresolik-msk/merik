# Merik AI

All AI in Merik runs through one edge function (`supabase/functions/ai`). Nothing
else in the product talks to an LLM. The superadmin controls the whole surface —
providers, keys, and settings — from **AI Control** in their dashboard (the
`suai()` page in `app/index.html`).

Multi-provider: the superadmin adds a key for **any** provider — Anthropic
(Claude), OpenAI (ChatGPT), Google (Gemini), xAI (Grok), or a custom
OpenAI-compatible endpoint — and picks which one is active. Every AI request
routes to the active provider.

## Architecture

```
app/index.html (suai) ──► edge fn `ai` ──► active provider (Claude / GPT / Gemini / Grok / custom)
        (session JWT)         │
                              ├─ gate 1: ai_settings.enabled         (master switch)
                              ├─ gate 2: ai_settings.features[f]     (per feature)
                              ├─ gate 3: ai_org_access.enabled       (per tenant)
                              ├─ gate 4: monthly_call_cap            (per tenant/month)
                              ├─ active_key_id → ai_provider_keys → decrypt → call
                              └─ logs ai_usage
```

Every gate fails closed. A tenant with no `ai_org_access` row gets nothing; with
no active provider key, all features refuse.

## Provider keys

Keys are **entered in the dashboard**, so they live in the DB — but only as
**AES-GCM ciphertext**. The `ai` edge function encrypts each key with a master key
held in its `AI_ENCRYPTION_KEY` secret and stores just the ciphertext + last-4 in
`ai_provider_keys`. The dashboard only ever reads the masked `····last4`; the
plaintext key is never stored and never returned. A DB dump alone can't recover a
key without the edge secret.

Set the master encryption key once:

```bash
AI_ENCRYPTION_KEY=$(openssl rand -base64 32)      # 32 random bytes, base64
supabase secrets set AI_ENCRYPTION_KEY="$AI_ENCRYPTION_KEY"
supabase functions deploy ai
```

Then in **AI Control → Provider keys → Add key**: pick the provider, paste the
key, set the model (e.g. `claude-opus-4-8`, `gpt-4o`, `gemini-2.0-flash`,
`grok-2-latest`), and Save. The first key added becomes active automatically; use
**Use** to switch the active provider.

> ⚠️ Losing `AI_ENCRYPTION_KEY` makes every stored key undecryptable — you'd
> re-add them. Keep it backed up in your secret manager. Rotating it means
> re-adding keys.

## Migrations

```bash
supabase db push   # applies 20260716_ai_control_plane.sql + 20260717_ai_provider_keys.sql
```

- `ai_settings` — singleton policy (master switch, per-feature flags, spend cap, `active_key_id`)
- `ai_org_access` — per-tenant grant (no row = no AI)
- `ai_usage` — audit + spend cap (service-role write only, so the cap can't be forged around)
- `ai_provider_keys` — encrypted provider keys (superadmin-only RLS; ciphertext never exposed)

AI ships **off**: master switch off, every feature off, no tenant granted, no keys.

## Features

| Action | Who | What |
|---|---|---|
| `performance_summary` | admin | Drafts a monthly review from an employee's task log + attendance. Cites the dates behind every point. **Draft only.** |
| `quote_draft` | admin | Brief → line items, priced against that client's past quotes. Flags every assumption. |
| `task_time_suggest` | any employee | Estimate from the caller's **own** history. Note: Task Insights already has a free built-in estimator (`predictTime()`); leave this off unless it clearly beats it. |
| `save_key` / `delete_key` / `set_active` / `health` | superadmin | Key management. `save_key` encrypts; the others manage state. |

## Tenant isolation

The caller sends IDs, never data. The gateway fetches the underlying rows itself
with `.eq("org_id", orgId)` from the caller's own profile — so a foreign
`employee_id` returns "not found in this workspace", never another tenant's data.
This is the single most important property to preserve if you add an action.

## Adding a provider

`callLLM(cfg, {system, user, maxTokens})` in the edge function routes by
`cfg.provider`. Anthropic and Google have bespoke branches; openai/xai/custom
share the OpenAI chat-completions shape. To add a provider: add it to the
`PROVIDERS` set, add a `callLLM` branch (or reuse the OpenAI-compatible path with
a base URL), and add it to `AI_PROVIDERS` in `app/index.html`'s `suai()`.

## What is not AI, on purpose

Attendance anomalies, leave balances, and payroll are rules and SQL —
deterministic and auditable. Do not route them here.

## HR safety

Performance drafts describe logged work and cite dates. They never recommend
firing, promotion, or pay changes, and never infer attitude — the model sees what
was logged and when, nothing about the person. The UI pre-fills an editable box:
the reviewer's words are what get saved. `ai_usage` stores no prompt/output text —
it's a billing/audit artifact, not a transcript store.
