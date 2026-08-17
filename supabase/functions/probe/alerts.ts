// When an incident is allowed to reach a human, and what it says when it does.
//
// Kept separate from the sending because the timing rule is the part with edge
// cases worth testing, and the SMTP call is the part that cannot be tested here
// at all.
//
// The rule (blueprint §9.2): a Sev1 pages at any hour, everything else waits for
// working hours in the recipient's timezone. Merik does not model per-employee
// timezones — `employees` has no such column, and `attendance.shift` is about
// attendance, not on-call — so this uses one tenant-wide offset.
//
// ponytail: fixed IST offset. Every tenant is on ap-south-1 with INR payroll and
// GSTIN, so this is right today and wrong the day Merik sells outside India.
// Move to a per-org timezone column then; the shape of the rule does not change.
export const ALERT_TZ_OFFSET_MIN = 330; // Asia/Kolkata, no DST to worry about
export const WORKING_START_HOUR = 9;
export const WORKING_END_HOUR = 19;

/** Sev1 goes out immediately; lower severities hold until working hours. */
export function shouldAlertNow(severity: number, now: Date): boolean {
  if (severity <= 1) return true;
  const local = new Date(now.getTime() + ALERT_TZ_OFFSET_MIN * 60_000);
  const hour = local.getUTCHours();
  return hour >= WORKING_START_HOUR && hour < WORKING_END_HOUR;
}

// Severity from how fast the asset is spending its error budget, not from a
// criticality flag somebody set at registration time (blueprint §8.4, Google's
// multi-window model). Each rate is only meaningful against its own window: 6×
// measured over one hour is noise, 6× over six hours is an outage.
//
//   1h  ≥ 14.4×  → 2% of the monthly budget gone, exhausted in ~2 days  → Sev1
//   6h  ≥ 6×     → 5% gone, exhausted in ~5 days                        → Sev2
//   3d  ≥ 1×     → will miss the SLO                                    → Sev3
export const BURN_SEV1_1H = 14.4;
export const BURN_SEV2_6H = 6;
export const BURN_SEV3_3D = 1;

export interface BurnRates {
  burn_rate_1h: number | null;
  burn_rate_6h: number | null;
  burn_rate_3d: number | null;
}

/**
 * `fallback` is used when the asset has no error budget to burn — a best_effort
 * tier has no contracted target, so there is nothing to measure against and the
 * declared criticality is the only signal available.
 */
export function severityFromBurn(rates: BurnRates | null, fallback: number): number {
  if (!rates) return fallback;
  const { burn_rate_1h: h1, burn_rate_6h: h6, burn_rate_3d: d3 } = rates;
  if (h1 === null && h6 === null && d3 === null) return fallback;
  if (h1 !== null && h1 >= BURN_SEV1_1H) return 1;
  if (h6 !== null && h6 >= BURN_SEV2_6H) return 2;
  if (d3 !== null && d3 >= BURN_SEV3_3D) return 3;
  // Burning, but slowly enough that it will not miss the SLO. Worth a ticket,
  // not worth interrupting anyone.
  return 4;
}

export interface AlertIncident {
  title: string;
  severity: number;
  started_at: string;
  cause_category: string | null;
  assetName: string;
  assetUrl: string | null;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export const alertSubject = (i: AlertIncident) =>
  `[Sev${i.severity}] ${i.assetName} is not responding`;

/**
 * The internal alert. Deliberately not sanitised for a client audience — this
 * goes to the engineer who owns the asset, and hiding the failure stage from
 * them would be hiding the only useful part. Client-facing wording is a
 * separate, human-approved field on the incident.
 */
export function alertHtml(i: AlertIncident, pageUrl?: string): string {
  const rows: [string, string][] = [
    ['Asset', i.assetName],
    ['Severity', `Sev${i.severity}`],
    ['Started', new Date(i.started_at).toUTCString()],
  ];
  if (i.assetUrl) rows.push(['URL', i.assetUrl]);
  if (i.cause_category) rows.push(['Failed at', i.cause_category]);

  return `<p><b>${escapeHtml(i.title)}</b></p>
<table cellpadding="6">${
    rows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td><b>${escapeHtml(v)}</b></td></tr>`).join('')
  }</table>
<p>Merik detected this automatically after consecutive failed checks from its probe.
It will resolve itself when the checks pass again.</p>${
    pageUrl ? `<p><a href="${escapeHtml(pageUrl)}">Open Digital Operations</a></p>` : ''
  }`;
}

/** Slack's incoming-webhook payload. Plain text: no blocks, no attachments. */
export const slackText = (i: AlertIncident) =>
  `:rotating_light: *Sev${i.severity}* — ${i.title}` +
  (i.assetUrl ? `\n${i.assetUrl}` : '') +
  (i.cause_category ? `\nFailed at: ${i.cause_category}` : '');
