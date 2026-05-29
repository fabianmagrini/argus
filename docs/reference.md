# Argus — Reference

> Deep-dive reference: how the system works, the data model, and the full API surface. For setup, commands, and env vars see [README.md](../README.md). For agent conventions see [CLAUDE.md](../CLAUDE.md).

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Services](#services)
- [Packages](#packages)
- [Infrastructure](#infrastructure)
- [Data Model](#data-model)
- [API Reference](#api-reference)

---

## How It Works

1. **Ingestion** — Callers push deployment records, PR records, and incident records via the REST API (or via the generic event endpoint for custom signals). Time-derived values like `leadTimeSeconds` and `cycleTimeSeconds` are computed by the caller before submission; Argus stores them verbatim.

2. **Storage** — All data lands in PostgreSQL tables managed by Drizzle ORM. Each high-volume table (`deployments`, `pull_requests`, `incidents`, `events`) has a composite index on `(timestamp_col, team_id)` to support efficient period-range queries.

3. **Computation** — Metric endpoints query the raw tables at request time (no pre-aggregation). SQL aggregation (`count`, `avg`, `percentile_cont`) handles the heavy lifting; the pure TypeScript functions in `@argus/metrics` handle rating classification and score computation.

4. **Presentation** — The React SPA fetches metrics through TanStack Query hooks auto-generated from the OpenAPI spec. Charts are rendered with Recharts. The dashboard operates in dark mode using shadcn/ui + Tailwind CSS v4.

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
       └──► lib/api-client-react/src/generated/  (React Query hooks — frontend)
```

---

## Repository Structure

```
argus/
├── lib/
│   ├── metrics/               Pure DORA/health/leaderboard computation + unit tests
│   │   └── src/
│   │       ├── dora.ts        classifyDeploymentFrequency, classifyLeadTime, etc.
│   │       ├── health.ts      computeHealthScore, computeLeaderboardScore
│   │       ├── period.ts      getPeriodStart, getPeriodDays helpers
│   │       └── index.ts       barrel export
│   ├── db/                    Drizzle ORM schema + db singleton
│   │   └── src/schema/
│   │       ├── teams.ts
│   │       ├── repositories.ts
│   │       ├── deployments.ts
│   │       ├── pull_requests.ts
│   │       ├── incidents.ts
│   │       └── events.ts
│   ├── api-spec/
│   │   ├── openapi.yaml       Single source of truth for all API types
│   │   └── orval.config.ts    Codegen config → api-zod + api-client-react
│   ├── api-zod/
│   │   └── src/generated/     Auto-generated Zod validators (do not edit)
│   └── api-client-react/
│       └── src/generated/     Auto-generated TanStack Query hooks (do not edit)
├── apps/
│   ├── api-server/
│   │   └── src/
│   │       ├── app.ts         Express app factory (accepts db override for tests)
│   │       └── routes/        Route factories — one file per resource
│   └── dashboard/
│       └── src/
│           ├── App.tsx        Sidebar layout + Wouter routing
│           └── pages/         One file per dashboard view
├── scripts/
│   └── src/seed.ts            Dev database seeder
├── docs/                      Deep-dive reference (this file)
├── .env.example               Required environment variables template
├── docker-compose.yaml        PostgreSQL 17 on port 5433
├── CLAUDE.md                  Agent guide — conventions, commands, gotchas
└── README.md                  Project overview and quick start
```

---

## Services

### `apps/api-server` — Express REST API

| Property | Value |
|----------|-------|
| Package | `@argus/api-server` |
| Port | `$PORT` (default `5000`) |
| Entry | `src/index.ts` |
| Dev | `tsx watch src/index.ts` (hot reload) |
| Build output | `dist/` (esbuild CJS bundle) |

Routes are created by factory functions accepting a Drizzle `db` instance. All requests are validated with generated Zod schemas; responses are parsed through the same schemas before sending (never raw db rows). Middleware: `pino-http` → `cors` → `express.json` → route handlers.

### `apps/dashboard` — React SPA

| Property | Value |
|----------|-------|
| Package | `@argus/dashboard` |
| Port | `$PORT` (typically `3000`) |
| Build tool | Vite 7 |
| Routing | Wouter |

Proxies `/api/*` to `$API_PORT` (default `5000`). Both `PORT` and `BASE_PATH` are required at startup — Vite throws if either is missing.

---

## Packages

| Package | Directory | Purpose |
|---------|-----------|---------|
| `@argus/metrics` | `lib/metrics` | Pure DORA classification, health score, leaderboard score, period helpers. Zero runtime deps. |
| `@argus/db` | `lib/db` | Drizzle ORM table definitions, PostgreSQL enums, and the `db` singleton. |
| `@argus/api-spec` | `lib/api-spec` | OpenAPI 3.1 spec + Orval codegen config. Single source of truth. |
| `@argus/api-zod` | `lib/api-zod` | Auto-generated Zod validators. Never edit manually. |
| `@argus/api-client-react` | `lib/api-client-react` | Auto-generated TanStack Query v5 hooks. Never edit manually. |

---

## Infrastructure

| Name | Technology | Port | Purpose |
|------|-----------|------|---------|
| `postgres` | PostgreSQL 17 (Alpine) | 5433 → 5432 | Primary data store |

Defined in `docker-compose.yaml`. Dev credentials: user `argus`, password `argus`, database `argus`. Data persisted in named volume `postgres_data`.

---

## Data Model

All tables use `serial` primary keys and `timestamptz` timestamps. `team_id` foreign keys use `ON DELETE SET NULL`; `repository_id` foreign keys use `ON DELETE CASCADE`.

### Entities

**`teams`** — logical groupings
- `id`, `name` (unique), `description`, `timezone` (IANA, default `UTC`), timestamps

**`repositories`** — source-control repos
- `id`, `team_id`, `name`, `full_name` (unique, e.g. `"org/repo"`), `url`, `default_branch`, `language`, timestamps

**`deployments`** — one record per deploy
- `id`, `repository_id`, `team_id`, `environment`, `status` (`pending|running|success|failed|rolled_back`), `commit_sha`, `version`, `lead_time_seconds` (caller-supplied), `deployed_at`, `finished_at`, timestamps
- Index: `(deployed_at, team_id)`

**`pull_requests`** — individual PRs/MRs
- `id`, `repository_id`, `team_id`, `external_id`, `title`, `author_login`, `state` (`open|merged|closed`), `additions`, `deletions`, `changed_files`, `cycle_time_seconds` (caller-supplied), `opened_at`, `merged_at`, `closed_at`, timestamps
- Index: `(opened_at, team_id)`

**`incidents`** — production disruptions
- `id`, `team_id`, `title`, `severity` (`p1|p2|p3|p4`), `status` (`open|resolved`), `recovery_time_seconds` (caller-supplied), `opened_at`, `resolved_at`, timestamps
- Index: `(opened_at, team_id)`

**`events`** — catch-all raw activity
- `id`, `team_id`, `repository_id`, `type` (free-text, namespace recommended: `"github.push"`), `actor_login`, `metadata` (JSONB), `occurred_at`, `created_at`
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

All routes prefixed with `/api`. Full spec: `lib/api-spec/openapi.yaml`.

### CRUD Endpoints

| Resource | Endpoints |
|----------|-----------|
| Teams | `GET/POST /teams`, `GET/PATCH/DELETE /teams/:id` |
| Repositories | `GET/POST /repositories`, `GET/PATCH/DELETE /repositories/:id` |
| Deployments | `GET/POST /deployments`, `GET/PATCH /deployments/:id` |
| Pull Requests | `GET/POST /pull-requests`, `GET/PATCH /pull-requests/:id` |
| Incidents | `GET/POST /incidents`, `GET/PATCH /incidents/:id` |
| Events | `GET/POST /events` |

### Analytics Endpoints

All accept `period` (`7d|30d|90d`, default `30d`). Most accept `teamId` for team scoping.

| Endpoint | Description |
|----------|-------------|
| `GET /metrics/summary` | KPI overview: total deploys, success rate, avg lead time, open incidents, overall DORA rating |
| `GET /metrics/dora` | DORA four-key metrics with value, unit, rating, trend ratio, and direction |
| `GET /metrics/dora/timeseries` | Daily time-series for one metric: `deployment_frequency \| lead_time \| change_failure_rate \| recovery_time` |
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

Scores: elite = 4, high = 3, medium = 2, low = 1. Overall rating = avg of 4 scores bucketed at 3.5 / 2.5 / 1.5. Health score = `(df + lt + cfr) / 3 × 25` (range 25–100). Leaderboard score = `(df + lt + cfr + mttr) / 4 × 25`.
