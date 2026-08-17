// deno test supabase/functions/probe/alerts.test.ts
import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import {
  type AlertIncident,
  alertHtml,
  alertSubject,
  severityFromBurn,
  shouldAlertNow,
  WORKING_END_HOUR,
  WORKING_START_HOUR,
} from "./alerts.ts";

const burn = (h1: number | null, h6: number | null, d3: number | null) => ({
  burn_rate_1h: h1,
  burn_rate_6h: h6,
  burn_rate_3d: d3,
});

Deno.test("a hard outage is Sev1 — the 1h budget burn is enormous", () => {
  // Every check failing on a 99.9% asset burns at 1000×.
  assertEquals(severityFromBurn(burn(1000, 1000, 40), 3), 1);
});

Deno.test("each burn rate only counts against its own window", () => {
  // 6× is Sev2 over six hours, but the same 6× over one hour is not Sev1.
  assertEquals(severityFromBurn(burn(6, 6, 1), 3), 2);
  // Below every threshold but still burning: a ticket, not a page.
  assertEquals(severityFromBurn(burn(2, 2, 0.5), 3), 4);
});

Deno.test("the Sev1 boundary is at the threshold, not past it", () => {
  assertEquals(severityFromBurn(burn(14.4, 0, 0), 3), 1);
  assertEquals(severityFromBurn(burn(14.39, 0, 0), 3), 4);
});

Deno.test("a slow burn that will still miss the SLO is Sev3", () => {
  assertEquals(severityFromBurn(burn(0, 0, 1), 3), 3);
  assertEquals(severityFromBurn(burn(0, 0, 0.99), 3), 4);
});

Deno.test("no budget to burn falls back to declared criticality", () => {
  // best_effort has no contracted target, so there is nothing to measure.
  assertEquals(severityFromBurn(null, 2), 2);
  assertEquals(severityFromBurn(burn(null, null, null), 4), 4);
});

Deno.test("a window with no data does not mask a window that has it", () => {
  // A brand-new asset has no 3d history; the 1h burn must still page.
  assertEquals(severityFromBurn(burn(1000, null, null), 3), 1);
});

// A UTC instant for a given IST wall-clock hour. IST is UTC+5:30, so 09:00 IST
// is 03:30 UTC — the half-hour offset is exactly where an hour-based rule slips,
// which is why these are written as IST times and converted rather than guessed.
const atIst = (hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 7, 13, hour, minute) - 330 * 60_000);

Deno.test("a Sev1 goes out at any hour", () => {
  assertEquals(shouldAlertNow(1, atIst(3)), true);
  assertEquals(shouldAlertNow(1, atIst(23, 59)), true);
});

Deno.test("lower severities are held outside working hours", () => {
  for (const sev of [2, 3, 4]) {
    assertEquals(shouldAlertNow(sev, atIst(3)), false, `sev${sev} at 03:00 IST`);
    assertEquals(shouldAlertNow(sev, atIst(22)), false, `sev${sev} at 22:00 IST`);
  }
});

Deno.test("lower severities go out during working hours", () => {
  for (const sev of [2, 3, 4]) {
    assertEquals(shouldAlertNow(sev, atIst(13)), true, `sev${sev} at 13:00 IST`);
  }
});

Deno.test("the working-hours window is closed at the top and open at the bottom", () => {
  // Start hour is inside the window, end hour is not — otherwise 19:00 would
  // page someone who has gone home.
  assertEquals(shouldAlertNow(3, atIst(WORKING_START_HOUR)), true);
  assertEquals(shouldAlertNow(3, atIst(WORKING_START_HOUR, -1)), false);
  assertEquals(shouldAlertNow(3, atIst(WORKING_END_HOUR - 1, 59)), true);
  assertEquals(shouldAlertNow(3, atIst(WORKING_END_HOUR)), false);
});

const incident: AlertIncident = {
  title: "Acme Checkout API is not responding",
  severity: 1,
  started_at: "2026-08-13T07:57:01.000Z",
  cause_category: "connect",
  assetName: "Acme Checkout API",
  assetUrl: "https://api.acme.example.com/health",
};

Deno.test("the subject names severity and asset", () => {
  assertEquals(alertSubject(incident), "[Sev1] Acme Checkout API is not responding");
});

Deno.test("the body carries the detail the owner needs", () => {
  const html = alertHtml(incident, "https://app.example.com/");
  assertStringIncludes(html, "connect");
  assertStringIncludes(html, "https://api.acme.example.com/health");
  assertStringIncludes(html, "Sev1");
});

Deno.test("asset names are escaped, not interpolated raw", () => {
  // Asset names are user input, and this HTML is emailed.
  const html = alertHtml({ ...incident, assetName: '<img src=x onerror=alert(1)>' });
  assertEquals(html.includes("<img"), false);
  assertStringIncludes(html, "&lt;img");
});
