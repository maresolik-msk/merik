// Rendering for the public status page.
//
// This is the only Merik surface an unauthenticated stranger can read, so the
// rule here is narrow: it shows what an agency would be happy for a client to
// see, and nothing else. Everything on this page comes from an explicit
// allowlist rather than from spreading a database row.
//
// Specifically NOT rendered: check errors, status codes, failure stages,
// internal incident titles, employee names, asset URLs, other clients' assets.
// The only prose a client sees is `client_summary`, which a human wrote and
// approved.

export interface PublicAsset {
  name: string;
  status: string;
  uptime_pct: number | null;
  sla_tier: string;
}

export interface PublicIncident {
  started_at: string;
  resolved_at: string | null;
  summary: string;
}

export interface StatusPageData {
  title: string;
  intro: string | null;
  assets: PublicAsset[];
  incidents: PublicIncident[];
  generatedAt: string;
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// Client-facing vocabulary. The internal states are engineering words, and
// "degraded" on a page a client's CEO is reading means something different than
// it does in a runbook.
const PUBLIC_STATUS: Record<string, { label: string; tone: string }> = {
  operational: { label: 'Operational', tone: 'ok' },
  degraded: { label: 'Degraded performance', tone: 'warn' },
  down: { label: 'Service disruption', tone: 'bad' },
  maintenance: { label: 'Under maintenance', tone: 'info' },
  unknown: { label: 'Not yet reported', tone: 'idle' },
};

export const publicStatus = (s: string) =>
  PUBLIC_STATUS[s] ?? { label: 'Not yet reported', tone: 'idle' };

/** Worst asset state wins the headline — an average would hide a dead checkout. */
export function overallStatus(assets: PublicAsset[]): { label: string; tone: string } {
  const rank = ['down', 'degraded', 'maintenance', 'unknown', 'operational'];
  for (const state of rank) {
    if (assets.some((a) => a.status === state)) {
      if (state === 'operational') break;
      return publicStatus(state);
    }
  }
  return assets.length
    ? { label: 'All systems operational', tone: 'ok' }
    : { label: 'No services being monitored yet', tone: 'idle' };
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtUptime = (pct: number | null) => (pct === null ? '—' : `${pct.toFixed(2)}%`);

const slaText = (tier: string) => (tier === 'best_effort' ? 'Best effort' : `${tier}% target`);

export function renderStatusPage(d: StatusPageData): string {
  const overall = overallStatus(d.assets);
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(d.title)} — Status</title>
<style>
:root{color-scheme:light dark;--bg:#f7f8fa;--card:#fff;--ink:#12141a;--muted:#666e7d;--line:#e6e8ec;
--ok:#1e8e5a;--warn:#b7791f;--bad:#c0392b;--info:#1f618d;--idle:#8a919e}
@media (prefers-color-scheme:dark){:root{--bg:#0d1117;--card:#161b22;--ink:#e6edf3;--muted:#8b949e;--line:#272d36}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:760px;margin:0 auto;padding:40px 20px 64px}
h1{font-size:24px;margin:0 0 4px}
.intro{color:var(--muted);margin:0 0 28px}
.head{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:22px}
.overall{font-size:19px;font-weight:700;display:flex;align-items:center;gap:10px}
.dot{width:11px;height:11px;border-radius:50%;flex:none}
.ok .dot,.dot.ok{background:var(--ok)}.warn .dot,.dot.warn{background:var(--warn)}
.bad .dot,.dot.bad{background:var(--bad)}.info .dot,.dot.info{background:var(--info)}
.idle .dot,.dot.idle{background:var(--idle)}
.ok{color:var(--ok)}.warn{color:var(--warn)}.bad{color:var(--bad)}.info{color:var(--info)}.idle{color:var(--idle)}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:26px 0 10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.row{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line)}
.row:last-child{border-bottom:0}
.nm{font-weight:600;flex:1;min-width:0}
.sub{color:var(--muted);font-size:12.5px;font-weight:400}
/* Both columns are fixed-width so the percentages line up down the page. Status
   labels vary from "Operational" to "Degraded performance", and without this the
   uptime figures wander left and right by 60px per row. */
.st{font-size:13px;font-weight:600;display:flex;align-items:center;gap:7px;white-space:nowrap;
min-width:172px}
.up{color:var(--muted);font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap;
min-width:84px;text-align:right}
.inc{padding:14px 18px;border-bottom:1px solid var(--line)}.inc:last-child{border-bottom:0}
.inc .when{color:var(--muted);font-size:12.5px;margin-bottom:3px}
.none{padding:26px 18px;text-align:center;color:var(--muted)}
.foot{margin-top:26px;text-align:center;color:var(--muted);font-size:12px}
/* On a phone the fixed columns above do not fit: they crush the service name to
   one word per line and push the card past the viewport. Below this width the
   name takes its own line and status/uptime share the next one. */
@media(max-width:560px){
.row{flex-wrap:wrap;gap:4px 12px;padding:13px 16px}
.nm{flex:1 0 100%}
.st{min-width:0;order:2}
.up{min-width:0;order:3;margin-left:auto;display:flex;align-items:baseline;gap:6px}
.up .sub{display:inline}
}
</style></head>
<body><div class="wrap">
<h1>${esc(d.title)}</h1>
${d.intro ? `<p class="intro">${esc(d.intro)}</p>` : ''}

<div class="head ${overall.tone}">
  <div class="overall"><span class="dot"></span>${esc(overall.label)}</div>
</div>

<h2>Services</h2>
<div class="card">${
    d.assets.length
      ? d.assets.map((a) => {
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
    d.incidents.length
      ? d.incidents.map((i) => `<div class="inc">
    <div class="when">${esc(fmtDate(i.started_at))}${
        i.resolved_at ? ` · resolved ${esc(fmtDate(i.resolved_at))}` : ' · ongoing'
      }</div>
    <div>${esc(i.summary)}</div>
  </div>`).join('')
      : '<div class="none">No incidents reported.</div>'
  }</div>

<div class="foot">Updated ${esc(fmtDate(d.generatedAt))} · Monitored by Merik</div>
</div></body></html>`;
}
