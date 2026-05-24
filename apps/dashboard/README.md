# @argus/dashboard

React 19 SPA for the Argus engineering analytics platform.

## Running

```bash
PORT=3000 BASE_PATH=/ pnpm run dev
```

Requires `PORT` (numeric) and `BASE_PATH` (e.g. `/`) — both are enforced by `vite.config.ts` and will throw at startup if missing.

The SPA proxies API requests to the api-server at port 5000; configure your dev proxy or run both servers simultaneously.

## Pages

| Route | Page | Data source |
|-------|------|-------------|
| `/` | Overview | `/api/metrics/summary`, `/api/metrics/activity` |
| `/dora` | DORA Metrics | `/api/metrics/dora`, `/api/metrics/dora/timeseries` |
| `/flow` | Flow Metrics | `/api/metrics/flow` |
| `/deployments` | Deployments | `/api/deployments` |
| `/pull-requests` | Pull Requests | `/api/pull-requests` |
| `/incidents` | Incidents | `/api/incidents` |
| `/teams` | Teams | `/api/teams`, `/api/metrics/team-health` |
| `/teams/:id` | Team Detail | `/api/teams/:id`, DORA + flow metrics |
| `/repositories` | Repositories | `/api/repositories` |
| `/leaderboard` | Leaderboard | `/api/metrics/leaderboard` |

## Key components

- `src/components/dora-rating.tsx` — `DoraRatingBadge` renders a colour-coded DORA level badge
- `src/components/ui/` — shadcn/ui primitives (auto-generated, do not edit)

## Testing

```bash
pnpm test
```

Component tests use `@testing-library/react` with jsdom. Test setup is in `tests/setup.ts` (imports `@testing-library/jest-dom` matchers).

## Tech stack

React 19, Vite 7, Tailwind CSS v4, shadcn/ui, Recharts, Wouter, TanStack Query v5, `@argus/api-client-react` (generated hooks).
