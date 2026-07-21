-- Merik AI — multi-provider key store.
--
-- The superadmin adds API keys for any provider (Anthropic/Claude, OpenAI/ChatGPT,
-- Google/Gemini, xAI/Grok, or a custom OpenAI-compatible endpoint) from their
-- dashboard. Keys are entered in the UI, so they must live in the database — but
-- the *plaintext* key never does. The `ai` edge function encrypts each key with
-- AES-GCM using a master key held only in its AI_ENCRYPTION_KEY secret, and stores
-- just the ciphertext here. A DB dump alone cannot recover a key without that
-- secret. The dashboard only ever reads the masked last-4, never the ciphertext.

create table if not exists public.ai_provider_keys (
  id           uuid primary key default gen_random_uuid(),
  -- 'anthropic' | 'openai' | 'google' | 'xai' | 'custom'
  provider     text not null,
  label        text,                         -- friendly name shown in the UI
  key_cipher   text not null,                -- AES-GCM ciphertext (iv:ct, base64), written by the edge fn only
  key_last4    text,                          -- last 4 chars, for display
  model        text,                          -- default model for this key (e.g. gpt-4o, gemini-2.0-flash)
  base_url     text,                          -- for provider='custom' (OpenAI-compatible endpoint)
  enabled      boolean not null default true,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id)
);

-- Which stored key the gateway uses. Nulls until the superadmin picks one.
alter table public.ai_settings
  add column if not exists active_key_id uuid references public.ai_provider_keys(id) on delete set null;

-- RLS: superadmin-only. The edge function uses the service role (bypasses RLS) to
-- read key_cipher for decryption; no one else can. The dashboard reads this table
-- directly but must select only non-secret columns (id, provider, label, model,
-- base_url, enabled, key_last4) — never key_cipher. Even if it did, ciphertext is
-- useless without the edge function's master key.
alter table public.ai_provider_keys enable row level security;

drop policy if exists ai_provider_keys_su on public.ai_provider_keys;
create policy ai_provider_keys_su on public.ai_provider_keys
  for all using (public.is_super_admin()) with check (public.is_super_admin());
