// Standard Webhooks signature verification for the Auth "Send Email" hook.
//
// Split out from index.ts for the same reason as hooks/verify.ts: this is the
// only thing stopping anyone who learns the function URL from making Merik send
// mail to any address, with any link, from our own Gmail account.
//
// Scheme: HMAC-SHA256 over "id.timestamp.body", keyed with the base64 secret.
// Hand-rolled on Web Crypto rather than adding a dependency for twenty lines.

// A signature older than this is a replay, not a slow network.
export const MAX_SKEW_SECONDS = 300;

/** Compare without leaking, through timing, how much of the digest matched. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The configured secret arrives as "v1,whsec_<base64>"; the key is the base64.
 * Built into a fresh Uint8Array rather than via Uint8Array.from, whose
 * ArrayBufferLike backing does not satisfy crypto.subtle's BufferSource.
 */
export function secretKeyBytes(secret: string) {
  const bin = atob(secret.replace(/^v\d+,/, "").replace(/^whsec_/, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function expectedSignature(
  secret: string,
  id: string,
  timestamp: string,
  body: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    secretKeyBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  return btoa(String.fromCharCode(...new Uint8Array(mac)));
}

/**
 * Throws unless `headers` carry a fresh, correct signature over `raw`.
 * `now` is injectable so the skew rule can be tested without waiting.
 */
export async function verifySignature(
  secret: string,
  headers: Headers,
  raw: string,
  now: number = Date.now(),
): Promise<void> {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !ts || !sigHeader) throw new Error("Missing webhook signature headers");

  const age = Math.abs(Math.floor(now / 1000) - Number(ts));
  if (!Number.isFinite(age) || age > MAX_SKEW_SECONDS) throw new Error("Webhook timestamp outside tolerance");

  const expected = await expectedSignature(secret, id, ts, raw);
  // The header carries one or more space-separated "v1,<sig>" versions, so the
  // secret can be rotated without dropping mail during the changeover.
  const ok = sigHeader.split(" ").some((part) => timingSafeEqual(part.split(",")[1] || "", expected));
  if (!ok) throw new Error("Webhook signature mismatch");
}
