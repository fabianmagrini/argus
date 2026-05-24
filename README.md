# Argus — Engineering Analytics Platform

> A self-hosted platform for measuring software engineering productivity using DORA metrics, flow metrics, and team health scores.

## What it does

Argus ingests raw engineering activity data (deployments, pull requests, incidents, arbitrary events), stores it in PostgreSQL, and surfaces aggregated metrics through a REST API and an interactive React dashboard.

Key capabilities:
- **DORA four-key metrics** — Deployment Frequency, Lead Time for Changes, Change Failure Rate, MTTR — rated against Google State of DevOps 2023 thresholds
- **Flow metrics** — PR cycle time, throughput, WIP, merge rate
- **Team health scores** — 0–100 composite rating per team
- **Team leaderboard** — ranked performance comparison
- **Full CRUD** for teams, repositories, deployments, pull requests, incidents, and events

## Repository layout

```
argus/
├── lib/
│   ├── metrics/          Pure DORA/health/leaderboard computation logic + unit tests
│   ├── db/               Drizzle ORM schema definitions and db instance
│   ├── api-spec/         OpenAPI 3.1 spec (source of truth) + Orval config + contract tests
│   ├── api-zod/          Auto-generated Zod request/response schemas (do not edit)
│   └── api-client-react/ Auto-generated TanStack Query hooks (do not edit)
├── apps/
│   ├── api-server/       Express 5 REST API — port 5000
│   └── dashboard/        React 19 SPA (Vite + shadcn/ui + Recharts)
└── scripts/              Utility scripts
```

## Quick start

### Prerequisites
- Node.js 24+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database

### Install & run

```bash
# Install all workspace dependencies
pnpm install

# Push Drizzle schema to your database (first time / after schema changes)
pnpm --filter @argus/db run push

# Start API server (port 5000)
DATABASE_URL=postgresql://user:pass@localhost:5432/argus \
  pnpm --filter @argus/api-server run dev

# Start dashboard (in a separate terminal)
DATABASE_URL=postgresql://user:pass@localhost:5432/argus \
PORT=3000 BASE_PATH=/ \
  pnpm --filter @argus/dashboard run dev
```

## Running tests

```bash
# Run all test suites once
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage
```

Tests are organised by package:

| Package | Tests |
|---------|-------|
| `lib/metrics` | Unit tests — DORA classification, health scores, leaderboard scores, period helpers |
| `apps/api-server` | Integration tests (supertest + mocked db) and OpenAPI contract tests |
| `apps/dashboard` | Component tests (@testing-library/react) |

## Available commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm run build` | Typecheck + build all packages |
| `pnpm run typecheck` | Full typecheck across all packages |
| `pnpm run typecheck:libs` | Typecheck lib/* packages only (tsc --build) |
| `pnpm test` | Run all tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm --filter @argus/api-server run dev` | Start API server (port 5000) |
| `pnpm --filter @argus/dashboard run dev` | Start dashboard Vite dev server |
| `pnpm --filter @argus/api-spec run codegen` | Regenerate hooks + Zod schemas from openapi.yaml |
| `pnpm --filter @argus/db run push` | Push Drizzle schema to DB (dev only) |

## Environment variables

| Variable | Required by | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | api-server, db push | PostgreSQL connection string |
| `PORT` | api-server, dashboard | Port to listen on |
| `BASE_PATH` | dashboard | Vite base URL path (e.g. `/`) |
| `LOG_LEVEL` | api-server | Pino log level (default: `info`) |

## Tech stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24 |
| Language | TypeScript 5.9 |
| Package manager | pnpm workspaces |
| API framework | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4 |
| API codegen | Orval (from OpenAPI 3.1) |
| API build | esbuild |
| Frontend | React 19, Vite 7, Tailwind CSS v4 |
| UI components | shadcn/ui + Radix UI |
| Charts | Recharts |
| Routing | Wouter |
| Data fetching | TanStack Query v5 |
| Testing | Vitest + supertest + @testing-library/react |
| Logging | Pino |

## Architecture

```
Browser (React SPA + Vite)
    │ HTTP /api/*
Express 5 API Server (port 5000)
    │ Drizzle ORM
PostgreSQL
```

All API types are generated from `lib/api-spec/openapi.yaml` via Orval. After any spec change, run:

```bash
pnpm --filter @argus/api-spec run codegen
pnpm run typecheck:libs
```

## Gotchas

- After any `openapi.yaml` change: run codegen before touching frontend or backend code
- After `lib/db` schema changes: run `typecheck:libs` to rebuild before typechecking artifacts
- Timeseries queries use `to_char(..., 'YYYY-MM-DD')` — `::date::text` returns JS Date objects via the pg driver
- Use Drizzle `inArray` for array filters — raw `sql` with `= any(...)` behaves differently
