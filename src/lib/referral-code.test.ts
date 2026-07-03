import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindFirstUser = vi.fn();
const mockFindFirstReferral = vi.fn();
const mockCreateReferral = vi.fn();
const mockCapture = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findFirst: (...args: unknown[]) => mockFindFirstUser(...args) },
    referral: {
      findFirst: (...args: unknown[]) => mockFindFirstReferral(...args),
      create: (...args: unknown[]) => mockCreateReferral(...args),
    },
  },
}));

vi.mock("@/lib/posthog-server", () => ({
  getPostHogClient: () => ({ capture: mockCapture }),
}));

import {
  attributeReferral,
  buildReferralCode,
  findReferrerByCode,
  isValidReferralCode,
} from "./referral-code";

const CUID = "clx1a2b3c4d5e6f7g8h9i0j1k";

describe("referral-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildReferralCode", () => {
    it("uses the uppercased last 10 chars of the user id", () => {
      expect(buildReferralCode(CUID)).toBe("CAREER-8H9I0J1K".replace("8H9I0J1K", CUID.slice(-10).toUpperCase()));
      expect(buildReferralCode(CUID)).toMatch(/^CAREER-[A-Z0-9]{10}$/);
    });

    it("strips non-alphanumeric characters before slicing", () => {
      expect(buildReferralCode("user-with-dashes-abc123")).toBe(
        `CAREER-${"userwithdashesabc123".slice(-10).toUpperCase()}`,
      );
    });
  });

  describe("isValidReferralCode", () => {
    it("accepts codes produced by buildReferralCode", () => {
      expect(isValidReferralCode(buildReferralCode(CUID))).toBe(true);
    });

    it("rejects malformed codes", () => {
      expect(isValidReferralCode("")).toBe(false);
      expect(isValidReferralCode("CAREER-")).toBe(false);
      expect(isValidReferralCode("CAREER-lowercase")).toBe(false);
      expect(isValidReferralCode("OTHER-ABC123")).toBe(false);
      expect(isValidReferralCode("CAREER-TOOLONGSUFFIX")).toBe(false);
    });
  });

  describe("findReferrerByCode", () => {
    it("round-trips: looks up the lowercased suffix of a built code", async () => {
      mockFindFirstUser.mockResolvedValue({ id: CUID, email: "ref@example.com" });

      const result = await findReferrerByCode(buildReferralCode(CUID));

      expect(result?.id).toBe(CUID);
      expect(mockFindFirstUser).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { endsWith: CUID.slice(-10) } },
        }),
      );
    });

    it("returns null without querying for invalid codes", async () => {
      expect(await findReferrerByCode("not-a-code")).toBeNull();
      expect(mockFindFirstUser).not.toHaveBeenCalled();
    });
  });

  describe("attributeReferral", () => {
    const code = buildReferralCode(CUID);

    it("creates a pending referral with the lowercased referee email", async () => {
      mockFindFirstUser.mockResolvedValue({ id: CUID, email: "ref@example.com" });
      mockFindFirstReferral.mockResolvedValue(null);
      mockCreateReferral.mockResolvedValue({});

      const ok = await attributeReferral(code, { id: "newuser1", email: "New@Example.COM" });

      expect(ok).toBe(true);
      expect(mockCreateReferral).toHaveBeenCalledWith({
        data: {
          referrerId: CUID,
          refereeEmail: "new@example.com",
          referralCode: code,
        },
      });
      expect(mockCapture).toHaveBeenCalled();
    });

    it("rejects self-referrals", async () => {
      mockFindFirstUser.mockResolvedValue({ id: CUID, email: "ref@example.com" });

      const ok = await attributeReferral(code, { id: CUID, email: "ref@example.com" });

      expect(ok).toBe(false);
      expect(mockCreateReferral).not.toHaveBeenCalled();
    });

    it("skips when a referral already exists for the email", async () => {
      mockFindFirstUser.mockResolvedValue({ id: CUID, email: "ref@example.com" });
      mockFindFirstReferral.mockResolvedValue({ id: "existing" });

      const ok = await attributeReferral(code, { id: "newuser1", email: "new@example.com" });

      expect(ok).toBe(false);
      expect(mockCreateReferral).not.toHaveBeenCalled();
    });

    it("never throws when the database fails", async () => {
      mockFindFirstUser.mockRejectedValue(new Error("db down"));

      await expect(
        attributeReferral(code, { id: "newuser1", email: "new@example.com" }),
      ).resolves.toBe(false);
    });
  });
});
