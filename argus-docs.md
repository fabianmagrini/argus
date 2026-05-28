# Argus — Documentation

> A self-hosted engineering analytics platform that surfaces DORA metrics, flow metrics, and team health scores from deployment, PR, and incident data.

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Services](#services)
- [Packages](#packages)
- [Infrastructure](#infrastructure)
- [Data Model](#data-model)
- [API Reference](#api-reference)
- [Development Setup](#development-setup)
- [Available Commands](#available-commands)
- [Tech Stack](#tech-stack)

---

## Overview

Argus is a self-hosted platform for measuring software delivery performance. It ingests raw engineering signals — deployments, pull requests, incidents, and arbitrary events — persists them in PostgreSQL, and computes aggregated metrics on demand.

Key capabilities:

- **DORA four-key metrics** — Deployment Frequency, Lead Time for Changes, Change Failure Rate, Mean Time to Recovery — each classified against Google State of DevOps 2023 thresholds (elite / high / medium / low)
- **Flow metrics** — PR cycle time (mean and median), throughput, WIP count, merge rate, average PR size
- **Team health scores** — 0–100 composite score per team derived from DF, LT, and CFR ratings
- **Team leaderboard** — ranked table using all four DORA ratings
- **Full CRUD** for all domain entities: teams, repositories, deployments, pull requests, incidents, events
- **Trend detection** — each DORA metric reports a trend vs the previous equivalent period (up / down / flat)
- **Filterable by team and time period** — all metrics endpoints accept `teamId` and `period` (7d / 30d / 90d)

---

## How It Works

1. **Ingestion** — Callers push deployment records, PR records, and incident records via the REST API (or via the generic event endpoint for custom signals). Time-derived values like `leadTimeSeconds` and `cycleTimeSeconds` are computed by the caller before submission; Argus stores them verbatim.

2. **Storage** — All data lands in PostgreSQL tables managed by Drizzle ORM. Each high-volume table (`deployments`, `pull_requests`, `incidents`, `events`) has a composite index on `(timestamp_col, team_id)` to support efficient period-range queries.

3. **Computation** — Metric endpoints query the raw tables at request time (no pre-aggregation). SQL aggregation (`count`, `avg`, `percentile_cont`) handles the heavy lifting; the pure TypeScript functions in `@argus/metrics` handle rating classification and score computation.

4. **Presentation** — The React SPA fetches metrics through TanStack Query hooks that are auto-generated from the OpenAPI spec. Charts are rendered with Recharts. The dashboard operates in dark mode and uses shadcn/ui + Tailwind CSS v4.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser                                                  │
│  React 19 SPA (Vite 7)           apps/dashboard           │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │ Pages    │  │ TanStack     │  │ shadcn/ui +       │    │
│  │ /dora    │  │ Query hooks  │  │ Recharts charts   │    │
│  │ /flow    │  │ (generated)  │  │                   │    │
│  │ /teams   │  └──────────────┘  └──────────────────┘    │
│  └──────────┘                                             │
└────────────────────────┬─────────────────────────────────┘
                         │  HTTP /api/*
┌────────────────────────▼─────────────────────────────────┐
│  Express 5 API Server (port 5000)  apps/api-server         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Route factories (createXxxRouter(db))               │  │
│  │  /api/teams        /api/repositories                │  │
│  │  /api/deployments  /api/pull-requests               │  │
│  │  /api/incidents    /api/events                      │  │
│  │  /api/metrics/*    /api/healthz                     │  │
│  └──────────────────────────────┬──────────────────────┘  │
│                                 │                         │
│  @argus/metrics (pure logic)    │  @argus/api-zod          │
│  classifyDoraRating()           │  (Zod validators,        │
│  computeHealthScore()           │  generated from spec)    │
│  computeLeaderboardScore()      │                         │
└────────────────────────┬─────────────────────────────────┘
                         │  Drizzle ORM
┌────────────────────────▼─────────────────────────────────┐
│  PostgreSQL (port 5433 in dev)                            │
│  tables: teams, repositories, deployments,               │
│          pull_requests, incidents, events                 │
└──────────────────────────────────────────────────────────┘

OpenAPI-first codegen pipeline:
  lib/api-spec/openapi.yaml
       │ Orval
       ├──► lib/api-zod/src/generated/      (Zod validators — backend)
       └──► lib/api-client-react/src/generated/  (TanStack Query hooks — frontend)
```

**Key design decisions:**

- **OpenAPI-first**: `openapi.yaml` is the single source of truth. Both backend validators and frontend hooks are generated from it via Orval. Any spec change requires running codegen before touching other code.
- **Dependency injection**: every route factory accepts a `db` parameter, making integration tests possible without a real database.
- **Pure metrics core**: `@argus/metrics` has zero runtime dependencies. All classification and scoring logic is isolated for unit-testing.
- **On-the-fly computation**: no materialised views or background jobs — all metrics are computed at query time from raw tables.

---

## Repository Structure

```
argus/
├── lib/
│   ├── metrics/               Pure DORA/health/leaderboard computation + unit tests
│   │   ├── src/
│   │   │   ├── dora.ts        classifyDeploymentFrequency, classifyLeadTime, etc.
│   │   │   ├── health.ts      computeHealthScore, computeLeaderboardScore
│   │   │   ├── period.ts      getPeriodStart, getPeriodDays helpers
│   │   │   └── index.ts       barrel export
│   │   └── tests/
│   ├── db/                    Drizzle ORM schema + db singleton
│   │   └── src/
│   │       ├── schema/
│   │       │   ├── teams.ts
│   │       │   ├── repositories.ts
│   │       │   ├── deployments.ts
│   │       │   ├── pull_requests.ts
│   │       │   ├── incidents.ts
│   │       │   └── events.ts
│   │       └── index.ts       exports db instance + all schema symbols
│   ├── api-spec/
│   │   ├── openapi.yaml       OpenAPI 3.1 spec — source of truth for all types
│   │   ├── orval.config.ts    Codegen config (outputs to api-zod + api-client-react)
│   │   └── tests/             Contract tests: validate spec against running server
│   ├── api-zod/
│   │   └── src/generated/     Auto-generated Zod request/response schemas (do not edit)
│   └── api-client-react/
│       └── src/generated/     Auto-generated TanStack Query hooks (do not edit)
├── apps/
│   ├── api-server/
│   │   ├── src/
│   │   │   ├── app.ts         Express app factory (accepts optional db override)
│   │   │   ├── index.ts       Entry point — starts server
│   │   │   ├── lib/logger.ts  Pino logger instance
│   │   │   └── routes/
│   │   │       ├── index.ts   Root router — mounts all sub-routers
│   │   │       ├── health.ts  GET /healthz
│   │   │       ├── teams.ts   CRUD /teams
│   │   │       ├── repositories.ts
│   │   │       ├── deployments.ts
│   │   │       ├── pull_requests.ts
│   │   │       ├── incidents.ts
│   │   │       ├── events.ts
│   │   │       └── metrics.ts  All analytics endpoints
│   │   ├── tests/
│   │   └── build.mjs           esbuild CJS bundle script
│   └── dashboard/
│       ├── src/
│       │   ├── App.tsx         Root: sidebar layout + Wouter routing
│       │   ├── main.tsx        Vite entry point
│       │   ├── pages/          One file per dashboard view
│       │   ├── components/
│       │   │   ├── dora-rating.tsx   DORA badge component
│       │   │   └── ui/               shadcn/ui component library
│       │   └── hooks/          use-mobile, use-toast
│       ├── tests/
│       └── vite.config.ts      Requires PORT + BASE_PATH env vars
├── scripts/
│   ├── post-merge.sh          Git hook helper
│   └── src/hello.ts
├── docker-compose.yaml        PostgreSQL 17 on port 5433
├── package.json               Root workspace scripts
├── pnpm-workspace.yaml        Workspace config + version catalog
├── tsconfig.base.json         Shared TypeScript settings
├── tsconfig.json              Composite build config (libs)
└── vitest.workspace.ts        Vitest workspace file (all packages)
```

---

## Services

### `apps/api-server` — Express REST API

| Property | Value |
|----------|-------|
| Package | `@argus/api-server` |
| Port | `$PORT` (default `5000` in dev) |
| Entry | `src/index.ts` |
| Build output | `dist/` (esbuild CJS bundle) |

The API mounts all routes under `/api`. Routes are created by factory functions that accept a Drizzle `db` instance, enabling test injection. Requests are validated with generated Zod schemas; responses are parsed through the same schemas before sending (never raw db rows).

Middleware stack: `pino-http` logging → `cors` → `express.json` → route handlers.

### `apps/dashboard` — React SPA

| Property | Value |
|----------|-------|
| Package | `@argus/dashboard` |
| Port | `$PORT` (typically `3000` in dev) |
| Build tool | Vite 7 |
| Routing | Wouter |

The dashboard proxies `/api/*` to the API server (`$API_PORT`, default `5000`). `BASE_PATH` and `PORT` are required at startup — Vite throws if either is missing.

Pages: Overview, DORA Metrics, Flow Metrics, Deployments, Pull Requests, Incidents, Teams, Team Detail, Repositories, Leaderboard.

---

## Packages

| Package | Directory | Purpose |
|---------|-----------|---------|
| `@argus/metrics` | `lib/metrics` | Pure DORA classification, health score, leaderboard score, period helpers. Zero runtime deps. |
| `@argus/db` | `lib/db` | Drizzle ORM table definitions, PostgreSQL enums, and the `db` singleton. |
| `@argus/api-spec` | `lib/api-spec` | OpenAPI 3.1 spec + Orval codegen config + contract tests. Single source of truth. |
| `@argus/api-zod` | `lib/api-zod` | Auto-generated Zod validators. Never edit manually. |
| `@argus/api-client-react` | `lib/api-client-react` | Auto-generated TanStack Query v5 hooks. Never edit manually. |

---

## Infrastructure

| Name | Technology | Port | Purpose |
|------|-----------|------|---------|
| `postgres` | PostgreSQL 17 (Alpine) | 5433 → 5432 | Primary data store |

Defined in `docker-compose.yaml`. Credentials for dev: user `argus`, password `argus`, database `argus`. Data is persisted in the named volume `postgres_data`.

---

## Data Model

All tables use `serial` primary keys and `timestamptz` timestamps. Foreign keys use `ON DELETE SET NULL` for `team_id` (so entity data survives team deletion) and `ON DELETE CASCADE` for `repository_id` on deployments and pull requests.

### Core Entities

**`teams`** — logical groupings of repositories and engineers
- `id`, `name` (unique), `description`, `timezone` (IANA, default `UTC`), `created_at`, `updated_at`

**`repositories`** — source-control repos tracked for metrics
- `id`, `team_id` (FK → teams, nullable), `name`, `full_name` (unique, e.g. `"org/repo"`), `url`, `default_branch`, `language`, timestamps

**`deployments`** — one record per deploy of a repo to an environment
- `id`, `repository_id` (FK → repositories), `team_id` (FK → teams, nullable), `environment`, `status` (enum: `pending | running | success | failed | rolled_back`), `commit_sha`, `version`, `lead_time_seconds` (caller-supplied DORA input), `deployed_at`, `finished_at`, timestamps
- Index: `(deployed_at, team_id)` for period-range analytics

**`pull_requests`** — individual PRs/MRs
- `id`, `repository_id`, `team_id`, `external_id` (GitHub/GitLab PR number), `title`, `author_login`, `state` (enum: `open | merged | closed`), `additions`, `deletions`, `changed_files`, `cycle_time_seconds` (caller-supplied), `opened_at`, `merged_at`, `closed_at`, timestamps
- Index: `(opened_at, team_id)`

**`incidents`** — production service disruptions
- `id`, `team_id`, `title`, `severity` (enum: `p1 | p2 | p3 | p4`), `status` (enum: `open | resolved`), `recovery_time_seconds` (caller-supplied DORA MTTR input), `opened_at`, `resolved_at`, timestamps
- Index: `(opened_at, team_id)`

**`events`** — catch-all raw activity events
- `id`, `team_id`, `repository_id`, `type` (free-text, namespace recommended e.g. `"github.push"`), `actor_login`, `metadata` (JSONB), `occurred_at`, `created_at`
- Index: `(occurred_at, team_id)`

### Relationships

```
teams ──< repositories ──< deployments
     ──<               ──< pull_requests
     ──< incidents
     ──< events
```

Schema files: `lib/db/src/schema/`

---

## API Reference

All routes are prefixed with `/api`. OpenAPI spec: `lib/api-spec/openapi.yaml`.

### CRUD Endpoints

| Resource | Endpoints |
|----------|-----------|
| Teams | `GET/POST /teams`, `GET/PATCH/DELETE /teams/:id` |
| Repositories | `GET/POST /repositories`, `GET/PATCH/DELETE /repositories/:id` |
| Deployments | `GET/POST /deployments`, `GET/PATCH /deployments/:id` |
| Pull Requests | `GET/POST /pull-requests`, `GET/PATCH /pull-requests/:id` |
| Incidents | `GET/POST /incidents`, `GET/PATCH /incidents/:id` |
| Events | `GET/POST /events` |

### Analytics Endpoints (`/metrics/*`)

All accept `period` query param (`7d` | `30d` | `90d`, default `30d`). Most accept `teamId` for scoping.

| Endpoint | Description |
|----------|-------------|
| `GET /metrics/summary` | KPI overview: total deploys, success rate, avg lead time, open incidents, overall DORA rating |
| `GET /metrics/dora` | DORA four-key metrics with value, unit, rating, trend ratio, and trend direction |
| `GET /metrics/dora/timeseries` | Daily time-series for one metric (`deployment_frequency` \| `lead_time` \| `change_failure_rate` \| `recovery_time`) |
| `GET /metrics/flow` | PR cycle time (avg + median), throughput/week, WIP count, merge rate, avg PR size |
| `GET /metrics/team-health` | Health score, deploy count, PR count, incident count per team |
| `GET /metrics/activity` | Unified activity feed (deployments + PRs + incidents), most recent first |
| `GET /metrics/leaderboard` | Teams ranked by leaderboard score (all 4 DORA ratings averaged, scaled 25–100) |
| `GET /healthz` | Health check |

### DORA Thresholds (Google State of DevOps 2023)

| Metric | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| Deployment Frequency | ≥ 1/day | ≥ 1/week | ≥ 1/month | < 1/month |
| Lead Time | < 1 hour | < 24 hours | < 1 week | ≥ 1 week |
| Change Failure Rate | ≤ 5% | ≤ 10% | ≤ 15% | > 15% |
| MTTR | < 1 hour | < 24 hours | < 1 week | ≥ 1 week |

**Scoring:**
- Rating → score: elite = 4, high = 3, medium = 2, low = 1
- Overall DORA rating: avg of 4 scores → bucketed at 3.5 / 2.5 / 1.5
- Health score: `(df + lt + cfr) / 3 × 25` — range 25–100 (MTTR excluded)
- Leaderboard score: `(df + lt + cfr + mttr) / 4 × 25` — range 25–100

---

## Development Setup

### Prerequisites

- Node.js 24+
- pnpm (`npm install -g pnpm`)
- Docker (for PostgreSQL)

### First-time setup

```bash
# Clone and install
git clone <repo>
cd argus
pnpm install

# Start PostgreSQL
docker compose up -d

# Push Drizzle schema to the dev database
DATABASE_URL=postgresql://argus:argus@localhost:5433/argus \
  pnpm --filter @argus/db run push
```

### Running locally

```bash
# Terminal 1 — API server (port 5000)
DATABASE_URL=postgresql://argus:argus@localhost:5433/argus PORT=5000 \
  pnpm --filter @argus/api-server run dev

# Terminal 2 — Dashboard (port 3000, proxies /api/* to port 5000)
DATABASE_URL=postgresql://argus:argus@localhost:5433/argus \
PORT=3000 BASE_PATH=/ API_PORT=5000 \
  pnpm --filter @argus/dashboard run dev
```

### After spec changes

```bash
# 1. Regenerate Zod schemas + React Query hooks
pnpm --filter @argus/api-spec run codegen

# 2. Rebuild lib composite types
pnpm run typecheck:libs
```

### Environment Variables

| Variable | Required by | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | api-server, db | PostgreSQL connection string |
| `PORT` | api-server, dashboard | Listen port |
| `BASE_PATH` | dashboard | Vite base URL (e.g. `/`) — **required**, server throws without it |
| `API_PORT` | dashboard | Upstream API port for Vite proxy (default `5000`) |
| `LOG_LEVEL` | api-server | Pino log level (default `info`) |

---

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm run build` | Full typecheck + build all packages |
| `pnpm run typecheck` | Typecheck everything (libs + apps) |
| `pnpm run typecheck:libs` | Typecheck lib/* only (tsc --build composite) |
| `pnpm test` | Run all test suites once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with v8 coverage |
| `pnpm --filter @argus/api-server run dev` | Start API server in dev mode |
| `pnpm --filter @argus/dashboard run dev` | Start dashboard Vite dev server |
| `pnpm --filter @argus/api-spec run codegen` | Regenerate Zod schemas + React Query hooks from OpenAPI spec |
| `pnpm --filter @argus/db run push` | Push Drizzle schema to dev database |
| `pnpm --filter @argus/metrics test` | Unit-test DORA/health/score logic |
| `pnpm --filter @argus/api-server test` | Integration + contract tests |
| `pnpm --filter @argus/dashboard test` | Component tests |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24 |
| Language | TypeScript 5.9 |
| Package manager | pnpm workspaces (monorepo) |
| API framework | Express 5 |
| Database | PostgreSQL 17 |
| ORM | Drizzle ORM + drizzle-zod |
| Validation | Zod v4 |
| API spec | OpenAPI 3.1 (Orval codegen) |
| API build | esbuild (CJS bundle) |
| Frontend framework | React 19 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui + Radix UI |
| Charts | Recharts |
| Routing | Wouter |
| Data fetching | TanStack Query v5 |
| Testing | Vitest 3 + supertest + @testing-library/react |
| Logging | Pino + pino-http |
| Containerisation | Docker Compose (PostgreSQL only) |
