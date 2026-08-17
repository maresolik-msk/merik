// deno test supabase/functions/probe/alerts.test.ts
import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import {
  type AlertIncident,
  alertHtml,
  alertSubject,
  shouldAlertNow,
  WORKING_END_HOUR,
  WORKING_START_HOUR,
} from "./alerts.ts";

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
