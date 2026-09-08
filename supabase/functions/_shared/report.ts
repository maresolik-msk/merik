// Merik — server-side product health reporting.
//
// The browser reports everything a user was there to see: a page that failed to
// render, an edge function that returned an error, a write the database refused.
// That covers most of Merik, because most of Merik happens while somebody is
// looking at it.
//
// This is for the rest. `probe` runs on a cron every minute with nobody watching
// it; `auth-email` runs inside GoTrue's webhook, before there is a session to
// report with; `collect` and `status` are reached by strangers' browsers on other
// people's domains. When one of those throws, the stack trace goes to a Supabase
// log that expires and that nobody is subscribed to — which is how a probe can
// stop checking every client site in the product and the first sign of it is a
// client asking why their uptime graph has a hole in it.
//
// Deliberately fire-and-forget and deliberately incapable of throwing: this is
// called from catch blocks, and a reporter that can fail turns a handled error
// into an unhandled one.
//
// The redaction and fingerprinting are imported rather than copied. The rules
// that decide what counts as one error group, and what counts as a secret, are
// the same whether the error came from a visitor on a client's website or from
// Merik's own cron — and two copies of that answer is one copy too many.
import { fingerprint, redact } from '../collect/group.ts';

/** Same vocabulary as the browser reporter and the product_events check constraint. */
export type ServerErrorKind = 'error' | 'rejection' | 'view' | 'function' | 'db';

/** Bump alongside PH_BUILD in app/index.html so both sides date a release the same way. */
export const SERVER_BUILD = '2026-09-08';

const MAX_MESSAGE = 300;
const MAX_SOURCE = 300;

/** Minimal shape we need from a service-role Supabase client, so this file does
 *  not have to agree with each function's own client typing.
 *
 *  PromiseLike and not Promise: supabase-js returns a PostgrestFilterBuilder,
 *  which is a thenable you can await but which has no .catch or .finally, so
 *  Promise here rejects every real client (see the same trap noted above
 *  serviceClient in probe/index.ts). */
interface RpcClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ error: unknown }>;
}

const trim = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string' || !v) return null;
  const clean = redact(v).replace(/\s+/g, ' ').trim().slice(0, max);
  return clean || null;
};

/**
 * Record one failure against the product health table.
 *
 * `org` is explicit and may be null. A background job legitimately fails on
 * behalf of a tenant nobody is signed in as, and null means "Merik itself" —
 * a scheduler that never fired belongs to no client.
 *
 * Never awaited for its result and never allowed to reject. Callers may await it
 * to make sure the write lands before the isolate is torn down, which is the one
 * reason to await telemetry at all.
 */
export async function serverReport(
  admin: RpcClient,
  opts: {
    kind: ServerErrorKind;
    message: unknown;
    /** Which function, and which part of it: 'probe:analyze', 'auth-email:send'. */
    source: string;
    org?: string | null;
  },
): Promise<void> {
  try {
    const message = trim(
      opts.message instanceof Error ? opts.message.message : String(opts.message ?? ''),
      MAX_MESSAGE,
    );
    if (!message) return;
    const source = trim(opts.source, MAX_SOURCE);
    const { error } = await admin.rpc('ingest_product_events', {
      p_org: opts.org ?? null,
      p_rows: [{
        fingerprint: fingerprint(opts.kind, message, source),
        kind: opts.kind,
        count: 1,
        message,
        source,
        page: opts.source.split(':')[0] || null,
        build: SERVER_BUILD,
      }],
    });
    // One line, once, and then silence. If the migration is not applied yet this
    // would otherwise log on every single cron tick forever.
    if (error) console.warn('product health write failed', error);
  } catch (_) {
    // Reporting a failure must never itself become a failure.
  }
}

/**
 * Wrap a Deno.serve handler so a throw is recorded instead of vanishing.
 *
 * The handler's own return value is passed straight through — this changes what
 * is *observed* about a failure, never what the function does. On a throw the
 * caller still gets a 500, which is what it got before; the difference is that
 * somebody now knows.
 */
export function withReporting(
  admin: RpcClient,
  source: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (e) {
      await serverReport(admin, { kind: 'error', message: e, source });
      return new Response(JSON.stringify({ ok: false, error: 'internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}
