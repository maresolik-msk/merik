# One-off data repairs

Scripts here fix **data in one specific database**. They are not migrations and
must never be moved into `supabase/migrations/`.

The distinction that matters:

| | `supabase/migrations/` | `scripts/data-repair/` |
|---|---|---|
| Describes | the schema every deployment shares | what happened to be in one tenant's rows |
| Runs | automatically, in every environment | by hand, once, against one database |
| On a fresh database | must succeed (typically a no-op) | would be meaningless, and may refuse to run |

A data fix belongs in `migrations/` only if it is generic — if it would do the
right thing on any deployment, including an empty one. A fix that names actual
clients, projects, or people belongs here instead. Putting tenant-specific data
in the migration chain breaks new deployments and CI, and leaks customer names
into the schema history.

Run one with:

```
psql "$DATABASE_URL" -f scripts/data-repair/<script>.sql
```

Each script documents what it did, when it was applied, and to which project.
They are written to be re-runnable, so a second run is a no-op rather than a
double-application — but read the header before running one anyway.
