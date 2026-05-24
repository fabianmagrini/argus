import { describe, it, expect } from "vitest";
import {
  classifyDeploymentFrequency,
  classifyLeadTime,
  classifyChangeFailureRate,
  classifyMeanTimeToRecovery,
  classifyDoraRating,
  overallDoraRating,
  RATING_SCORES,
} from "../src/dora.js";

// ─── classifyDeploymentFrequency ─────────────────────────────────────────────

describe("classifyDeploymentFrequency", () => {
  it("elite: ≥ 1 deploy/day", () => {
    expect(classifyDeploymentFrequency(1)).toBe("elite");
    expect(classifyDeploymentFrequency(5)).toBe("elite");
  });

  it("high: ≥ 1/week but < 1/day", () => {
    expect(classifyDeploymentFrequency(1 / 7)).toBe("high");
    expect(classifyDeploymentFrequency(0.5)).toBe("high");
  });

  it("medium: ≥ 1/month but < 1/week", () => {
    expect(classifyDeploymentFrequency(1 / 30)).toBe("medium");
    expect(classifyDeploymentFrequency(0.05)).toBe("medium");
  });

  it("low: < 1/month", () => {
    expect(classifyDeploymentFrequency(0)).toBe("low");
    expect(classifyDeploymentFrequency(0.01)).toBe("low");
  });

  it("boundary: exactly 1/week is high", () => {
    expect(classifyDeploymentFrequency(1 / 7)).toBe("high");
  });

  it("boundary: exactly 1/month is medium", () => {
    expect(classifyDeploymentFrequency(1 / 30)).toBe("medium");
  });
});

// ─── classifyLeadTime ────────────────────────────────────────────────────────

describe("classifyLeadTime", () => {
  it("elite: < 1 hour", () => {
    expect(classifyLeadTime(0)).toBe("elite");
    expect(classifyLeadTime(0.99)).toBe("elite");
  });

  it("high: 1–23 hours", () => {
    expect(classifyLeadTime(1)).toBe("high");
    expect(classifyLeadTime(12)).toBe("high");
    expect(classifyLeadTime(23)).toBe("high");
  });

  it("medium: 24–167 hours", () => {
    expect(classifyLeadTime(24)).toBe("medium");
    expect(classifyLeadTime(100)).toBe("medium");
    expect(classifyLeadTime(167)).toBe("medium");
  });

  it("low: ≥ 168 hours (1 week)", () => {
    expect(classifyLeadTime(168)).toBe("low");
    expect(classifyLeadTime(500)).toBe("low");
  });
});

// ─── classifyChangeFailureRate ───────────────────────────────────────────────

describe("classifyChangeFailureRate", () => {
  it("elite: ≤ 5%", () => {
    expect(classifyChangeFailureRate(0)).toBe("elite");
    expect(classifyChangeFailureRate(0.05)).toBe("elite");
  });

  it("high: > 5% and ≤ 10%", () => {
    expect(classifyChangeFailureRate(0.051)).toBe("high");
    expect(classifyChangeFailureRate(0.10)).toBe("high");
  });

  it("medium: > 10% and ≤ 15%", () => {
    expect(classifyChangeFailureRate(0.101)).toBe("medium");
    expect(classifyChangeFailureRate(0.15)).toBe("medium");
  });

  it("low: > 15%", () => {
    expect(classifyChangeFailureRate(0.151)).toBe("low");
    expect(classifyChangeFailureRate(1)).toBe("low");
  });
});

// ─── classifyMeanTimeToRecovery ──────────────────────────────────────────────

describe("classifyMeanTimeToRecovery", () => {
  it("elite: < 1 hour", () => {
    expect(classifyMeanTimeToRecovery(0)).toBe("elite");
    expect(classifyMeanTimeToRecovery(0.99)).toBe("elite");
  });

  it("high: 1–23 hours", () => {
    expect(classifyMeanTimeToRecovery(1)).toBe("high");
    expect(classifyMeanTimeToRecovery(23)).toBe("high");
  });

  it("medium: 24–167 hours", () => {
    expect(classifyMeanTimeToRecovery(24)).toBe("medium");
    expect(classifyMeanTimeToRecovery(167)).toBe("medium");
  });

  it("low: ≥ 168 hours", () => {
    expect(classifyMeanTimeToRecovery(168)).toBe("low");
    expect(classifyMeanTimeToRecovery(1000)).toBe("low");
  });
});

// ─── classifyDoraRating dispatcher ───────────────────────────────────────────

describe("classifyDoraRating", () => {
  it("dispatches 'df' to deployment frequency classifier", () => {
    expect(classifyDoraRating("df", 2)).toBe("elite");
    expect(classifyDoraRating("df", 0)).toBe("low");
  });

  it("dispatches 'lt' to lead time classifier", () => {
    expect(classifyDoraRating("lt", 0.5)).toBe("elite");
    expect(classifyDoraRating("lt", 200)).toBe("low");
  });

  it("dispatches 'cfr' to change failure rate classifier", () => {
    expect(classifyDoraRating("cfr", 0.04)).toBe("elite");
    expect(classifyDoraRating("cfr", 0.2)).toBe("low");
  });

  it("dispatches 'mttr' to MTTR classifier", () => {
    expect(classifyDoraRating("mttr", 0.5)).toBe("elite");
    expect(classifyDoraRating("mttr", 200)).toBe("low");
  });
});

// ─── overallDoraRating ───────────────────────────────────────────────────────

describe("overallDoraRating", () => {
  it("returns elite when all four are elite (avg = 4.0)", () => {
    expect(overallDoraRating("elite", "elite", "elite", "elite")).toBe("elite");
  });

  it("returns elite at the boundary avg = 3.5 (4+4+3+3)/4", () => {
    expect(overallDoraRating("elite", "elite", "high", "high")).toBe("elite");
  });

  it("returns high when avg = 2.5–3.5", () => {
    // (4+3+2+2)/4 = 2.75
    expect(overallDoraRating("elite", "high", "medium", "medium")).toBe("high");
  });

  it("returns medium when avg = 1.5–2.5", () => {
    // (2+2+2+2)/4 = 2.0
    expect(overallDoraRating("medium", "medium", "medium", "medium")).toBe("medium");
  });

  it("returns low when all four are low (avg = 1.0)", () => {
    expect(overallDoraRating("low", "low", "low", "low")).toBe("low");
  });

  it("returns medium at the boundary avg = 1.5", () => {
    // (1+1+2+2)/4 = 1.5
    expect(overallDoraRating("low", "low", "medium", "medium")).toBe("medium");
  });
});

// ─── RATING_SCORES constant ──────────────────────────────────────────────────

describe("RATING_SCORES", () => {
  it("has ascending numeric scores (low < medium < high < elite)", () => {
    expect(RATING_SCORES.low).toBeLessThan(RATING_SCORES.medium);
    expect(RATING_SCORES.medium).toBeLessThan(RATING_SCORES.high);
    expect(RATING_SCORES.high).toBeLessThan(RATING_SCORES.elite);
  });

  it("elite scores 4", () => {
    expect(RATING_SCORES.elite).toBe(4);
  });

  it("low scores 1", () => {
    expect(RATING_SCORES.low).toBe(1);
  });
});
