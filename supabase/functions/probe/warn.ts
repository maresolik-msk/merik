// Is this asset becoming abnormal, and how sure are we?
//
// The whole early-warning product is this file. Everything around it moves rows;
// this decides whether there is anything to say, and it is pure so the decision
// can be tested rather than watched in production.
//
// Three rules it exists to enforce:
//
//   1. Compare against measured normal, never a threshold somebody typed. A
//      900ms API that has always taken 900ms is healthy; one that took 180ms
//      yesterday is not. The same fixed threshold is wrong for both.
//   2. One warning per asset, carrying every signal. Six correlated symptoms of
//      one problem are one warning with six pieces of evidence — the brief's §26
//      and the reason anyone would leave this switched on.
//   3. Risk and confidence are separate numbers and stay separate. Risk is how
//      bad the evidence looks. Confidence is how much evidence there is. A 78%
//      risk off two hours of baseline is not the same claim as 78% off two
//      weeks, and one blended score would hide exactly that difference.
//
// What this deliberately does not do: predict a time of failure. "Estimated
// window: 30–60 minutes" needs a failure model fitted to historical incidents,
// and this tenant has a handful. Saying it anyway would be inventing a number
// with a units label on it.

import { type RankedChange } from './correlate.ts';

/** One asset's row from the `asset_pulse` view. */
export interface Pulse {
  asset_id: string;
  org_id: string;
  asset_name: string;
  criticality: string;
  maintenance_until: string | null;
  baseline_samples: number | null;
  baseline_p50: number | null;
  baseline_p95: number | null;
  baseline_error_rate: number | null;
  checks_1h: number;
  failures_1h: number;
  p95_1h: number | null;
  avg_1h: number | null;
  latency_by_hour: number[] | null;
  frontend_errors_1h: number;
  frontend_errors_median_hour: number | null;
  burn_rate_1h: number | null;
  burn_rate_6h: number | null;
  burn_rate_3d: number | null;
  health: number | null;
  open_incident_id: string | null;
  recent_change: {
    ts: string;
    title: string | null;
    actor: string | null;
    ref: string | null;
    url: string | null;
    kind: string;
  } | null;
}

export type SignalCode =
  | 'latency'
  | 'error_rate'
  | 'latency_trend'
  | 'budget_burn'
  | 'frontend_errors'
  | 'recent_change';

export interface Signal {
  code: SignalCode;
  /** Shown as a bullet under "Why Merik thinks this". */
  label: string;
  detail: string | null;
  /** How many times worse than normal, where that has a meaning. */
  magnitude: number | null;
  /** Contribution to risk. Context signals contribute only alongside a real one. */
  points: number;
  /** A change event is never evidence of a problem on its own. */
  context?: boolean;
}

export interface Warning {
  asset_id: string;
  org_id: string;
  kind: Exclude<SignalCode, 'recent_change'>;
  risk: number;
  confidence: number;
  severity: number;
  title: string;
  impact: string;
  recommendation: string;
  evidence: Array<Omit<Signal, 'points'>>;
}

// ------------------------------------------------------------- thresholds ---
//
// Every number here is a false-positive/false-negative trade, so each says what
// it is trading. They are constants rather than settings because a per-tenant
// sensitivity slider is a support burden pretending to be a feature — nobody
// knows what to set it to, including us.

/** ~17 hours at the default 5-minute interval. Below this, "normal" is a guess. */
export const MIN_BASELINE_SAMPLES = 200;
/** A monitor checked hourly has one sample an hour — no distribution to compare. */
export const MIN_OBSERVED_CHECKS = 5;
/** Latency ratio worth mentioning. Below ~1.8× is ordinary daily variation. */
export const LATENCY_RATIO = 1.8;
/** …and it has to be a real amount of time. 40ms → 90ms is 2.25× and nothing. */
export const LATENCY_ABS_MS = 150;
/** A rise across the day only counts if it is both large and directional. */
export const TREND_RATIO = 1.5;
export const TREND_MIN_POINTS = 5;
/** Two failures, because one flap is not a pattern — the state machine agrees. */
export const ERROR_MIN_FAILURES = 2;
export const ERROR_MIN_RATE = 0.02;
/** Floor for the "×normal" figure: most assets have a baseline error rate of 0. */
export const ERROR_RATE_FLOOR = 0.005;
/** Burning budget faster than the SLO allows, sustained over six hours. */
export const BURN_MIN_6H = 1;
export const FRONTEND_MIN_COUNT = 5;
export const FRONTEND_RATIO = 3;
/** A change within this window is context worth showing beside the signals. */
export const CHANGE_WINDOW_MIN = 180;
/** Below this, say nothing. A warning nobody would act on is noise with a badge. */
export const MIN_RISK = 25;
/** Risk bands. Sev1 is reserved for things that have actually broken. */
export const RISK_HIGH = 70;
export const RISK_MEDIUM = 45;

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const times = (n: number) => `${round1(n)}×`;

/**
 * Latency is rising steadily rather than jumping.
 *
 * The shape a memory leak, a filling connection pool or an unbounded queue makes
 * — no single hour looks alarming, and the destination is a wall. Needs both a
 * large end-to-end ratio and a mostly-monotonic climb; either alone is a busy
 * afternoon.
 */
export function risingTrend(series: number[] | null): { rising: boolean; ratio: number } {
  if (!series || series.length < TREND_MIN_POINTS) return { rising: false, ratio: 1 };
  const clean = series.filter((v) => typeof v === 'number' && v > 0);
  if (clean.length < TREND_MIN_POINTS) return { rising: false, ratio: 1 };

  const first = clean[0];
  const last = clean[clean.length - 1];
  const ratio = last / first;
  let ups = 0;
  for (let i = 1; i < clean.length; i++) if (clean[i] > clean[i - 1]) ups++;
  // One dip is allowed. Real deterioration is noisy; demanding a perfectly
  // monotonic series would only ever fire on synthetic data.
  return { rising: ratio >= TREND_RATIO && ups >= clean.length - 2, ratio };
}

/** Every signal firing for one asset this pass. */
export function signalsFor(p: Pulse): Signal[] {
  const out: Signal[] = [];
  const hasBaseline = (p.baseline_samples ?? 0) >= MIN_BASELINE_SAMPLES;
  const enoughNow = p.checks_1h >= MIN_OBSERVED_CHECKS;

  // --- response time against its own normal ---
  if (hasBaseline && enoughNow && p.p95_1h && p.baseline_p95 && p.baseline_p95 > 0) {
    const ratio = p.p95_1h / p.baseline_p95;
    const delta = p.p95_1h - p.baseline_p95;
    if (ratio >= LATENCY_RATIO && delta >= LATENCY_ABS_MS) {
      out.push({
        code: 'latency',
        label: `Response time ${times(ratio)} its normal`,
        detail: `95th percentile is ${p.p95_1h}ms this hour against a baseline of ${p.baseline_p95}ms`,
        magnitude: round1(ratio),
        points: Math.min(45, (ratio - 1) * 22),
      });
    }
  }

  // --- the slow climb ---
  const trend = risingTrend(p.latency_by_hour);
  if (trend.rising) {
    out.push({
      code: 'latency_trend',
      label: `Response time climbing steadily — ${times(trend.ratio)} over the last hours`,
      detail: `Hourly averages: ${(p.latency_by_hour ?? []).map((v) => Math.round(v) + 'ms').join(' → ')}`,
      magnitude: round1(trend.ratio),
      points: Math.min(30, (trend.ratio - 1) * 20),
    });
  }

  // --- failing checks, short of the two-in-a-row that opens an incident ---
  if (enoughNow && p.failures_1h >= ERROR_MIN_FAILURES) {
    const observed = p.failures_1h / p.checks_1h;
    if (observed >= ERROR_MIN_RATE) {
      const base = Math.max(p.baseline_error_rate ?? 0, ERROR_RATE_FLOOR);
      const ratio = observed / base;
      out.push({
        code: 'error_rate',
        label: `${Math.round(observed * 100)}% of checks failing — ${times(ratio)} the normal rate`,
        detail: `${p.failures_1h} of ${p.checks_1h} checks failed in the last hour`,
        magnitude: round1(ratio),
        points: Math.min(50, 12 + observed * 130),
      });
    }
  }

  // --- spending the SLA's error budget faster than the month allows ---
  if (p.burn_rate_6h !== null && p.burn_rate_6h >= BURN_MIN_6H) {
    out.push({
      code: 'budget_burn',
      label: `Error budget burning at ${times(p.burn_rate_6h)} over six hours`,
      detail: p.health !== null
        ? `${p.health} health remaining against the contracted target`
        : 'Sustained at this rate the month misses its SLA target',
      magnitude: round1(p.burn_rate_6h),
      points: Math.min(30, p.burn_rate_6h * 6),
    });
  }

  // --- the failure class the probe cannot see: a 200 that is broken in a browser ---
  if (p.frontend_errors_1h >= FRONTEND_MIN_COUNT) {
    const median = Math.max(p.frontend_errors_median_hour ?? 0, 1);
    const ratio = p.frontend_errors_1h / median;
    if (ratio >= FRONTEND_RATIO) {
      out.push({
        code: 'frontend_errors',
        label: `Browser errors ${times(ratio)} the usual hour`,
        detail: `${p.frontend_errors_1h} errors reported by visitors' browsers this hour, against a typical ${round1(median)}`,
        magnitude: round1(ratio),
        points: Math.min(40, 8 + ratio * 3),
      });
    }
  }

  // --- what shipped. Context, never a cause. ---
  if (p.recent_change) {
    const mins = Math.round((Date.now() - new Date(p.recent_change.ts).getTime()) / 60_000);
    if (mins >= 0 && mins <= CHANGE_WINDOW_MIN) {
      const who = p.recent_change.actor ? ` by ${p.recent_change.actor}` : '';
      out.push({
        code: 'recent_change',
        label: `A ${p.recent_change.kind} landed ${mins} min ago${who}`,
        detail: p.recent_change.title ?? p.recent_change.ref,
        magnitude: null,
        // Correlation, and the wording says so everywhere it is shown. A deploy
        // is not evidence of a problem — plenty of deploys are fine — but a
        // deploy plus a latency jump is a much better place to start looking.
        points: 8,
        context: true,
      });
    }
  }

  return out;
}

/**
 * How much the evidence is worth believing.
 *
 * Driven by data volume, not by how bad the numbers look — that is risk's job.
 * Capped at 95: this is a statement about the future, and 100% confidence in one
 * of those is a lie however good the data is.
 */
export function confidenceFrom(p: Pulse, primary: Signal[]): number {
  const baseline = clamp((p.baseline_samples ?? 0) / MIN_BASELINE_SAMPLES, 0, 1);
  const observed = clamp(p.checks_1h / 12, 0, 1);
  // Independent signals agreeing is itself evidence: latency alone could be one
  // slow region, latency plus errors plus burn is the system telling you twice.
  const agreement = clamp((primary.length - 1) * 10, 0, 20);
  return Math.round(clamp(35 + baseline * 30 + observed * 15 + agreement, 0, 95));
}

const TITLES: Record<Exclude<SignalCode, 'recent_change'>, (n: string) => string> = {
  latency: (n) => `${n} is slowing down`,
  latency_trend: (n) => `${n} is deteriorating steadily`,
  error_rate: (n) => `${n} is starting to fail intermittently`,
  budget_burn: (n) => `${n} is running through its error budget`,
  frontend_errors: (n) => `${n} is throwing errors in visitors' browsers`,
};

const IMPACTS: Record<Exclude<SignalCode, 'recent_change'>, string> = {
  latency:
    'Users are waiting longer than usual. If it keeps rising, requests start timing out before the site is ever formally down.',
  latency_trend:
    'Nothing has failed yet, but the trend has a wall at the end of it — this is the shape a leak or a filling pool makes.',
  error_rate:
    'Some requests are already failing. The checks that pass are hiding the ones that do not.',
  budget_burn:
    'At this rate the month misses its contracted availability target, which is the number the client is shown.',
  frontend_errors:
    'The page is serving fine and breaking in the browser, so uptime looks perfect while users cannot complete what they came for.',
};

const RECOMMENDATIONS: Record<Exclude<SignalCode, 'recent_change'>, string> = {
  latency:
    'Check the slowest path first — database queries and third-party calls made during the request.',
  latency_trend:
    'Look for something that grows: memory, open connections, queue depth, a cache that never evicts.',
  error_rate:
    'Read the failing checks on the asset for the status code and stage, then the server logs for that window.',
  budget_burn:
    'Look at what has been failing over the last six hours rather than at this minute — the damage is cumulative.',
  frontend_errors:
    'Open the error list below: the grouped message and page usually name the broken deploy on their own.',
};

/**
 * One asset in, at most one warning out.
 *
 * Returns null when there is nothing worth saying — which is most assets, most
 * of the time, and is the point.
 */
export function analyze(p: Pulse, now: Date = new Date()): Warning | null {
  // Already broken. An "early warning" about a thing that has visibly failed is
  // a second page for an incident someone is already holding, and it is how a
  // tool teaches people to ignore it.
  if (p.open_incident_id) return null;
  // Someone said they were deploying. Believe them.
  if (p.maintenance_until && new Date(p.maintenance_until) > now) return null;

  const signals = signalsFor(p);
  const primary = signals.filter((s) => !s.context);
  if (!primary.length) return null;

  const base = signals.reduce((sum, s) => sum + s.points, 0);
  // Correlated signals are worth more than their sum: three symptoms of one
  // cause is a stronger statement than three unrelated readings.
  const correlation = primary.length >= 2 ? 10 : 0;
  const risk = Math.round(clamp(base + correlation, 0, 99));
  if (risk < MIN_RISK) return null;

  const dominant = [...primary].sort((a, b) => b.points - a.points)[0];
  const kind = dominant.code as Exclude<SignalCode, 'recent_change'>;
  const change = signals.find((s) => s.code === 'recent_change');

  return {
    asset_id: p.asset_id,
    org_id: p.org_id,
    kind,
    risk,
    confidence: confidenceFrom(p, primary),
    severity: risk >= RISK_HIGH ? 2 : risk >= RISK_MEDIUM ? 3 : 4,
    title: TITLES[kind](p.asset_name),
    impact: IMPACTS[kind],
    recommendation: change
      ? `${RECOMMENDATIONS[kind]} Start with the change that landed just before this — it correlates in time, which is not the same as having caused it.`
      : RECOMMENDATIONS[kind],
    evidence: signals.map(({ points: _points, ...rest }) => rest),
  };
}

// ------------------------------------------------------------- notification ---

/** Subject and body for the one message a warning is allowed to send. */
export function warningSubject(w: Warning): string {
  return `[Early warning] ${w.title} — ${w.risk}% risk`;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function warningHtml(w: Warning, assetName: string): string {
  return `<p><b>${escapeHtml(w.title)}</b></p>
<p>Merik has not seen an outage. It has seen ${escapeHtml(assetName)} behaving differently
from its own normal, and this is the early notice.</p>
<table cellpadding="6">
  <tr><td>Risk</td><td><b>${w.risk}%</b> — how bad the evidence looks</td></tr>
  <tr><td>Confidence</td><td><b>${w.confidence}%</b> — how much evidence there is</td></tr>
</table>
<p><b>Why:</b></p>
<ul>${w.evidence.map((e) => `<li>${escapeHtml(e.label)}</li>`).join('')}</ul>
<p><b>Likely impact:</b> ${escapeHtml(w.impact)}</p>
<p><b>Where to look:</b> ${escapeHtml(w.recommendation)}</p>
<p style="color:#666;font-size:12px">This is a prediction from measured deviation, not a
statement of fact. It may come to nothing — and Merik will close it by itself if it does.</p>`;
}

export const warningSlackText = (w: Warning) =>
  `:warning: *Early warning* — ${w.title}\n` +
  `Risk ${w.risk}% · confidence ${w.confidence}% · nothing is down yet\n` +
  w.evidence.map((e) => `• ${e.label}`).join('\n');

/** Kept exported so index.ts and the tests agree on what a change looks like. */
export type { RankedChange };
