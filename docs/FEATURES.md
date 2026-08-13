# Merik — Features & Modules

Merik is a multi-tenant workforce suite. Every company gets one isolated
workspace (an "org"), enforced in Postgres by row-level security. There are
three roles, each with its own navigation and its own set of modules:

| Role | Who | Sees |
|---|---|---|
| `superadmin` | Merik (the product owner) | Cross-tenant product control plane |
| `admin` | The customer's HR/management | All tenant modules enabled for their org |
| `employee` | The customer's staff | Their own work only ("My …" pages) |

The super admin enables/disables whole modules per tenant (`orgs.modules`).
Dashboard and Settings are always on; unchecking a module hides it from that
tenant's admins and removes those views from their allowed set.

---

## 1. Admin modules

### Dashboard
Landing page with KPI tiles, today's activity and product announcements pushed
by the super admin.

### Employee Management
- **Employees** — directory, add/edit, per-employee detail page, document
  emailing, employee login creation (Supabase auth user provisioned via the
  `create-employee-login` edge function), offboarding (remove, last-working-day,
  restore).
- **Salary & Hikes** — CTC history, salary revisions, effective-CTC resolution.
- **Payroll** — monthly payroll compute/save (all salary math runs server-side in
  the `payroll` edge function, never in the browser), auto-fill from CTC plus
  attendance, payslip generation and email delivery (single or bulk).
- **Performance** — monthly performance reviews, optionally AI-drafted from the
  employee's task log and attendance (draft only, always human-edited; the edit
  distance is captured as a learning signal).

### Team Management
- **Attendance** — daily attendance grid, admin edits, late-mark/half-day rules.
- **WFH & Leave** — employee requests with date ranges, admin approval flow, and
  each employee's leave balance shown on the row being approved.
- **Holidays** — company holiday calendar feeding attendance and payroll.

### Task Management
- **Task Log** — daily task entries per employee with client/project, time spent,
  status, blockers and proof links. Filtering by period, client, employee and
  free-text search, with pagination and CSV export.
- **Monthly Tracker** — month-at-a-glance grid of who logged what.
- **Task Insights** — analytics over the task log plus `predictTime()`, a local
  similarity-based time estimator. It is **not** an LLM: it scores tasks by token
  overlap, project and client, and `tuneTimeModel()` backtests its own weights
  leave-one-out against tasks whose actual time is known, keeping whichever
  settings minimise median error.
- **Project Intelligence** — project-level rollup: stage/journey stepper,
  contributor avatars, sparklines, per-project drill-down.

### Client Management
- **Clients** — client records with auto-derived client codes.
- **Projects** — projects per client (unique per client), descriptions, bulk
  edit/delete.
- **Fix Project Names** — admin repair screen that attaches historical,
  free-typed project names on task entries to real project records (guess,
  review, apply per-row or in bulk).
- **Quotes & Invoices** — line-item documents, quote → invoice conversion,
  printable/editable HTML output with reset-to-template.

### Asset Management
- **Assets** — hardware inventory, assignment to employees, return, full
  assignment history.
- **Software** — software subscriptions, seat management (or per-user access),
  and monthly spend tracking per tool.

### Settings
- **Company Settings** — org profile, logo upload, workspace preferences.
- **Feedback** — the tenant admin's view of feedback raised inside their org.

---

## 2. Employee self-service

- **My Dashboard** — personal summary.
- **Task Log** — log daily work, with time suggestions from the employee's own
  history and project/client pickers.
- **My Attendance** — geolocated check-in / check-out (reverse-geocoded place
  name) and personal attendance history.
- **WFH / Leave** — raise requests, see what each one costs before sending it,
  withdraw a mistyped one while it is still pending, and track the yearly leave
  balance (1 day earned per month, rolls over, resets 1 January).
- **Notes & To-Do** — a personal task sheet (`emp_tasks`) plus notes; sheet items
  can be promoted straight into the official task log.
- **My Payslips** — download personal payslips.
- **Feedback** — send product feedback to Merik.

---

## 3. Super admin (product control plane)

- **Overview / Analytics** — cross-tenant usage.
- **Tenants** — create, edit, suspend and delete tenant orgs; toggle which
  modules each tenant may use.
- **Users** — create users, change roles, reset passwords, delete.
- **Signup Requests** — inbound marketing-site signups; approve (provisions the
  workspace and emails credentials via `review-signup`) or reject.
- **Feedback** — product feedback from every tenant, with status and replies.
- **Announcements** — in-app banners pushed to all tenants.
- **AI Control** — the whole AI surface: provider keys, master switch,
  per-feature flags, per-tenant grants and monthly call caps.

---

## 4. AI subsystem

One edge function (`supabase/functions/ai`) is the only thing in the product
that talks to an LLM. Multi-provider: Anthropic (Claude), OpenAI, Google
(Gemini), xAI (Grok), or any OpenAI-compatible endpoint — the super admin adds
keys and picks the active one.

Four gates, all fail-closed: master switch → per-feature flag → per-tenant grant
→ monthly call cap. Provider keys are stored only as AES-GCM ciphertext,
encrypted with a secret held by the edge function; the dashboard only ever sees
`····last4`.

Features: `performance_summary` (admin), `quote_draft` (admin),
`task_time_suggest` (employee), plus superadmin key management.

Cost control: prompts are condensed before sending (~-62% on real data), and the
SHA-256 of the condensed payload is a cache key — an unchanged task log re-serves
the stored draft for zero tokens, and editing the log invalidates it
automatically. `ai_feedback` records draft vs. final text as a learning signal.

Callers send IDs, never data — the gateway re-fetches every row itself scoped to
the caller's own `org_id`, so a foreign ID can never leak another tenant's data.
See [docs/AI.md](AI.md).

---

## 5. Platform & infrastructure

- **Backend** — Supabase (Postgres + Auth + RLS + Edge Functions).
- **Edge functions** — `ai`, `payroll`, `send-email`, `create-employee-login`,
  `review-signup`, `notify-lead`, `su-manage`.
- **Email** — SMTP-backed transactional mail (welcome credentials, payslips,
  employee documents, new-lead alerts). Tenant admins may only email addresses
  belonging to employees in their own org, so it can't act as an open relay.
- **Auth** — Supabase Auth, cookie sessions, role stored on the profile.
- **Apps**
  - `index.html`, `features.html`, `modules.html`, `how-it-works.html`, `blog/` —
    the static marketing site and content blog.
  - `app/index.html` — the production application (single-file SPA), and the
    only place user-facing features are built.
  - `supabase/` — schema migrations and Edge Functions (payroll, email, the
    Digital Operations uptime probe). Unit-tested with `deno test`, CI via
    GitHub Actions.
- **Deployment** — Vercel; marketing site at `/`, application at `/app/`.
