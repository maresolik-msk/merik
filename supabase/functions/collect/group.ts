// Turning a browser's noise into rows worth keeping.
//
// Two jobs, both of which have to happen on this side of the wire because the
// sender is a script running on someone else's website and nothing it claims can
// be trusted:
//
//   1. Redaction. The SDK is careful (see merik.js), but "the client already
//      stripped it" is not a security model. Anything that looks like a token,
//      a key, an email address or a query string is removed here, before it is
//      stored, because a monitoring database quietly accumulating other
//      people's session tokens is a breach waiting for a reason.
//   2. Grouping. One broken deploy is tens of thousands of identical errors. A
//      fingerprint over the *shape* of the message — ids, numbers and paths
//      normalised away — turns "user 4821 not found" and "user 9317 not found"
//      into one row with a counter, which is both the storage design and the
//      only way "18× the usual hour" means anything.

export type ErrorKind = 'error' | 'rejection' | 'network' | 'resource';
export const KINDS: ErrorKind[] = ['error', 'rejection', 'network', 'resource'];

/** Hard caps. A public endpoint gets what it is given, not what it expects. */
export const MAX_EVENTS = 50;
export const MAX_MESSAGE = 300;
export const MAX_URL = 300;

export interface RawEvent {
  kind?: unknown;
  message?: unknown;
  source?: unknown;
  page?: unknown;
}

export interface GroupedError {
  fingerprint: string;
  kind: ErrorKind;
  count: number;
  message: string;
  source: string | null;
  page: string | null;
  browser: string | null;
}

const REDACTIONS: Array<[RegExp, string]> = [
  // Anything after a query string or fragment: the most common way a session
  // token, a search term or an email ends up in an error message.
  [/([?#])[^\s"']*/g, '$1…'],
  [/\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/g, '<email>'],
  // Bearer tokens, JWTs, and the long opaque strings that are always a secret.
  [/\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.?[A-Za-z0-9_-]*/g, '<jwt>'],
  // The scheme form first: "Authorization: Bearer sk_live_…" hides the secret
  // one word further along than the key=value rule below would reach.
  [/\b(?:bearer|basic)\s+[\w.~+/=-]+/gi, '<redacted>'],
  [/\b(bearer|token|key|secret|password|authorization)\b\s*[:=]\s*\S+/gi, '$1=<redacted>'],
  [/\b[A-Za-z0-9_-]{32,}\b/g, '<redacted>'],
  // Card-shaped digit runs. Rare in an error message and catastrophic in a log.
  [/\b(?:\d[ -]?){13,19}\b/g, '<redacted>'],
];

/** Strip anything that looks like a secret or a person. Applied to every field. */
export function redact(s: string): string {
  return REDACTIONS.reduce((out, [re, to]) => out.replace(re, to), s);
}

/**
 * The shape of a message, with the specifics removed, so two occurrences of the
 * same bug hash the same. Only ever used as hash input — the stored message is
 * the redacted original, because a normalised one is unreadable.
 */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/https?:\/\/[^\s"')]+/g, '<url>')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<uuid>')
    .replace(/0x[0-9a-f]+/g, '<hex>')
    .replace(/\d+/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * FNV-1a, 32-bit, as hex.
 *
 * Not a cryptographic hash and does not need to be — it groups error messages.
 * SHA-256 through SubtleCrypto would make every call site async for a value
 * whose worst failure mode is two unrelated errors sharing a row.
 */
export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export const fingerprint = (kind: string, message: string, source: string | null): string =>
  hash(`${kind}|${normalise(message)}|${normalise(source ?? '')}`);

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const clean = redact(v).replace(/\s+/g, ' ').trim().slice(0, max);
  return clean || null;
};

/**
 * A batch of whatever the browser sent, reduced to rows.
 *
 * `count` is computed here and never read from the payload: a client that can
 * name its own counter can claim ten million errors and invent an outage.
 */
export function groupEvents(events: unknown, browser: string | null): GroupedError[] {
  if (!Array.isArray(events)) return [];
  const out = new Map<string, GroupedError>();

  for (const raw of events.slice(0, MAX_EVENTS)) {
    const e = (raw ?? {}) as RawEvent;
    const kind = KINDS.includes(e.kind as ErrorKind) ? e.kind as ErrorKind : 'error';
    const message = str(e.message, MAX_MESSAGE);
    if (!message) continue;
    const source = str(e.source, MAX_URL);
    const page = str(e.page, MAX_URL);
    const fp = fingerprint(kind, message, source);

    const seen = out.get(fp);
    if (seen) seen.count++;
    else out.set(fp, { fingerprint: fp, kind, count: 1, message, source, page, browser });
  }

  return [...out.values()];
}

/**
 * Which browser, to about the resolution anyone acts on.
 *
 * Deliberately not the full User-Agent string: stored per error group it is a
 * fingerprinting surface for no benefit, and "Safari" is the whole of what
 * anybody does with it.
 */
export function browserFamily(ua: string | null): string | null {
  if (!ua) return null;
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua)) return 'Opera';
  if (/chrome\//i.test(ua)) return 'Chrome';
  if (/firefox\//i.test(ua)) return 'Firefox';
  if (/safari\//i.test(ua)) return 'Safari';
  return 'Other';
}
