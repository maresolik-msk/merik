// deno test supabase/functions/probe/correlate.test.ts
import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import {
  type ChangeEvent,
  correlateChanges,
  describeChange,
  isVendorOutage,
  parseStatuspage,
} from "./correlate.ts";

Deno.test("only a major or critical vendor status suppresses an incident", () => {
  assertEquals(isVendorOutage("critical"), true);
  assertEquals(isVendorOutage("major"), true);
  // The important negative: "minor" on Statuspage can be a slow dashboard. If
  // that suppressed alerts, a real outage would go unreported.
  assertEquals(isVendorOutage("minor"), false);
  assertEquals(isVendorOutage("none"), false);
  assertEquals(isVendorOutage("unknown"), false);
  assertEquals(isVendorOutage(null), false);
  assertEquals(isVendorOutage(undefined), false);
});

Deno.test("statuspage payloads are parsed, and junk degrades to unknown", () => {
  assertEquals(
    parseStatuspage({ status: { indicator: "major", description: "Partial System Outage" } }),
    { indicator: "major", description: "Partial System Outage" },
  );
  // A vendor changing its API must not be read as "all fine".
  assertEquals(parseStatuspage({}).indicator, "unknown");
  assertEquals(parseStatuspage(null).indicator, "unknown");
  assertEquals(parseStatuspage("<html>maintenance</html>").indicator, "unknown");
  assertEquals(parseStatuspage({ status: { indicator: "catastrophic" } }).indicator, "unknown");
});

const at = (minutesBefore: number, p: Partial<ChangeEvent> = {}): ChangeEvent => ({
  id: `c${minutesBefore}`,
  ts: new Date(Date.parse("2026-08-17T12:00:00.000Z") - minutesBefore * 60_000).toISOString(),
  source: "github",
  kind: "commit",
  ref: "abc123",
  title: "tweak checkout",
  url: null,
  actor: "priya",
  ...p,
});
const INCIDENT = "2026-08-17T12:00:00.000Z";

Deno.test("changes are ranked closest-first", () => {
  const out = correlateChanges([at(45), at(2), at(20)], INCIDENT);
  assertEquals(out.map((c) => c.minutesBefore), [2, 20, 45]);
});

Deno.test("a change after the incident started is never a suspect", () => {
  // That deploy is the fix, or unrelated. Offering it sends people the wrong way.
  const after = at(-10);
  assertEquals(correlateChanges([after], INCIDENT).length, 0);
});

Deno.test("changes outside the window are dropped", () => {
  assertEquals(correlateChanges([at(61)], INCIDENT).length, 0);
  assertEquals(correlateChanges([at(60)], INCIDENT).length, 1);
});

Deno.test("nothing to correlate returns nothing, not a guess", () => {
  assertEquals(correlateChanges([], INCIDENT), []);
});

Deno.test("the window is configurable for a wider sweep", () => {
  assertEquals(correlateChanges([at(120)], INCIDENT, 180).length, 1);
});

Deno.test("the description states what happened and never why", () => {
  const [c] = correlateChanges([at(7, { kind: "deployment", source: "vercel", actor: "arun" })], INCIDENT);
  const line = describeChange(c);
  assertStringIncludes(line, "deployment on vercel");
  assertStringIncludes(line, "by arun");
  assertStringIncludes(line, "7 min before");
  // No causal language: this is evidence, not a verdict.
  for (const word of ["caused", "because", "root cause", "due to", "likely"]) {
    assertEquals(line.toLowerCase().includes(word), false, `asserted causation: ${word}`);
  }
});
