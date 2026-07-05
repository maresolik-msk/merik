# Merik — Workforce Suite

An all-in-one workforce platform for employee management, attendance, leave,
payroll, and daily task tracking — one secure workspace per company.

## Project layout

```
merik/
├── index.html          # Marketing landing page  → served at /
├── app/
│   └── index.html      # Merik Workforce Suite app → served at /app/
├── assets/
│   └── images/         # Logos, screenshots, static images
├── web/               # NEW: Next.js app (proper rebuild, in progress)
├── docs/
│   └── STRUCTURE.md    # Detailed structure & routing reference
├── README.md
└── .gitignore
```

See [docs/STRUCTURE.md](docs/STRUCTURE.md) for full details.

## New app (`web/`) — the proper rebuild

The legacy app is a single `app/index.html` file. We are migrating it to a
properly engineered stack **incrementally** (the live app keeps working):

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind v4** + custom UI components
- **Supabase** typed client (`@supabase/ssr`) — auth via cookies, RLS enforced
- **TanStack Query** (server state) + **Zod** (validation)

Status: foundation + **Employees** module migrated end-to-end (auth, protected
routes, dashboard, employees list/pagination/add-edit). More modules to follow.

```bash
cd web
cp .env.example .env.local   # fill in Supabase URL + anon key
npm install
npm run dev                  # http://localhost:3000
```

## Running locally

It's a static site — open the files directly or serve the folder:

```bash
python3 -m http.server 8000
# Landing → http://localhost:8000/
# App     → http://localhost:8000/app/
```

## Tech

- Static HTML/CSS/JS (self-contained, no build step)
- [Supabase](https://supabase.com) for the application's backend/auth

## Deployment

The site is deployed from the `main` branch. The marketing page lives at the
root (`/`) and the application at `/app/`.
