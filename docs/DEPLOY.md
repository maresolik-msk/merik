# Deploying the new app (`web/`)

The new Next.js app lives in `web/` and is production-ready (`npm run build`
passes; CI is green). It is **not deployed yet**. Deploy it as its **own Vercel
project** so the live marketing site (root of this repo) stays untouched — this
is the safe, incremental cutover.

## 1. Create a Vercel project for `web/`

Vercel dashboard → **Add New → Project** → import `maresolik-msk/merik`, then:

| Setting | Value |
|---|---|
| **Root Directory** | `web` |
| Framework Preset | Next.js (auto-detected) |
| Build Command | `next build` (default) |
| Install Command | `npm ci` (default) |
| Node.js Version | 24.x |

Name it e.g. **`merik-app`** (gives `merik-app.vercel.app`).

## 2. Environment variables

Add these (Project → Settings → Environment Variables, all environments):

```
NEXT_PUBLIC_SUPABASE_URL=https://cohifrzskydnozpmieov.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_-o5UbAkbstAxZRZ5Tqs6mA_sADPbnOP
```

These are the **public** (publishable) keys — safe for the browser. They match
`web/.env.local`. No service-role key is needed (payroll runs in the Edge
Function, which already has its own secrets on Supabase).

## 3. Update Supabase Auth URLs

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://merik-app.vercel.app`
- **Redirect URLs:** add `https://merik-app.vercel.app/**`

(Email/password login doesn't strictly need redirect URLs, but set these so
future magic-link / OAuth / password-reset flows work.)

## 4. Deploy & verify

Vercel auto-deploys on push to `main`. After the first deploy:

1. Open `https://merik-app.vercel.app/login`
2. Sign in and click through every module (Employees → … → Invoices)
3. Confirm Payroll computes (it calls the `payroll` Edge Function)

## 5. Cutover (later, when you're confident)

Once the new app is trusted:

- Point the marketing "Sign In" / "Get Started" buttons (`href="app/"` in
  `index.html`, `features.html`, etc.) at `https://merik-app.vercel.app`.
- Optionally attach a custom domain (e.g. `app.merik.com`) to the `merik-app`
  project and use that instead.
- Retire the legacy `app/index.html` when no longer needed.

## Notes

- The two projects share the **same Supabase backend**, so data is identical in
  both the old and new app during the transition.
- Local dev: `cd web && npm run dev` (uses `web/.env.local`).
- Tests/CI: `npm run lint && npm run typecheck && npm test` (run in CI on every
  push). E2E: `E2E_EMAIL=… E2E_PASSWORD=… npx playwright install chromium && npm run test:e2e`.
