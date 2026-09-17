# Merik — Design System

Source of truth: the `<style>` block at the top of `app/index.html` (tokens on
`:root`, then rules) and `assets/css/site.css` for the marketing site. When this
document and the code disagree, the code wins; update this file in the same
commit as the change.

Rules of thumb, borrowed from the house system: the brand red is used for
exactly three things (the primary action, the active state, focus); everything
else is ink, white and warm grey; the shell is dark and work surfaces are
light; base radius 10px; one hairline shadow on cards; hover on primary and
outlined buttons inverts to ink.

---

## 1. Brand

| Item | Value | Where |
|---|---|---|
| Brand red | `#CA3934` (`--brand`) | `:root` in `app/index.html` |
| Brand red, pressed | `#B0302C` (`--brand-d`) | hover on danger buttons |
| Cloud Dancer (secondary) | `#F0EEE9` (`--cloud`) | page ground, quiet fills, the active nav row |
| Ink | `#15161A` (`--ink`) | text, primary buttons on hover |
| Shell | `#110101` (`--sidebar`), footer strip `#1A0B0B` (`--sidebar-2`) | sidebar, mobile drawer |
| Wordmark on red | `assets/Merik Logo - Brand colour.png` (source, 3200×1000) → `assets/images/wordmark-badge.png` (480 wide) | sidebar brand row, mobile top bar |
| Round mark on red | `assets/Merik Favicon - Brand colour.png` (source, 1600×1600) → `assets/images/mark-badge.png` (96) | sidebar icon rail |
| Wordmark on white | `assets/images/wordmark.png` | marketing site header and footer |
| ME mark | `assets/images/logo-96.png` | login page, document fallbacks |
| Typeface | **Inter** 400–900 via Google Fonts; fallback `-apple-system, 'Segoe UI', Arial, sans-serif` | `@import` at the top of the style block |

To change the brand red: edit `--brand` and `--brand-d` on `:root`, then search
the style block for `rgba(202,57,52` (focus rings and tints carry the red as
RGBA) and update those, then regenerate the two badge images from new sources.

---

## 2. Colour tokens (`:root`, light)

| Token | Value | Used for |
|---|---|---|
| `--brand` | `#CA3934` | primary buttons, active nav, focus ring, links, icon tiles |
| `--brand-d` | `#B0302C` | danger button hover |
| `--brand-soft` | `#FCEEEC` | pale red tints: icon tiles, empty-state tile |
| `--cloud` | `#F0EEE9` | page ground (`--bg`), surfaces (`--surface`), active nav row |
| `--bg` | `var(--cloud)` | body background |
| `--surface` | `var(--cloud)` | table headers, secondary fills, task-row cards |
| `--card` | `#FFFFFF` | cards, dialogs, inputs |
| `--line` | `#ECECEC` | hairline borders, table rules |
| `--input` | `#CFCBC3` | input borders, outlined-button borders |
| `--ink` | `#15161A` | headings, primary text |
| `--body` | `#41454E` | body text |
| `--muted` | `#767B85` | labels, hints, secondary text |
| `--destructive` | `#8E1F17` | destructive buttons (outlined; fills on hover) |
| `--green` / `--amber` / `--red` | `#1E8449` / `#B45309` / `#C0392B` | status only, never accents |
| `--sidebar` / `--sidebar-2` | `#110101` / `#1A0B0B` | shell ground, footer strip |
| `--radius` / `--radius-sm` | `10px` / `8px` | cards, buttons, inputs / small buttons |
| `--shadow-card` | `0 1px 2px rgba(0,0,0,.035)` | the only shadow on surfaces |
| `--shadow-lg` | `0 18px 50px rgba(20,20,25,.13)` | dialogs and pop-overs only |

Legacy aliases (`--navy`, `--deep`, `--mid`, `--orange`, `--lblue`) still exist
for old code and map onto the tokens above. Do not use them in new code.

Dark theme: `:root[data-theme="dark"]` redefines the same tokens (ground
`#141416`, card `#1C1C20`, ink `#F2F1EE`, input `#3A3B42`, destructive
`#E88079`); components are styled through tokens, never through literals, so
they follow. The user picks Light / Dark / System in the profile menu; the
choice is stored per browser under `merik-theme`.

---

## 3. Typography

| Role | Spec |
|---|---|
| Body | 14px / 1.5, Inter, antialiased |
| Page title (`.pghead h2`) | 23px, 700, letter-spacing -.4px, with a muted 13.5px subtitle |
| Section heading (`h2`) | 20px, 700 |
| Card heading (`h3`) | 16px, 600 |
| Label | 11px, 600, uppercase, letter-spacing .06em, muted; a `<span>` inside a label is an explainer and renders normal case, regular weight |
| KPI label (`.klabel`) | 11px, 600, uppercase, .06em, muted |
| KPI value (`.kval`) | 24px, 800, tabular numerals |
| Table header (`th`) | 11.5px, 700, uppercase, .4px |
| Table cell (`td`) | 13px, tabular numerals |
| Badge (`.badge`) | 11.5px, 700, pill |

---

## 4. Components

**Button** (`.btn`, min-height 40px, padding 8px 16px, radius 10px, 13.5px 600)
- Primary: brand red, white text → hover inverts to ink.
- `.sec` (outlined): white, ink text, `--input` border → hover inverts to ink.
- `.warn` (destructive): outlined in `--destructive` → fills on hover. Used for Delete, Remove, Disconnect, Withdraw, Dismiss.
- `.sm`: min-height 32px, 12px text, radius 8px.
- Press: `translateY(1px)`. No hover lift, no coloured shadow.

**Input / select / textarea**: 1px `--input` border, radius 10px, padding 9px 11px; focus = ink border + 2px brand ring at 35%; a wrong value gets `.miss` (red border, pale red fill) via `miss(el, msg)`, cleared on the next keystroke.

**Password field**: every `input[type=password]` gets a show/hide eye automatically (`enhancePasswords`).

**Card** (`.card`): white, hairline border, radius 10px, `--shadow-card`, padding 20px.

**KPI tile** (`tile()` / `kpis()` / `stat()`): 40px icon tile on a tint, uppercase label, 24px tabular value, muted sub-line, optional sparkline. Every number on every page renders through this.

**Badge / status chip** (`.badge` + `stP stA stL stH stW stOL stUL`): pill; add `<span class="dot">` for a colour dot and a `<b class="num">` count.

**Table**: auto text filter and numbered pager above 4 rows; rows stack into labelled cards under 768px; an empty table shows its `data-empty` message (default "Nothing here yet.").

**Dialog** (`modal(html)`): centred card, `--shadow-lg`; Escape and backdrop close; a dialog someone typed in asks before discarding; `confirmDialog()` and `promptDialog()` replace the browser's boxes. The daily update dialog keeps a draft instead of asking.

**Empty state** (`.empty`): 48px tinted icon tile, 16px heading, one line, one action.

**Toast**: bottom-right, tone inferred from wording; errors stay until dismissed.

**Pulse card** (`.pulse`): 320px card bottom-right, five brand-red stars, one optional line, "Not now".

---

## 5. Shell

| Region | Spec |
|---|---|
| Sidebar | 262px, ground `--sidebar`, brand row `--brand` with the wordmark badge (30px tall) and the collapse control (white at 18%) |
| Nav item | 13.5px 500, `#C9C7C1`, padding 9px 12px, radius 9px; grouped items indent to 26px at 13px |
| Group header | 10.5px 700 uppercase `#88867F`; turns `#F0A9A2` with a red dot when its group holds the active page; Settings sits under a divider |
| Active page | Cloud Dancer row (`--cloud`), ink text (`#110101`), brand-red icon, 4px brand-red bar at the sidebar edge |
| Icon rail | 68px, the round mark on the red brand row, labels as tooltips, groups as dividers, footer stacked; remembered under `merik.nav.mini` |
| Footer | profile button (avatar, name, role) opening the profile menu: email, role, workspace, Light / Dark / System, sign out; bell; sign-out icon |
| Mobile (≤768px) | brand-red top bar with the wordmark badge and menu button; sidebar becomes a drawer |
| Content | `#main`, ground `--cloud`; pages open with `pgh()` and a KPI row |

---

## 6. Where to change what

| Want to change | Edit |
|---|---|
| Any colour | the token on `:root` (and its dark twin) in `app/index.html` |
| Brand red everywhere | `--brand`, `--brand-d`, the `rgba(202,57,52` occurrences, the two badge images |
| Logos | replace the two source files in `assets/`, regenerate `wordmark-badge.png` (`sips -Z 480`) and `mark-badge.png` (`sips -Z 96`) |
| Button look | the `.btn`, `.btn.sec`, `.btn.warn`, `.btn.sm` rules |
| Sidebar | the `#side …` rules; the active state is `#side a.act` and `#side a.act::before` |
| Labels, inputs | the `label` and `input,select,textarea` rules |
| Status colours | `.badge` and the `.st*` classes |
| KPI tiles | `tile()` and the `.kpi-tile / .klabel / .kval / .ksub` rules |
| Marketing site | `assets/css/site.css`; its header and footer come from `scripts/site_chrome.py` |
