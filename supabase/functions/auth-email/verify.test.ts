// deno test supabase/functions/auth-email/verify.test.ts
//
// Mostly about rejection: a hook that accepts an unsigned request turns our
// Gmail account into an open relay that sends attacker-chosen links under the
// Merik name.
import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { timingSafeEqual, verifySignature } from "./verify.ts";

const SECRET = "v1,whsec_" + btoa("merik-test-secret-0123456789");
const BODY = '{"user":{"email":"a@b.co"},"email_data":{"email_action_type":"recovery"}}';
const ID = "msg_2abc";

// Signed independently of the implementation, so a bug in the helper cannot
// make the test agree with itself.
const sign = async (secret: string, id: string, ts: string, body: string) => {
  const bin = atob(secret.replace(/^v\d+,/, "").replace(/^whsec_/, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const key = await crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`));
  return btoa(String.fromCharCode(...new Uint8Array(mac)));
};

const NOW = 1_800_000_000_000;
const TS = String(Math.floor(NOW / 1000));

const headers = (sig: string, ts = TS, id = ID) =>
  new Headers({ "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": sig });

Deno.test("accepts a correctly signed payload", async () => {
  const sig = await sign(SECRET, ID, TS, BODY);
  await verifySignature(SECRET, headers(`v1,${sig}`), BODY, NOW);
});

Deno.test("accepts when one of several rotated signatures matches", async () => {
  const sig = await sign(SECRET, ID, TS, BODY);
  await verifySignature(SECRET, headers(`v1,AAAAdeadbeef= v1,${sig}`), BODY, NOW);
});

Deno.test("rejects a tampered body", async () => {
  const sig = await sign(SECRET, ID, TS, BODY);
  await assertRejects(
    () => verifySignature(SECRET, headers(`v1,${sig}`), BODY.replace("a@b.co", "attacker@evil.co"), NOW),
    Error,
    "signature mismatch",
  );
});

Deno.test("rejects a signature made with the wrong secret", async () => {
  const sig = await sign("v1,whsec_" + btoa("not-the-real-secret-000000000"), ID, TS, BODY);
  await assertRejects(
    () => verifySignature(SECRET, headers(`v1,${sig}`), BODY, NOW),
    Error,
    "signature mismatch",
  );
});

Deno.test("rejects a replayed signature outside the skew window", async () => {
  const old = String(Math.floor(NOW / 1000) - 600);
  const sig = await sign(SECRET, ID, old, BODY);
  await assertRejects(
    () => verifySignature(SECRET, headers(`v1,${sig}`, old), BODY, NOW),
    Error,
    "outside tolerance",
  );
});

Deno.test("rejects a request with no signature headers", async () => {
  await assertRejects(
    () => verifySignature(SECRET, new Headers(), BODY, NOW),
    Error,
    "Missing webhook signature headers",
  );
});

Deno.test("timingSafeEqual matches only on identical strings", () => {
  assertEquals(timingSafeEqual("abc", "abc"), true);
  assertEquals(timingSafeEqual("abc", "abd"), false);
  assertEquals(timingSafeEqual("abc", "abcd"), false);
  assertEquals(timingSafeEqual("", ""), true);
});
