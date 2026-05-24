# @argus/api-spec

OpenAPI 3.1 specification for the Argus REST API. This is the **single source of truth** for all API contracts.

## Files

| File | Purpose |
|------|---------|
| `openapi.yaml` | Full API spec (do not auto-generate — this is hand-authored) |
| `orval.config.ts` | Orval codegen config targeting `lib/api-zod` and `lib/api-client-react` |

## Regenerating derived code

After any change to `openapi.yaml`:

```bash
# 1. Regenerate Zod schemas and React Query hooks
pnpm --filter @argus/api-spec run codegen

# 2. Rebuild lib type declarations
pnpm run typecheck:libs
```

## API tags

| Tag | Description |
|-----|-------------|
| `health` | Health check endpoint |
| `teams` | Team CRUD |
| `repositories` | Repository CRUD |
| `deployments` | Deployment tracking |
| `pull-requests` | Pull request tracking |
| `incidents` | Incident tracking |
| `events` | Raw event ingestion |
| `metrics` | Aggregated analytics |
