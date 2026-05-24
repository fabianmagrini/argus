import { describe, it, expect } from "vitest";
import { computeHealthScore, computeLeaderboardScore } from "../src/health.js";

describe("computeHealthScore", () => {
  it("returns 100 when all three ratings are elite — (4+4+4)/3 × 25 = 100", () => {
    expect(computeHealthScore("elite", "elite", "elite")).toBe(100);
  });

  it("returns 25 when all three ratings are low — (1+1+1)/3 × 25 = 25", () => {
    expect(computeHealthScore("low", "low", "low")).toBe(25);
  });

  it("correctly mixes ratings — elite+high+medium = (4+3+2)/3 × 25 = 75", () => {
    expect(computeHealthScore("elite", "high", "medium")).toBe(75);
  });

  it("rounds fractional scores — (4+2+1)/3 × 25 ≈ 58.33 → 58", () => {
    expect(computeHealthScore("elite", "medium", "low")).toBe(58);
  });

  it("rounds 0.5 up — (4+1+1)/3 × 25 = 50", () => {
    // (4+1+1)/3 = 2 exactly → 2 × 25 = 50
    expect(computeHealthScore("elite", "low", "low")).toBe(50);
  });

  it("returns an integer between 25 and 100 for all valid inputs", () => {
    const ratings = ["elite", "high", "medium", "low"] as const;
    for (const a of ratings) {
      for (const b of ratings) {
        for (const c of ratings) {
          const score = computeHealthScore(a, b, c);
          expect(score).toBeGreaterThanOrEqual(25);
          expect(score).toBeLessThanOrEqual(100);
          expect(Number.isInteger(score)).toBe(true);
        }
      }
    }
  });
});

describe("computeLeaderboardScore", () => {
  it("returns 100 when all four ratings are elite — (4+4+4+4)/4 × 25 = 100", () => {
    expect(computeLeaderboardScore("elite", "elite", "elite", "elite")).toBe(100);
  });

  it("returns 25 when all four ratings are low — (1+1+1+1)/4 × 25 = 25", () => {
    expect(computeLeaderboardScore("low", "low", "low", "low")).toBe(25);
  });

  it("correctly mixes ratings — (4+3+2+1)/4 × 25 = 62.5 → 63", () => {
    expect(computeLeaderboardScore("elite", "high", "medium", "low")).toBe(63);
  });

  it("returns a value between 25 and 100 for all valid inputs", () => {
    const ratings = ["elite", "high", "medium", "low"] as const;
    for (const a of ratings) {
      for (const b of ratings) {
        const score = computeLeaderboardScore(a, b, a, b);
        expect(score).toBeGreaterThanOrEqual(25);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });
});
