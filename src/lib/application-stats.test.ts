import { describe, expect, it } from "vitest";
import { advancedPastAppliedCount, advancedRatePercent } from "./application-stats";

describe("application-stats", () => {
  it("treats Interview as moved forward, not an employer response rate", () => {
    const statuses = ["Applied", "Interview"];
    expect(advancedPastAppliedCount(statuses)).toBe(1);
    expect(advancedRatePercent(statuses)).toBe(50);
  });

  it("ignores Withdrawn and Rejected for the advanced rate", () => {
    expect(advancedRatePercent(["Applied", "Rejected", "Withdrawn"])).toBe(0);
    expect(advancedRatePercent(["Offer", "Applied"])).toBe(50);
  });

  it("returns 0 with no applications", () => {
    expect(advancedRatePercent([])).toBe(0);
  });
});
