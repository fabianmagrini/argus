/**
 * Team health and leaderboard score computation.
 * @module
 */

import { RATING_SCORES, type DoraRating } from "./dora.js";

/**
 * Compute a 0–100 team health score from three DORA ratings.
 *
 * Averages the deployment frequency, lead time, and change failure rate ratings
 * (each scored 1–4), then scales the result to [0, 100].
 *
 * MTTR is intentionally excluded — the health score reflects delivery cadence
 * and quality; incident response is tracked separately.
 *
 * | All elite (4+4+4)/3 × 25 = **100** |
 * | All low   (1+1+1)/3 × 25 = **25**  |
 *
 * @param dfRating  - Deployment Frequency DORA rating
 * @param ltRating  - Lead Time DORA rating
 * @param cfrRating - Change Failure Rate DORA rating
 */
export function computeHealthScore(
  dfRating: DoraRating,
  ltRating: DoraRating,
  cfrRating: DoraRating,
): number {
  const avg =
    (RATING_SCORES[dfRating] + RATING_SCORES[ltRating] + RATING_SCORES[cfrRating]) / 3;
  return Math.round(avg * 25);
}

/**
 * Compute a 0–100 leaderboard score from all four DORA ratings.
 *
 * Averages all four ratings (each scored 1–4), then scales to [0, 100].
 *
 * | All elite (4+4+4+4)/4 × 25 = **100** |
 * | All low   (1+1+1+1)/4 × 25 = **25**  |
 *
 * @param dfRating   - Deployment Frequency rating
 * @param ltRating   - Lead Time rating
 * @param cfrRating  - Change Failure Rate rating
 * @param mttrRating - Mean Time to Recovery rating
 */
export function computeLeaderboardScore(
  dfRating: DoraRating,
  ltRating: DoraRating,
  cfrRating: DoraRating,
  mttrRating: DoraRating,
): number {
  const avg =
    (RATING_SCORES[dfRating] +
      RATING_SCORES[ltRating] +
      RATING_SCORES[cfrRating] +
      RATING_SCORES[mttrRating]) /
    4;
  return Math.round(avg * 25);
}
