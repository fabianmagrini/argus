# Argus — Claude Code Guide

## What this project is

Argus is a self-hosted engineering analytics platform. It ingests deployment, pull request, and incident data, stores it in PostgreSQL, and surfaces DORA metrics, flow metrics, and team health scores through a REST API and React dashboard.

## Run & Operate

```bash
# Start PostgreSQL (docker-compose.yaml at repo root)
docker compose up -d

# Push schema on first run (or after schema changes)
DATABASE_URL=postgresql://argus:argus@localhost:5433/argus \
  pnpm --filter @argus/db run push

# Seed the database with realistic sample data (requires a clean DB)
DATABASE_URL=postgresql://argus:argus@localhost:5433/argus \
  pnpm --filter @argus/scripts run seed

# API server (port 5000) — uses tsx watch for hot reload in dev
DATABASE_URL=postgresql://argus:argus@localhost:5433/argus PORT=5000 \
  pnpm --filter @argus/api-server run dev

# Dashboard (port 3000 — proxies /api/* to API_PORT, default 5000)
DATABASE_URL=postgresql://argus:argus@localhost:5433/argus PORT=3000 BASE_PATH=/ API_PORT=5000 \
  pnpm --filter @argus/dashboard run dev

# Run all tests
pnpm test

# Full typecheck + tests + lint (single verification command)
pnpm run check

# Full typecheck
pnpm run typecheck

# Lint
pnpm run lint

# Format all files
pnpm run format

# Build everything
pnpm run build

# Regenerate API client + Zod schemas from OpenAPI spec
pnpm --filter @argus/api-spec run codegen

# Push DB schema to dev database (dev only — destructive)
pnpm --filter @argus/db run push

# Generate a migration file from schema changes (safe for production)
DATABASE_URL=postgresql://argus:argus@localhost:5433/argus \
  pnpm --filter @argus/db run generate

# Apply pending migrations
DATABASE_URL=postgresql://argus:argus@localhost:5433/argus \
  pnpm --filter @argus/db run migrate
```

## Package names

| Directory | Package name | Purpose |
|-----------|-------------|---------|
| `lib/metrics` | `@argus/metrics` | Pure DORA/health/leaderboard functions — no I/O |
| `lib/db` | `@argus/db` | Drizzle ORM schema + db instance |
| `lib/api-spec` | `@argus/api-spec` | OpenAPI 3.1 spec + Orval codegen config |
| `lib/api-zod` | `@argus/api-zod` | Auto-generated Zod validators (do not edit) |
| `lib/api-client-react` | `@argus/api-client-react` | Auto-generated TanStack Query hooks (do not edit) |
| `apps/api-server` | `@argus/api-server` | Express 5 REST API — port 5000 |
| `apps/dashboard` | `@argus/dashboard` | React 19 SPA — port from `PORT` env |

## Architecture

```
Browser (React SPA + Vite)          apps/dashboard
    │ HTTP /api/*
Express 5 API Server (port 5000)    apps/api-server
    │ Drizzle ORM
PostgreSQL                          lib/db
```

**OpenAPI-first**: `lib/api-spec/openapi.yaml` is the single source of truth. All request/response types in both the frontend (React Query hooks) and backend (Zod validators) are generated from it via Orval.

**Dependency injection for testability**: route factories in `apps/api-server/src/routes/` accept a `db` parameter so integration tests can pass a mock instead of a real database.

**Pure metrics logic**: all DORA classification, health score, and leaderboard score computation lives in `lib/metrics/src/` — no I/O, fully unit-testable.

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/metrics/src/` — DORA classification thresholds and score computation
- `lib/db/src/schema/` — Drizzle table definitions (teams, repositories, deployments, pull_requests, incidents, events)
- `apps/api-server/src/routes/` — Express route factories (accept `db` arg)
- `apps/api-server/src/routes/metrics.ts` — analytics endpoints (uses `@argus/metrics`)
- `apps/dashboard/src/pages/` — React pages for each dashboard view
- `lib/api-client-react/src/generated/` — auto-generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — auto-generated Zod schemas (do not edit)

## Testing

Tests are split across three packages:

| Package | Command | What it tests |
|---------|---------|---------------|
| `lib/metrics` | `pnpm --filter @argus/metrics test` | Unit: DORA classifiers, health/leaderboard scores, period helpers |
| `apps/api-server` | `pnpm --filter @argus/api-server test` | Integration: HTTP routes (supertest + mock db); Contract: response shapes vs Zod schemas |
| `apps/dashboard` | `pnpm --filter @argus/dashboard test` | Component/page: React components and pages with @testing-library/react |

Run all at once: `pnpm test`

### Writing API server integration tests

Route tests use a lightweight mock Drizzle client (`apps/api-server/tests/helpers/mock-db.ts`) and supertest. There is no real database involved.

```ts
import { createApp } from "../../src/app.js";
import { createMockDb } from "../helpers/mock-db.js";

// selectResults: consumed in order, one array per db.select() call in the handler
// selectFallback: used when selectResults is exhausted
// insertResult / updateResult / deleteResult: returned by those operations
// executeRows: returned by db.execute(sql`...`)

const db = createMockDb({
  insertResult: [{ id: 1, name: "Acme", ... }],
});
const app = createApp(db);
const res = await request(app).post("/api/teams").send({ name: "Acme" });
```

For handlers that call `db.select()` multiple times (e.g. metrics endpoints), pass `selectResults` as an array of arrays — each inner array is the result of one sequential `select()` call.

### Writing dashboard page tests

Page tests mock `@argus/api-client-react` hooks via `vi.mock` and wrap the component in `QueryClientProvider` using the `renderWithProviders` helper (`apps/dashboard/tests/helpers/render.tsx`).

```tsx
import { renderWithProviders } from "../helpers/render";

vi.mock("@argus/api-client-react", () => ({
  useListTeams: vi.fn(),
}));
import { useListTeams } from "@argus/api-client-react";
vi.mocked(useListTeams).mockReturnValue({ data: [], isLoading: false } as any);

renderWithProviders(<MyPage />);
```

If a page uses `Link` from `wouter`, mock it to avoid router context requirements:
```ts
vi.mock("wouter", async (importOriginal) => ({
  ...(await importOriginal()),
  Link: ({ href, children }: any) => <a href={href}>{children}</a>,
}));
```

## DORA metric thresholds (Google State of DevOps 2023)

| Metric | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| Deployment Frequency | ≥ 1/day | ≥ 1/week | ≥ 1/month | < 1/month |
| Lead Time | < 1 hour | < 24 hours | < 1 week | ≥ 1 week |
| Change Failure Rate | ≤ 5% | ≤ 10% | ≤ 15% | > 15% |
| MTTR | < 1 hour | < 24 hours | < 1 week | ≥ 1 week |

Overall DORA rating = average of four numeric scores (elite=4, high=3, medium=2, low=1), then bucketed at 3.5/2.5/1.5.

Health score = (df + lt + cfr) / 3 × 25, rounded to integer (range 25–100).

Leaderboard score = (df + lt + cfr + mttr) / 4 × 25 (range 25–100).

## Conventions

- **Route factories**: every route file exports a `create*Router(db: Db)` function. Never import `db` directly inside a route file — always receive it as a parameter.
- **Validation**: all request inputs pass through generated Zod schemas from `@argus/api-zod`. If `safeParse` fails, respond with HTTP 400 and `{ error: string }`.
- **Response serialisation**: always call `XxxResponse.parse(row)` before sending, never return a raw db row.
- **Timeseries queries**: use `to_char(date_trunc('day', col), 'YYYY-MM-DD')` — `::date::text` returns JS Date objects via the pg driver.
- **Array filters**: use Drizzle `inArray(col, ids)` — raw `sql\`col = any(...)\`` behaves differently with the pg driver.
- **Codegen output**: files under `src/generated/` in `lib/api-zod` and `lib/api-client-react` are auto-generated. Never edit them manually.

## Gotchas

- After any `openapi.yaml` change: run `pnpm --filter @argus/api-spec run codegen` then `pnpm run typecheck:libs` before touching any route or frontend code.
- After `lib/db` schema changes: run `pnpm run typecheck:libs` to rebuild the composite lib, then typecheck artifacts.
- Dashboard `vite.config.ts` requires both `PORT` and `BASE_PATH` env vars — it throws at startup if either is missing.
- pnpm enforces a 1-day minimum npm package release age (`minimumReleaseAge: 1440` in `pnpm-workspace.yaml`) as a supply-chain defence. Do not disable it.
- `@argus/metrics` has no runtime dependencies — keep it that way. If you need I/O, put it in the route layer.
- `reviewTurnaroundHours` in `GET /metrics/flow` is hardcoded to `0` (`apps/api-server/src/routes/metrics.ts:331`). No review timestamp data is stored in the schema, so this metric cannot be computed yet. Do not "fix" it — there is no data to compute it from.
- Schema changes for production: use `pnpm --filter @argus/db run generate` to create a migration file, then `run migrate` to apply it. Never use `run push` against a database with real data — it is destructive.
- The seed script (`pnpm --filter @argus/scripts run seed`) truncates all tables before inserting — it is safe to re-run against an existing database. To fully reset the Docker volume: `docker compose down -v && docker compose up -d && pnpm --filter @argus/db run push`.

## Known Gaps (prioritized for next development)

1. **API pagination** — all CRUD list endpoints (`GET /teams`, `GET /deployments`, etc.) return unbounded results. Add `limit`/`offset` to `lib/api-spec/openapi.yaml`, run codegen, then add to route handlers and update integration tests.
2. **`reviewTurnaroundHours` stub** — hardcoded to `0` at `apps/api-server/src/routes/metrics.ts` in `GET /metrics/flow`. Unblocked by adding `first_reviewed_at timestamptz` to the `pull_requests` schema (requires a migration via `pnpm --filter @argus/db run generate`).
3. **Webhook ingestion** — `lib/integrations/` glob in `pnpm-workspace.yaml` is a placeholder. Build `@argus/integrations-github` and `@argus/integrations-pagerduty` packages that push data into the existing CRUD endpoints. The `events` table (JSONB metadata + namespaced `type`) is designed to receive raw webhook payloads.
4. **Authentication** — no auth on any endpoint. Add API key middleware in `apps/api-server/src/app.ts` before shipping externally.
5. **Coverage thresholds** — current thresholds in each `vitest.config.ts` are intentionally conservative (metrics: 85%, api-server: 60%, dashboard: 35%). Raise them as coverage improves.

## Stack

- Node.js 24, TypeScript 5.9, pnpm workspaces
- API: Express 5, Pino logging, Zod v4 validation
- DB: PostgreSQL, Drizzle ORM, drizzle-zod
- Build: esbuild (API server CJS bundle), Vite 7 (dashboard)
- Frontend: React 19, Tailwind CSS v4, shadcn/ui, Recharts, Wouter, TanStack Query v5
- Testing: Vitest 3, supertest, @testing-library/react, jsdom
