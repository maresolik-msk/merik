# Project Structure

```
merik/
├── index.html          # Marketing landing page (served at /)
├── app/
│   └── index.html      # Merik Workforce Suite application (served at /app/)
├── assets/
│   └── images/         # Logos, screenshots, and other static images
├── docs/
│   └── STRUCTURE.md    # This file — project layout reference
├── README.md
└── .gitignore
```

## Routing

| URL      | File              | Purpose                          |
|----------|-------------------|----------------------------------|
| `/`      | `index.html`      | Public marketing landing page    |
| `/app/`  | `app/index.html`  | The workforce management app     |

The landing page's "Sign In" / "Get Started" buttons link to `app/`.

## Notes

- Both HTML files are currently self-contained (inline CSS/JS). A future
  cleanup can extract shared styles/scripts into `assets/css/` and `assets/js/`.
- The app uses Supabase. If Supabase Auth redirect URLs were configured for the
  old root path, update them to point at `/app/`.
