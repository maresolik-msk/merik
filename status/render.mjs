// Rendering for the public status page.
//
// Plain ESM with no platform APIs, so the same file is loaded by the browser
// (status/index.html) and imported by the test suite. One renderer, one set of
// tests — the alternative was a copy in each and a slow drift between them.
//
// The security boundary is upstream: the `status` Edge Function decides which
// rows exist at all. This file's job is presentation, and escaping — everything
// here is emitted from an explicit allowlist rather than by spreading a row.

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Client-facing vocabulary. The internal states are engineering words, and
// "degraded" on a page a client's CEO is reading means something different than
// it does in a runbook.
const PUBLIC_STATUS = {
  operational: { label: 'Operational', tone: 'ok' },
  degraded: { label: 'Degraded performance', tone: 'warn' },
  down: { label: 'Service disruption', tone: 'bad' },
  maintenance: { label: 'Under maintenance', tone: 'info' },
  unknown: { label: 'Not yet reported', tone: 'idle' },
};

export const publicStatus = (s) => PUBLIC_STATUS[s] ?? { label: 'Not yet reported', tone: 'idle' };

/** Worst asset state wins the headline — an average would hide a dead checkout. */
export function overallStatus(assets) {
  for (const state of ['down', 'degraded', 'maintenance', 'unknown']) {
    if (assets.some((a) => a.status === state)) return publicStatus(state);
  }
  return assets.length
    ? { label: 'All systems operational', tone: 'ok' }
    : { label: 'No services being monitored yet', tone: 'idle' };
}

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtUptime = (pct) => (pct === null || pct === undefined ? '—' : `${Number(pct).toFixed(2)}%`);

const slaText = (tier) => (tier === 'best_effort' ? 'Best effort' : `${tier}% target`);

/** The contents of <div class="wrap">. The document shell lives in index.html. */
export function renderStatusBody(d) {
  const assets = d.assets ?? [];
  const incidents = d.incidents ?? [];
  const overall = overallStatus(assets);

  return `<h1>${esc(d.title)}</h1>
${d.intro ? `<p class="intro">${esc(d.intro)}</p>` : ''}

<div class="head ${overall.tone}">
  <div class="overall"><span class="dot"></span>${esc(overall.label)}</div>
</div>

<h2>Services</h2>
<div class="card">${
    assets.length
      ? assets.map((a) => {
        const st = publicStatus(a.status);
        return `<div class="row">
    <span class="nm">${esc(a.name)}<div class="sub">${esc(slaText(a.sla_tier))}</div></span>
    <span class="up">${fmtUptime(a.uptime_pct)}<div class="sub">30 days</div></span>
    <span class="st ${st.tone}"><span class="dot ${st.tone}"></span>${esc(st.label)}</span>
  </div>`;
      }).join('')
      : '<div class="none">No services are being monitored yet.</div>'
  }</div>

<h2>Recent incidents</h2>
<div class="card">${
    incidents.length
      ? incidents.map((i) => `<div class="inc">
    <div class="when">${esc(fmtDate(i.started_at))}${
        i.resolved_at ? ` · resolved ${esc(fmtDate(i.resolved_at))}` : ' · ongoing'
      }</div>
    <div>${esc(i.summary)}</div>
  </div>`).join('')
      : '<div class="none">No incidents reported.</div>'
  }</div>

<div class="foot">Updated ${esc(fmtDate(d.generatedAt))} · Monitored by Merik</div>`;
}
