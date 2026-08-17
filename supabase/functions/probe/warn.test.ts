// deno test supabase/functions/probe/warn.test.ts
//
// The scorer decides whether a team is told something is going wrong before it
// goes wrong. Two ways for it to be useless — crying wolf, and staying quiet —
// and both are cheap to test and expensive to discover in production.
import { assertEquals, assert, assertAlmostEquals } from "jsr:@std/assert@1";
import {
  analyze,
  confidenceFrom,
  MIN_BASELINE_SAMPLES,
  type Pulse,
  risingTrend,
  signalsFor,
} from "./warn.ts";

/** A healthy asset with two weeks of boring history behind it. */
const pulse = (p: Partial<Pulse> = {}): Pulse => ({
  asset_id: "a1",
  org_id: "o1",
  asset_name: "Acme Website",
  criticality: "normal",
  maintenance_until: null,
  baseline_samples: 4000,
  baseline_p50: 180,
  baseline_p95: 420,
  baseline_error_rate: 0.001,
  checks_1h: 12,
  failures_1h: 0,
  p95_1h: 430,
  avg_1h: 190,
  latency_by_hour: [180, 185, 179, 190, 186, 181, 188, 184],
  frontend_errors_1h: 0,
  frontend_errors_median_hour: 0,
  burn_rate_1h: 0,
  burn_rate_6h: 0,
  burn_rate_3d: 0,
  health: 100,
  open_incident_id: null,
  recent_change: null,
  ...p,
});

Deno.test("a healthy asset produces no warning", () => {
  assertEquals(analyze(pulse()), null);
});

Deno.test("latency inside normal variation is not a signal", () => {
  // 1.5× — real, and the kind of thing an afternoon does on its own.
  assertEquals(signalsFor(pulse({ p95_1h: 630 })).length, 0);
});

Deno.test("a small absolute rise on a fast endpoint does not warn", () => {
  // 3× on paper, 60ms in the world. Nobody has ever noticed 60ms.
  const s = signalsFor(pulse({ baseline_p95: 30, p95_1h: 90 }));
  assertEquals(s.length, 0);
});

Deno.test("latency several times its own baseline warns", () => {
  const w = analyze(pulse({ p95_1h: 1800 }));
  assert(w, "expected a warning");
  assertEquals(w.kind, "latency");
  assert(w.risk >= 45, `risk was ${w.risk}`);
  assert(w.evidence[0].label.includes("×"));
});

Deno.test("no baseline means no latency claim", () => {
  // The comparison is the product. Without enough history there is nothing to
  // compare against, and guessing is worse than staying quiet.
  const w = analyze(pulse({ baseline_samples: 40, p95_1h: 1800 }));
  assertEquals(w, null);
});

Deno.test("a steady climb warns before anything has failed", () => {
  const w = analyze(pulse({
    latency_by_hour: [200, 250, 310, 380, 440, 520, 650],
    // Deliberately within baseline for the hour: the point is that only the
    // trend fires, so the trend alone has to be enough.
    p95_1h: 430,
  }));
  assert(w, "expected a warning");
  assertEquals(w.kind, "latency_trend");
  assertEquals(w.evidence.length, 1);
});

Deno.test("noisy but flat latency is not a trend", () => {
  const { rising } = risingTrend([300, 260, 340, 250, 330, 270, 310]);
  assertEquals(rising, false);
});

Deno.test("a single dip does not break a real climb", () => {
  const { rising, ratio } = risingTrend([200, 260, 250, 340, 420, 510]);
  assertEquals(rising, true);
  assertAlmostEquals(ratio, 2.55, 0.01);
});

Deno.test("intermittent failures warn before the state machine opens an incident", () => {
  // Two failures out of twelve never trips two-in-a-row, so uptime alerting
  // stays silent. This is exactly the gap early warnings exist to cover.
  const w = analyze(pulse({ failures_1h: 2 }));
  assert(w, "expected a warning");
  assertEquals(w.kind, "error_rate");
  assert(w.evidence[0].label.includes("17%"));
});

Deno.test("one failed check is not a pattern", () => {
  assertEquals(analyze(pulse({ failures_1h: 1 })), null);
});

Deno.test("browser errors count only against their own usual hour", () => {
  // A busy site with 40 errors an hour every hour has a bug, not an emergency.
  assertEquals(analyze(pulse({ frontend_errors_1h: 40, frontend_errors_median_hour: 38 })), null);
  const w = analyze(pulse({ frontend_errors_1h: 40, frontend_errors_median_hour: 2 }));
  assert(w, "expected a warning");
  assertEquals(w.kind, "frontend_errors");
});

Deno.test("an asset already down gets no early warning", () => {
  // It is not early any more, and the incident already woke someone.
  assertEquals(analyze(pulse({ p95_1h: 3000, failures_1h: 4, open_incident_id: "inc-1" })), null);
});

Deno.test("a declared maintenance window silences the warning", () => {
  const until = new Date(Date.now() + 20 * 60_000).toISOString();
  assertEquals(analyze(pulse({ p95_1h: 3000, maintenance_until: until })), null);
});

Deno.test("six symptoms of one problem are one warning", () => {
  const w = analyze(pulse({
    p95_1h: 2400,
    failures_1h: 3,
    latency_by_hour: [200, 260, 330, 420, 560, 900],
    burn_rate_6h: 4,
    frontend_errors_1h: 30,
    frontend_errors_median_hour: 1,
    recent_change: {
      ts: new Date(Date.now() - 25 * 60_000).toISOString(),
      title: "checkout: batch the order lookup",
      actor: "priya",
      ref: "a1b2c3d",
      url: null,
      kind: "deployment",
    },
  }));
  assert(w, "expected a warning");
  // One row, five signals plus the change — not six notifications.
  assertEquals(w.evidence.length, 6);
  assert(w.risk >= 90, `risk was ${w.risk}`);
  assert(w.recommendation.includes("correlates"), "must not claim the deploy caused it");
});

Deno.test("a deployment on its own is never a warning", () => {
  const w = analyze(pulse({
    recent_change: {
      ts: new Date(Date.now() - 5 * 60_000).toISOString(),
      title: "bump dependencies",
      actor: "sam",
      ref: "f00",
      url: null,
      kind: "deployment",
    },
  }));
  assertEquals(w, null);
});

Deno.test("confidence follows the evidence, not the severity", () => {
  // Just enough history to be allowed an opinion, against two weeks of it.
  const thin = pulse({ baseline_samples: 210, checks_1h: 5, p95_1h: 4000 });
  const thick = pulse({ baseline_samples: 4000, checks_1h: 12, p95_1h: 4000 });
  const a = analyze(thin)!;
  const b = analyze(thick)!;
  // Same risk from the same ratio; only the confidence moves.
  assertEquals(a.risk, b.risk);
  assert(a.confidence < b.confidence, `${a.confidence} !< ${b.confidence}`);
});

Deno.test("confidence never reaches certainty", () => {
  const c = confidenceFrom(
    pulse({ baseline_samples: MIN_BASELINE_SAMPLES * 50, checks_1h: 600 }),
    [
      { code: "latency", label: "", detail: null, magnitude: 4, points: 40 },
      { code: "error_rate", label: "", detail: null, magnitude: 9, points: 40 },
      { code: "budget_burn", label: "", detail: null, magnitude: 8, points: 30 },
    ],
  );
  assert(c <= 95, `confidence was ${c}`);
});
