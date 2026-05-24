/**
 * Analytics time-window helpers.
 * @module
 */

/** Supported rolling time window identifiers. */
export type Period = "7d" | "30d" | "90d";

/** Default period used when no period is specified by the caller. */
export const DEFAULT_PERIOD: Period = "30d";

/**
 * Convert a {@link Period} string to a number of calendar days.
 *
 * @param period - `"7d"`, `"30d"`, or `"90d"`
 * @returns      The corresponding number of days (7, 30, or 90)
 */
export function getPeriodDays(period: Period): number {
  switch (period) {
    case "7d":  return 7;
    case "90d": return 90;
    default:    return 30;
  }
}

/**
 * Compute the `Date` that marks the beginning of a rolling time window.
 *
 * @param period - A {@link Period} string
 * @param now    - Reference point (defaults to the current time)
 * @returns        `now` minus N days
 *
 * @example
 * ```ts
 * const start = getPeriodStart("30d"); // 30 days ago
 * db.where(gte(table.createdAt, start));
 * ```
 */
export function getPeriodStart(period: Period, now: Date = new Date()): Date {
  const days = getPeriodDays(period);
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
