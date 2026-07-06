import { prisma } from "@/lib/db";
import { getPostHogClient } from "@/lib/posthog-server";

export const REFERRAL_COOKIE = "careeros_ref";
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function buildReferralCode(userId: string): string {
  return `CAREER-${userId
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-10)
    .toUpperCase()}`;
}

export function isValidReferralCode(code: string): boolean {
  return /^CAREER-[A-Z0-9]{1,10}$/.test(code);
}

// Reverse buildReferralCode: cuids are lowercase, so lowercasing the code
// suffix recovers the tail of the referrer's user id. A 10-char cuid tail
// collision is ~impossible, but orderBy makes the result deterministic
// (oldest account wins) if it ever happens.
export async function findReferrerByCode(code: string) {
  if (!isValidReferralCode(code)) return null;
  const suffix = code.slice("CAREER-".length).toLowerCase();
  return prisma.user.findFirst({
    where: { id: { endsWith: suffix } },
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
  });
}

// Link a fresh signup to the referrer whose ?ref= link brought them here.
// Creates the same pending Referral record as an email invite, so the
// premium-conversion reward flow picks it up with no extra wiring.
export async function attributeReferral(
  code: string,
  referee: { id: string; email: string },
): Promise<boolean> {
  try {
    const referrer = await findReferrerByCode(code);
    if (!referrer || referrer.id === referee.id) return false;

    const refereeEmail = referee.email.toLowerCase();

    // One referrer per referee — the reward flow matches on email alone,
    // so a second record would double-count the same conversion.
    const existing = await prisma.referral.findFirst({
      where: { refereeEmail },
      select: { id: true },
    });
    if (existing) return false;

    await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeEmail,
        referralCode: code,
      },
    });

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: referrer.id,
      event: "referral_attributed",
      properties: { source: "link", referee_id: referee.id },
    });

    return true;
  } catch (error) {
    console.error("attributeReferral error:", error);
    return false;
  }
}
