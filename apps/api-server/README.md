# @argus/api-server

Express 5 REST API for the Argus engineering analytics platform.

## Responsibilities

- Exposes CRUD endpoints for teams, repositories, deployments, pull requests, incidents, and events.
- Computes DORA metrics, flow metrics, team health scores, and leaderboard rankings on demand using helpers from `@argus/metrics`.
- Validates every request against Zod schemas generated from `lib/api-spec/openapi.yaml`.

## Running

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/argus \
  pnpm run dev
```

Listens on port **5000**. All routes are mounted under `/api`.

## Architecture

Route factories (`src/routes/`) accept a `db: Db` parameter instead of importing the database connection directly. This makes every route testable without a real PostgreSQL instance.

```
createApp(db?)
  └── createRouter(db)
        ├── createHealthRouter()
        ├── createTeamsRouter(db)
        ├── createRepositoriesRouter(db)
        ├── createDeploymentsRouter(db)
        ├── createPullRequestsRouter(db)
        ├── createIncidentsRouter(db)
        ├── createEventsRouter(db)
        └── createMetricsRouter(db)  ← uses @argus/metrics for DORA math
```

## Testing

```bash
pnpm test
```

Three test categories under `tests/`:

| Path | What it covers |
|------|---------------|
| `tests/integration/health.test.ts` | Health endpoint, 404 handling |
| `tests/integration/teams.test.ts` | Teams CRUD: status codes, 400/404 paths, body shape |
| `tests/integration/metrics.test.ts` | Analytics endpoints: empty data, computed values |
| `tests/contract/openapi.test.ts` | Every endpoint's response validates against the generated Zod schema |

Tests inject a `createMockDb()` helper (`tests/helpers/mock-db.ts`) that returns a chainable mock Drizzle client — no real database required.

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NODE_ENV` | No | `production` disables pretty-print logging |
