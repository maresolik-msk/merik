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
├── docs/
│   └── STRUCTURE.md    # Detailed structure & routing reference
├── README.md
└── .gitignore
```

See [docs/STRUCTURE.md](docs/STRUCTURE.md) for full details.

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
