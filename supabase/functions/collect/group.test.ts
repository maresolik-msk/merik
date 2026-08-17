// deno test supabase/functions/collect/group.test.ts
//
// This module is a public endpoint's only line of defence against storing other
// people's secrets, and the only reason "browser errors 18× the usual hour"
// means anything. Both are worth a test.
import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  browserFamily,
  fingerprint,
  groupEvents,
  MAX_EVENTS,
  normalise,
  redact,
} from "./group.ts";

Deno.test("query strings are cut, because that is where the tokens are", () => {
  const out = redact("failed to load https://acme.com/api/orders?session=abc123&email=x@y.com");
  assert(!out.includes("abc123"), out);
  assert(!out.includes("x@y.com"), out);
  assert(out.includes("/api/orders"), out);
});

Deno.test("things shaped like credentials never reach the database", () => {
  const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghij";
  assert(!redact(`auth failed for ${jwt}`).includes(jwt));
  assert(!redact("Authorization: Bearer sk_live_9f8e7d6c5b4a").includes("sk_live"));
  assert(!redact("card 4111 1111 1111 1111 declined").includes("4111"));
  assertEquals(redact("email jo@acme.com bounced"), "email <email> bounced");
});

Deno.test("the same bug with different ids is one group", () => {
  const a = fingerprint("error", "user 4821 not found", "/app.js");
  const b = fingerprint("error", "user 9317 not found", "/app.js");
  assertEquals(a, b);
});

Deno.test("different bugs stay different", () => {
  assert(fingerprint("error", "user not found", "/app.js") !==
    fingerprint("error", "payment declined", "/app.js"));
  // Same message from a different bundle is a different problem.
  assert(fingerprint("error", "boom", "/a.js") !== fingerprint("error", "boom", "/b.js"));
});

Deno.test("normalisation flattens ids, numbers and urls", () => {
  assertEquals(
    normalise("Failed at 2 https://x.test/a/b 550e8400-e29b-41d4-a716-446655440000"),
    "failed at <n> <url> <uuid>",
  );
});

Deno.test("a batch of identical errors becomes one row with a count", () => {
  const events = Array.from({ length: 12 }, (_, i) => ({
    kind: "error",
    message: `order ${i} failed to submit`,
    source: "https://acme.com/app.js",
    page: "https://acme.com/checkout",
  }));
  const rows = groupEvents(events, "Chrome");
  assertEquals(rows.length, 1);
  assertEquals(rows[0].count, 12);
  assertEquals(rows[0].browser, "Chrome");
});

Deno.test("a client cannot invent its own counter", () => {
  // `count` in the payload is ignored: one event is one, however it is labelled.
  const rows = groupEvents([{ kind: "error", message: "boom", count: 1_000_000 }], null);
  assertEquals(rows[0].count, 1);
});

Deno.test("oversized batches are truncated, not rejected", () => {
  const events = Array.from({ length: 500 }, (_, i) => ({ kind: "error", message: `e${i}` }));
  const rows = groupEvents(events, null);
  // All 500 share a shape ("e<n>"), so they are one group — and the counter
  // stops at the cap, which is the part that bounds the request.
  assertEquals(rows.length, 1);
  assertEquals(rows[0].count, MAX_EVENTS);
});

Deno.test("junk in, nothing out", () => {
  assertEquals(groupEvents(null, null), []);
  assertEquals(groupEvents([{}, { message: 42 }, { message: "   " }], null), []);
  // An unrecognised kind is recorded as a plain error rather than dropped — the
  // event is still real, and the check constraint would reject the row.
  assertEquals(groupEvents([{ kind: "wat", message: "boom" }], null)[0].kind, "error");
});

Deno.test("browser family, not a fingerprinting surface", () => {
  const chrome =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
  assertEquals(browserFamily(chrome), "Chrome");
  assertEquals(browserFamily("Mozilla/5.0 ... Version/17.0 Safari/605.1.15"), "Safari");
  assertEquals(browserFamily(null), null);
});
