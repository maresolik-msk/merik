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
├── supabase/
│   ├── migrations/     # Schema — the source of truth for the database
│   └── functions/      # Edge Functions (payroll, email, uptime probe, …)
├── docs/
│   └── STRUCTURE.md    # Detailed structure & routing reference
├── README.md
└── .gitignore
```

See [docs/STRUCTURE.md](docs/STRUCTURE.md) for full details.

## Where features go

**`app/index.html` is the application.** It is a single self-contained file, and
every user-facing feature belongs in it. There is no separate frontend project
and no framework rebuild — one existed under `web/` and was removed, because new
work kept landing in a surface that was never deployed while the app people
actually use went without it.

Backend work goes in `supabase/` — `migrations/` for schema, `functions/` for
anything privileged or scheduled.

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
