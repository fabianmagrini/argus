/**
 * DORA four-key metrics — classification logic.
 *
 * Thresholds are taken verbatim from Google's State of DevOps 2023 report.
 * @see https://dora.dev/research/
 *
 * @module
 */

/** Possible performance levels for any DORA metric. */
export type DoraRating = "elite" | "high" | "medium" | "low";

/** Short identifiers for the four DORA metric keys. */
export type DoraMetricKey = "df" | "lt" | "cfr" | "mttr";

/** Numeric score assigned to each rating level, used for averages. */
export const RATING_SCORES: Readonly<Record<DoraRating, number>> = {
  elite: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// ─── Individual classifiers ─────────────────────────────────────────────────

/**
 * Classify a **Deployment Frequency** value.
 *
 * | Rating | Threshold           |
 * |--------|---------------------|
 * | elite  | ≥ 1 deploy / day    |
 * | high   | ≥ 1 deploy / week   |
 * | medium | ≥ 1 deploy / month  |
 * | low    | < 1 deploy / month  |
 *
 * @param deploysPerDay - Average number of successful deploys per calendar day
 */
export function classifyDeploymentFrequency(deploysPerDay: number): DoraRating {
  if (deploysPerDay >= 1) return "elite";
  if (deploysPerDay >= 1 / 7) return "high";
  if (deploysPerDay >= 1 / 30) return "medium";
  return "low";
}

/**
 * Classify a **Lead Time for Changes** value.
 *
 * | Rating | Threshold  |
 * |--------|------------|
 * | elite  | < 1 hour   |
 * | high   | < 24 hours |
 * | medium | < 1 week   |
 * | low    | ≥ 1 week   |
 *
 * @param hours - Average lead time from commit to production deploy, in hours
 */
export function classifyLeadTime(hours: number): DoraRating {
  if (hours < 1) return "elite";
  if (hours < 24) return "high";
  if (hours < 168) return "medium";
  return "low";
}

/**
 * Classify a **Change Failure Rate** value.
 *
 * | Rating | Threshold |
 * |--------|-----------|
 * | elite  | ≤ 5%      |
 * | high   | ≤ 10%     |
 * | medium | ≤ 15%     |
 * | low    | > 15%     |
 *
 * @param ratio - Fraction of deploys that result in a failure or rollback (0–1)
 */
export function classifyChangeFailureRate(ratio: number): DoraRating {
  if (ratio <= 0.05) return "elite";
  if (ratio <= 0.10) return "high";
  if (ratio <= 0.15) return "medium";
  return "low";
}

/**
 * Classify a **Mean Time to Recovery** value.
 *
 * | Rating | Threshold  |
 * |--------|------------|
 * | elite  | < 1 hour   |
 * | high   | < 24 hours |
 * | medium | < 1 week   |
 * | low    | ≥ 1 week   |
 *
 * @param hours - Average time from incident open to resolution, in hours
 */
export function classifyMeanTimeToRecovery(hours: number): DoraRating {
  if (hours < 1) return "elite";
  if (hours < 24) return "high";
  if (hours < 168) return "medium";
  return "low";
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────

/**
 * Dispatch to the appropriate per-metric classifier.
 *
 * @param metric - One of `"df"`, `"lt"`, `"cfr"`, `"mttr"`
 * @param value  - Numeric value in the expected unit for that key:
 *                 - `df`   → deploys/day
 *                 - `lt`   → hours
 *                 - `cfr`  → ratio (0–1)
 *                 - `mttr` → hours
 */
export function classifyDoraRating(metric: DoraMetricKey, value: number): DoraRating {
  switch (metric) {
    case "df":   return classifyDeploymentFrequency(value);
    case "lt":   return classifyLeadTime(value);
    case "cfr":  return classifyChangeFailureRate(value);
    case "mttr": return classifyMeanTimeToRecovery(value);
  }
}

// ─── Overall rating ──────────────────────────────────────────────────────────

/**
 * Compute an overall DORA performance rating from the four individual ratings.
 *
 * The four ratings are converted to numeric scores (elite=4 … low=1), averaged,
 * then mapped back to a rating:
 *
 * | Avg score | Rating |
 * |-----------|--------|
 * | ≥ 3.5     | elite  |
 * | ≥ 2.5     | high   |
 * | ≥ 1.5     | medium |
 * | < 1.5     | low    |
 *
 * @param df   - Deployment Frequency rating
 * @param lt   - Lead Time rating
 * @param cfr  - Change Failure Rate rating
 * @param mttr - Mean Time to Recovery rating
 */
export function overallDoraRating(
  df: DoraRating,
  lt: DoraRating,
  cfr: DoraRating,
  mttr: DoraRating,
): DoraRating {
  const avg =
    (RATING_SCORES[df] + RATING_SCORES[lt] + RATING_SCORES[cfr] + RATING_SCORES[mttr]) / 4;
  if (avg >= 3.5) return "elite";
  if (avg >= 2.5) return "high";
  if (avg >= 1.5) return "medium";
  return "low";
}
