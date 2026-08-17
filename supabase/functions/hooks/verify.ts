// Webhook signature verification.
//
// This is the security boundary for an endpoint that is unauthenticated by
// necessity — GitHub and Vercel will not carry a Merik session — and that writes
// rows other code later shows to a human as evidence about an outage. Without a
// valid signature, anyone could post a fabricated "Priya deployed this 3 minutes
// before your checkout broke".
//
// So: verify first, parse second, and never trust a field in the body to decide
// which tenant the event belongs to.

/** Constant-time compare. A fast `!==` leaks how much of a guess was right. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const hex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
}

/**
 * GitHub sends `x-hub-signature-256: sha256=<hex hmac of the raw body>`.
 * The raw body matters — re-serialising the JSON changes the bytes and the
 * signature will never match.
 */
export async function verifyGithub(
  rawBody: string,
  header: string | null,
  secret: string,
): Promise<boolean> {
  if (!header?.startsWith('sha256=')) return false;
  const expected = await hmacSha256Hex(secret, rawBody);
  return timingSafeEqual(header.slice(7).toLowerCase(), expected);
}

/** Vercel sends `x-vercel-signature: <hex hmac>` with no prefix. */
export async function verifyVercel(
  rawBody: string,
  header: string | null,
  secret: string,
): Promise<boolean> {
  if (!header) return false;
  const expected = await hmacSha256Hex(secret, rawBody);
  return timingSafeEqual(header.toLowerCase(), expected);
}

// ------------------------------------------------------------- event shapes ---

export interface ParsedChange {
  kind: string;
  ref: string | null;
  title: string | null;
  url: string | null;
  actor: string | null;
  /** Host the change affects, used to find the asset it belongs to. */
  host: string | null;
}

/** A GitHub push: the head commit is the one that shipped. */
export function parseGithubPush(body: Record<string, unknown>): ParsedChange | null {
  const head = (body.head_commit ?? null) as
    | { id?: string; message?: string; url?: string; author?: { username?: string; name?: string } }
    | null;
  if (!head?.id) return null;
  return {
    kind: 'commit',
    ref: String(head.id).slice(0, 12),
    // First line only: a commit body can be paragraphs, and this goes in a list.
    title: (head.message ?? '').split('\n')[0].slice(0, 200) || null,
    url: head.url ?? null,
    actor: head.author?.username ?? head.author?.name ?? null,
    host: null,
  };
}

/**
 * Vercel deployment events. Only a successful, production deployment is a change
 * worth correlating — a preview build cannot take a client's site down, and a
 * failed one never shipped.
 */
export function parseVercelDeployment(body: Record<string, unknown>): ParsedChange | null {
  const type = String(body.type ?? '');
  if (type !== 'deployment.succeeded' && type !== 'deployment-ready') return null;

  const payload = (body.payload ?? {}) as Record<string, unknown>;
  const deployment = (payload.deployment ?? {}) as Record<string, unknown>;
  const target = String(payload.target ?? deployment.target ?? '');
  if (target && target !== 'production') return null;

  const url = typeof deployment.url === 'string' ? deployment.url : null;
  return {
    kind: 'deployment',
    ref: typeof deployment.id === 'string' ? deployment.id.slice(0, 24) : null,
    title: typeof deployment.name === 'string' ? deployment.name : null,
    url: url ? `https://${url}` : null,
    actor: typeof (payload.user as { username?: string })?.username === 'string'
      ? (payload.user as { username?: string }).username!
      : null,
    // Alias host if given, so the event can find its asset by URL.
    host: typeof payload.alias === 'string'
      ? payload.alias
      : Array.isArray(payload.alias) && typeof payload.alias[0] === 'string'
      ? payload.alias[0] as string
      : null,
  };
}
