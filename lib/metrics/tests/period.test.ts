import { describe, it, expect } from "vitest";
import { getPeriodDays, getPeriodStart, DEFAULT_PERIOD } from "../src/period.js";

describe("getPeriodDays", () => {
  it("returns 7 for '7d'", () => {
    expect(getPeriodDays("7d")).toBe(7);
  });

  it("returns 30 for '30d'", () => {
    expect(getPeriodDays("30d")).toBe(30);
  });

  it("returns 90 for '90d'", () => {
    expect(getPeriodDays("90d")).toBe(90);
  });
});

describe("getPeriodStart", () => {
  it("returns exactly N days before the provided reference date", () => {
    const reference = new Date("2025-02-01T12:00:00.000Z");

    expect(getPeriodStart("7d", reference).toISOString()).toBe(
      new Date("2025-01-25T12:00:00.000Z").toISOString(),
    );
    expect(getPeriodStart("30d", reference).toISOString()).toBe(
      new Date("2025-01-02T12:00:00.000Z").toISOString(),
    );
    expect(getPeriodStart("90d", reference).toISOString()).toBe(
      new Date("2024-11-03T12:00:00.000Z").toISOString(),
    );
  });

  it("uses the current time when 'now' is omitted", () => {
    const before = Date.now();
    const start = getPeriodStart("30d");
    const after = Date.now();

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(start.getTime()).toBeGreaterThanOrEqual(before - thirtyDaysMs);
    expect(start.getTime()).toBeLessThanOrEqual(after - thirtyDaysMs);
  });

  it("returns a Date object, not a string", () => {
    expect(getPeriodStart("7d")).toBeInstanceOf(Date);
  });

  it("the returned date is strictly before the reference date", () => {
    const now = new Date();
    const start = getPeriodStart("30d", now);
    expect(start.getTime()).toBeLessThan(now.getTime());
  });
});

describe("DEFAULT_PERIOD", () => {
  it("is '30d'", () => {
    expect(DEFAULT_PERIOD).toBe("30d");
  });
});
