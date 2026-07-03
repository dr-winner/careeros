import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/referral-reward", () => ({ processReferralReward: vi.fn() }));

import { parseExternalRef } from "./subscription";

describe("parseExternalRef", () => {
  it("parses the new monthly format", () => {
    expect(parseExternalRef("co-clxuser123-m-1720000000000")).toEqual({
      userId: "clxuser123",
      billingCycle: "monthly",
    });
  });

  it("parses the new annual format", () => {
    expect(parseExternalRef("co-clxuser123-a-1720000000000")).toEqual({
      userId: "clxuser123",
      billingCycle: "annual",
    });
  });

  it("treats the legacy three-part format as lifetime", () => {
    expect(parseExternalRef("co-clxuser123-1720000000000")).toEqual({
      userId: "clxuser123",
      billingCycle: "lifetime",
    });
  });

  it("returns null userId for refs without the co- prefix", () => {
    expect(parseExternalRef("rw-someref").userId).toBeNull();
    expect(parseExternalRef("").userId).toBeNull();
  });

  it("defaults unknown plan codes to monthly", () => {
    expect(parseExternalRef("co-clxuser123-x-1720000000000").billingCycle).toBe("monthly");
  });
});
