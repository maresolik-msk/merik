// deno test supabase/functions/status/render.test.ts
//
// This page is the only thing an unauthenticated stranger can read, so these
// tests are mostly about what must NOT come out of it.
import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import {
  overallStatus,
  type PublicAsset,
  publicStatus,
  renderStatusPage,
  type StatusPageData,
} from "./render.ts";

const asset = (p: Partial<PublicAsset> = {}): PublicAsset => ({
  name: "Acme Website",
  status: "operational",
  uptime_pct: 99.98,
  sla_tier: "99.9",
  ...p,
});

const page = (p: Partial<StatusPageData> = {}): StatusPageData => ({
  title: "Acme Corp",
  intro: null,
  assets: [asset()],
  incidents: [],
  generatedAt: "2026-08-13T10:00:00.000Z",
  ...p,
});

Deno.test("the worst service decides the headline, not the average", () => {
  // A healthy CDN must not mask a dead checkout.
  const mixed = [asset(), asset({ name: "Checkout", status: "down" })];
  assertEquals(overallStatus(mixed).tone, "bad");
  assertEquals(overallStatus([asset(), asset()]).label, "All systems operational");
});

Deno.test("no services is not the same as everything fine", () => {
  assertEquals(overallStatus([]).tone, "idle");
});

Deno.test("internal state names are translated for a client audience", () => {
  assertEquals(publicStatus("down").label, "Service disruption");
  assertEquals(publicStatus("unknown").label, "Not yet reported");
  // An unrecognised state must degrade to something harmless, not leak itself.
  assertEquals(publicStatus("ECONNRESET").label, "Not yet reported");
});

Deno.test("only the approved summary appears, never internal wording", () => {
  const html = renderStatusPage(page({
    incidents: [{
      started_at: "2026-08-12T04:00:00.000Z",
      resolved_at: "2026-08-12T06:30:00.000Z",
      summary: "Checkout was briefly unavailable. Resolved.",
    }],
  }));
  assertStringIncludes(html, "Checkout was briefly unavailable");
  for (const leak of ["ECONNRESET", "502", "failure_stage", "connect", "monitor_id"]) {
    assertEquals(html.includes(leak), false, `leaked ${leak}`);
  }
});

Deno.test("client-supplied text is escaped, not interpolated", () => {
  const html = renderStatusPage(page({
    title: '<script>alert(1)</script>',
    assets: [asset({ name: '<img src=x onerror=alert(1)>' })],
    incidents: [{
      started_at: "2026-08-12T04:00:00.000Z",
      resolved_at: null,
      summary: '</div><script>alert(2)</script>',
    }],
  }));
  assertEquals(html.includes("<script>alert(1)</script>"), false);
  assertEquals(html.includes("<script>alert(2)</script>"), false);
  assertEquals(html.includes("<img src=x"), false);
  assertStringIncludes(html, "&lt;script&gt;");
});

Deno.test("an asset with no checks yet reads as unknown, not 0%", () => {
  // 0.00% would tell a client their site has been down for a month.
  const html = renderStatusPage(page({ assets: [asset({ uptime_pct: null, status: "unknown" })] }));
  assertStringIncludes(html, "—");
  assertEquals(html.includes("0.00%"), false);
});

Deno.test("an ongoing incident is labelled as ongoing", () => {
  const html = renderStatusPage(page({
    incidents: [{ started_at: "2026-08-13T04:00:00.000Z", resolved_at: null, summary: "Investigating." }],
  }));
  assertStringIncludes(html, "ongoing");
});

Deno.test("the page renders with nothing configured at all", () => {
  const html = renderStatusPage(page({ assets: [], incidents: [] }));
  assertStringIncludes(html, "No services are being monitored yet.");
  assertStringIncludes(html, "No incidents reported.");
});
