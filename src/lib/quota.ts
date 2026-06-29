import { prisma } from "@/lib/db";

export const FREE_MONTHLY_LIMIT = 3;

function startOfNextMonth(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export interface QuotaStatus {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
}

/**
 * Check whether a free-tier user has quota remaining for an analysis.
 * Resets the counter lazily when the reset date has passed.
 * Premium users always return allowed=true without touching the DB.
 */
export async function checkQuota(
  userId: string,
  isPremium: boolean,
): Promise<QuotaStatus> {
  const resetAt = startOfNextMonth();

  if (isPremium) {
    return { allowed: true, used: 0, limit: Infinity, remaining: Infinity, resetAt };
  }

  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { analysisCount: true, analysisResetAt: true, bonusAnalyses: true },
  });

  if (!user) {
    return { allowed: false, used: 0, limit: FREE_MONTHLY_LIMIT, remaining: 0, resetAt };
  }

  // Lazy reset: if the stored resetAt is in the past (or unset), reset the counter
  const needsReset = !user.analysisResetAt || user.analysisResetAt <= now;
  const currentCount = needsReset ? 0 : user.analysisCount;

  if (needsReset) {
    await prisma.user.update({
      where: { id: userId },
      data: { analysisCount: 0, analysisResetAt: resetAt },
    });
  }

  const effectiveLimit = FREE_MONTHLY_LIMIT + (user.bonusAnalyses ?? 0);
  const allowed = currentCount < effectiveLimit;
  const remaining = Math.max(0, effectiveLimit - currentCount);

  return {
    allowed,
    used: currentCount,
    limit: effectiveLimit,
    remaining,
    resetAt: user.analysisResetAt && !needsReset ? user.analysisResetAt : resetAt,
  };
}

/** Increment the analysis counter after a successful analysis. */
export async function consumeQuota(userId: string, isPremium: boolean): Promise<void> {
  if (isPremium) return;
  await prisma.user.update({
    where: { id: userId },
    data: { analysisCount: { increment: 1 } },
  });
}
