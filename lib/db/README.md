# @argus/db

Drizzle ORM schema definitions and database client for Argus.

## Schema overview

| Table | Description |
|-------|-------------|
| `teams` | Team entity — name (unique), description, timezone |
| `repositories` | Source repositories (unique `full_name`) |
| `deployments` | Deployment records with `deployment_status` pgEnum and `lead_time_seconds` |
| `pull_requests` | PR records with `pr_state` pgEnum and `cycle_time_seconds` |
| `incidents` | Incidents with `incident_severity` / `incident_status` pgEnums and `recovery_time_seconds` |
| `events` | Free-form raw events with JSONB metadata |

All tables use `serial` primary keys and timezone-aware timestamps. Composite indexes on `(date_col, team_id)` cover analytics range queries. Foreign keys cascade or set-null depending on entity type.

## Starting the database

```bash
# Start PostgreSQL (from the repo root)
docker compose up -d

# Wait for healthy, then push the schema
DATABASE_URL=postgresql://argus:argus@localhost:5433/argus \
  pnpm --filter @argus/db run push

# Stop
docker compose down
```

The `docker-compose.yaml` at the repo root starts PostgreSQL 17 on port 5433 (5432 is reserved for other local services) with:

| Setting | Value |
|---------|-------|
| Host | `localhost:5433` |
| Database | `argus` |
| User | `argus` |
| Password | `argus` |
| Connection string | `postgresql://argus:argus@localhost:5433/argus` |

Data is persisted in a named Docker volume (`postgres_data`) and survives `docker compose down`. Use `docker compose down -v` to wipe it.

## Commands

```bash
# Push schema to the database (dev — no migration files)
DATABASE_URL=postgresql://argus:argus@localhost:5433/argus \
  pnpm --filter @argus/db run push

# Generate SQL migration files
DATABASE_URL=postgresql://argus:argus@localhost:5433/argus \
  pnpm --filter @argus/db run generate

# Open Drizzle Studio (browser UI)
DATABASE_URL=postgresql://argus:argus@localhost:5433/argus \
  pnpm --filter @argus/db run studio
```
