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
