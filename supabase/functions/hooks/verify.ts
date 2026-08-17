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
  /** Everything the activity feed groups or counts by. */
  meta?: Record<string, unknown>;
}

/** `refs/heads/main` -> `main`. Tags and anything unexpected pass through as-is. */
const shortRef = (ref: unknown): string | null =>
  typeof ref === 'string' ? ref.replace(/^refs\/(heads|tags)\//, '') : null;

/**
 * A GitHub push.
 *
 * The head commit is the one that shipped, but the count and branch matter for
 * an activity feed — "12 commits to main" reads very differently from one, and
 * a push to a feature branch is not a release.
 */
export function parseGithubPush(body: Record<string, unknown>): ParsedChange | null {
  const head = (body.head_commit ?? null) as
    | { id?: string; message?: string; url?: string; author?: { username?: string; name?: string } }
    | null;
  // A branch delete, or a push whose commits are all merges GitHub folds away.
  if (!head?.id) return null;

  const commits = Array.isArray(body.commits) ? body.commits.length : 1;
  const repo = (body.repository ?? {}) as { full_name?: string };
  const branch = shortRef(body.ref);

  return {
    kind: 'commit',
    ref: String(head.id).slice(0, 12),
    // First line only: a commit body can be paragraphs, and this goes in a list.
    title: (head.message ?? '').split('\n')[0].slice(0, 200) || null,
    url: head.url ?? null,
    actor: head.author?.username ?? head.author?.name ??
      (body.pusher as { name?: string })?.name ?? null,
    host: null,
    meta: { repo: repo.full_name ?? null, branch, commits },
  };
}

/**
 * A pull request opening or merging.
 *
 * Closed-without-merge is deliberately not recorded: abandoned work is not
 * development activity anyone wants counted, and it would inflate the feed with
 * things that never shipped.
 */
export function parseGithubPullRequest(body: Record<string, unknown>): ParsedChange | null {
  const action = String(body.action ?? '');
  const pr = (body.pull_request ?? {}) as {
    number?: number;
    title?: string;
    html_url?: string;
    merged?: boolean;
    merged_by?: { login?: string };
    user?: { login?: string };
    base?: { ref?: string };
    additions?: number;
    deletions?: number;
    changed_files?: number;
  };
  if (!pr.number) return null;

  const merged = action === 'closed' && pr.merged === true;
  if (action !== 'opened' && !merged) return null;

  const repo = (body.repository ?? {}) as { full_name?: string };
  return {
    kind: merged ? 'pr_merged' : 'pr_opened',
    ref: `#${pr.number}`,
    title: (pr.title ?? '').slice(0, 200) || null,
    url: pr.html_url ?? null,
    actor: (merged ? pr.merged_by?.login : pr.user?.login) ?? pr.user?.login ?? null,
    host: null,
    meta: {
      repo: repo.full_name ?? null,
      branch: pr.base?.ref ?? null,
      additions: pr.additions ?? null,
      deletions: pr.deletions ?? null,
      changed_files: pr.changed_files ?? null,
    },
  };
}

/**
 * Route by GitHub's event header rather than guessing from the body. Without
 * this a pull_request payload was fed to the push parser, found no head_commit,
 * and was silently dropped.
 */
export function parseGithubEvent(
  event: string | null,
  body: Record<string, unknown>,
): ParsedChange | null {
  if (event === 'push') return parseGithubPush(body);
  if (event === 'pull_request') return parseGithubPullRequest(body);
  // ping, stars, issues, everything else: accepted and ignored, so GitHub does
  // not retry them forever.
  return null;
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
