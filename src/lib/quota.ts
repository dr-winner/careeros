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

/**
 * Atomically claim one analysis slot. Unlike checkQuota + consumeQuota,
 * the conditional increment makes parallel requests race-safe — N
 * concurrent calls can never exceed the limit. Pair with releaseQuota
 * to refund the slot if the analysis fails.
 */
export async function claimQuota(
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

  if (!user.analysisResetAt || user.analysisResetAt <= now) {
    await prisma.user.update({
      where: { id: userId },
      data: { analysisCount: 0, analysisResetAt: resetAt },
    });
  }

  const effectiveLimit = FREE_MONTHLY_LIMIT + (user.bonusAnalyses ?? 0);

  const claimed = await prisma.user.updateMany({
    where: { id: userId, analysisCount: { lt: effectiveLimit } },
    data: { analysisCount: { increment: 1 } },
  });

  const allowed = claimed.count === 1;
  const after = await prisma.user.findUnique({
    where: { id: userId },
    select: { analysisCount: true, analysisResetAt: true },
  });
  const used = after?.analysisCount ?? effectiveLimit;

  return {
    allowed,
    used,
    limit: effectiveLimit,
    remaining: Math.max(0, effectiveLimit - used),
    resetAt: after?.analysisResetAt ?? resetAt,
  };
}

/** Refund a claimed slot when the analysis fails after claiming. */
export async function releaseQuota(userId: string, isPremium: boolean): Promise<void> {
  if (isPremium) return;
  await prisma.user.updateMany({
    where: { id: userId, analysisCount: { gt: 0 } },
    data: { analysisCount: { decrement: 1 } },
  });
}
