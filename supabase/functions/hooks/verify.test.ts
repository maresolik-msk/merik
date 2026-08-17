// deno test supabase/functions/hooks/verify.test.ts
//
// This is the only thing standing between the open internet and rows that a
// human later reads as evidence about who broke what. The tests are mostly about
// rejection.
import { assertEquals } from "jsr:@std/assert@1";
import {
  parseGithubEvent,
  parseGithubPush,
  parseVercelDeployment,
  timingSafeEqual,
  verifyGithub,
  verifyVercel,
} from "./verify.ts";

const SECRET = "s3cr3t";
const BODY = '{"hello":"world"}';

// Computed independently of the implementation, so a bug in the signing helper
// cannot make the test agree with itself.
const sign = async (secret: string, body: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

Deno.test("a correctly signed GitHub delivery is accepted", async () => {
  const sig = "sha256=" + await sign(SECRET, BODY);
  assertEquals(await verifyGithub(BODY, sig, SECRET), true);
});

Deno.test("GitHub: wrong secret, tampered body, and missing prefix are all rejected", async () => {
  const sig = "sha256=" + await sign(SECRET, BODY);
  assertEquals(await verifyGithub(BODY, sig, "wrong-secret"), false);
  // The attack this exists to stop: a forged deployment claiming someone shipped.
  assertEquals(await verifyGithub('{"hello":"evil"}', sig, SECRET), false);
  assertEquals(await verifyGithub(BODY, sig.replace("sha256=", ""), SECRET), false);
  assertEquals(await verifyGithub(BODY, null, SECRET), false);
  assertEquals(await verifyGithub(BODY, "sha256=", SECRET), false);
});

Deno.test("Vercel signatures carry no prefix", async () => {
  const sig = await sign(SECRET, BODY);
  assertEquals(await verifyVercel(BODY, sig, SECRET), true);
  assertEquals(await verifyVercel(BODY, sig.toUpperCase(), SECRET), true);
  assertEquals(await verifyVercel(BODY, "deadbeef", SECRET), false);
  assertEquals(await verifyVercel(BODY, null, SECRET), false);
});

Deno.test("the comparison is length-safe and value-correct", () => {
  assertEquals(timingSafeEqual("abc", "abc"), true);
  assertEquals(timingSafeEqual("abc", "abd"), false);
  assertEquals(timingSafeEqual("abc", "abcd"), false);
  assertEquals(timingSafeEqual("", ""), true);
});

Deno.test("a GitHub push yields the head commit, first line only", () => {
  const c = parseGithubPush({
    head_commit: {
      id: "0123456789abcdef0123",
      message: "fix checkout\n\nlong explanation that should not appear in a list",
      url: "https://github.com/x/y/commit/0123",
      author: { username: "priya" },
    },
  });
  assertEquals(c?.kind, "commit");
  assertEquals(c?.ref, "0123456789ab");
  assertEquals(c?.title, "fix checkout");
  assertEquals(c?.actor, "priya");
});

Deno.test("a branch push with no head commit records nothing", () => {
  assertEquals(parseGithubPush({}), null);
  assertEquals(parseGithubPush({ head_commit: null }), null);
});

Deno.test("a push records its branch, repo and commit count", () => {
  const c = parseGithubEvent("push", {
    ref: "refs/heads/main",
    repository: { full_name: "maresolik-msk/merik" },
    commits: [{}, {}, {}],
    head_commit: { id: "abc123def4567", message: "ship it", author: { username: "priya" } },
  });
  // "3 commits to main" reads very differently from one.
  assertEquals(c?.meta, { repo: "maresolik-msk/merik", branch: "main", commits: 3 });
});

Deno.test("events are routed by GitHub's header, not guessed from the body", () => {
  const prBody = {
    action: "opened",
    repository: { full_name: "o/r" },
    pull_request: { number: 42, title: "Add reports", user: { login: "arun" }, base: { ref: "main" } },
  };
  // Before routing existed this was fed to the push parser and silently dropped.
  assertEquals(parseGithubEvent("pull_request", prBody)?.kind, "pr_opened");
  assertEquals(parseGithubEvent("push", prBody), null);
  // ping, stars, issues: accepted and ignored so GitHub stops retrying.
  assertEquals(parseGithubEvent("ping", { zen: "hello" }), null);
  assertEquals(parseGithubEvent(null, prBody), null);
});

Deno.test("a merged PR is recorded, an abandoned one is not", () => {
  const base = {
    repository: { full_name: "o/r" },
    pull_request: {
      number: 7,
      title: "Refactor payroll",
      user: { login: "priya" },
      merged_by: { login: "arun" },
      base: { ref: "main" },
      additions: 120,
      deletions: 40,
      changed_files: 6,
    },
  };
  const merged = parseGithubEvent("pull_request", { ...base, action: "closed", pull_request: { ...base.pull_request, merged: true } });
  assertEquals(merged?.kind, "pr_merged");
  assertEquals(merged?.ref, "#7");
  // Credited to whoever merged it, which is the act being recorded.
  assertEquals(merged?.actor, "arun");
  assertEquals(merged?.meta?.additions, 120);

  // Closed without merging: work that never shipped must not inflate the feed.
  assertEquals(
    parseGithubEvent("pull_request", { ...base, action: "closed", pull_request: { ...base.pull_request, merged: false } }),
    null,
  );
  assertEquals(parseGithubEvent("pull_request", { ...base, action: "synchronize" }), null);
});

Deno.test("only successful production Vercel deployments count", () => {
  const base = {
    type: "deployment.succeeded",
    payload: { target: "production", deployment: { id: "dpl_1", url: "acme.vercel.app" } },
  };
  assertEquals(parseVercelDeployment(base)?.kind, "deployment");

  // A preview build cannot take the client's site down.
  assertEquals(
    parseVercelDeployment({ ...base, payload: { ...base.payload, target: "preview" } }),
    null,
  );
  // A failed deploy never shipped, so it explains nothing.
  assertEquals(parseVercelDeployment({ ...base, type: "deployment.error" }), null);
});

Deno.test("the deployment host is extracted so the event can find its asset", () => {
  const c = parseVercelDeployment({
    type: "deployment.succeeded",
    payload: {
      target: "production",
      deployment: { id: "dpl_2", url: "x.vercel.app" },
      alias: ["klartravels.com"],
    },
  });
  assertEquals(c?.host, "klartravels.com");
});
