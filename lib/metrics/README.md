# @argus/metrics

Pure-function library for DORA four-key metrics classification, team health scores, and leaderboard scores.

**No I/O, no database, no side effects** — everything is synchronous and deterministic, making it trivial to unit-test.

## Contents

| Module | Exports |
|--------|---------|
| `dora.ts` | `classifyDoraRating`, `classifyDeploymentFrequency`, `classifyLeadTime`, `classifyChangeFailureRate`, `classifyMeanTimeToRecovery`, `overallDoraRating`, `RATING_SCORES` |
| `health.ts` | `computeHealthScore`, `computeLeaderboardScore` |
| `period.ts` | `getPeriodStart`, `getPeriodDays`, `DEFAULT_PERIOD` |

## DORA thresholds (Google State of DevOps 2023)

| Metric | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| Deployment Frequency | ≥ 1/day | ≥ 1/week | ≥ 1/month | < 1/month |
| Lead Time | < 1 hour | < 24 hours | < 1 week | ≥ 1 week |
| Change Failure Rate | ≤ 5% | ≤ 10% | ≤ 15% | > 15% |
| MTTR | < 1 hour | < 24 hours | < 1 week | ≥ 1 week |

## Running tests

```bash
pnpm --filter @argus/metrics test
```
