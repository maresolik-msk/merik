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

`supabase/schema.sql` is a schema-only snapshot of the live database: every
table, policy, function and trigger in `public`, no rows. The core tables
(profiles, orgs, employees, attendance, payroll, task_updates, …) were created
in the Supabase dashboard before migrations existed, so this file is the only
place their definitions and row-level-security policies can be read and
reviewed. It is a snapshot, not something `supabase db push` applies. Refresh
it after any change made outside `migrations/`:

```bash
read -s PGPASSWORD; export PGPASSWORD   # the database password from Project Settings → Database
/opt/homebrew/opt/libpq/bin/pg_dump "postgresql://postgres.cohifrzskydnozpmieov@aws-1-ap-south-1.pooler.supabase.com:5432/postgres" --schema-only --schema=public --no-owner -f supabase/schema.sql
unset PGPASSWORD
```

`pg_dump` must be at least the server's major version (17 today); Homebrew's
`libpq` package provides one.

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
