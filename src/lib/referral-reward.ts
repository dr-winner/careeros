import { prisma } from "@/lib/db";
import { getTransactionStatus, initiateTransfer, isMoolreConfigured } from "@/lib/moolre";
import { readEnv } from "@/lib/env";
import { getPostHogClient } from "@/lib/posthog-server";

// GHS credited to the referrer's in-app earnings balance when their
// referee goes premium. Paid out via Moolre only when they withdraw.
export function getReferralRewardAmount(): number {
  return parseFloat(readEnv("MOOLRE_REFERRAL_REWARD_GHS") || "5");
}

export const MIN_WITHDRAWAL_GHS = 5;

// Called after a subscription activates. Finds the referral that matches
// the new premium user's email and credits the referrer's balance —
// no money moves until the referrer chooses to withdraw. Never throws.
export async function processReferralReward(newPremiumUserId: string): Promise<void> {
  try {
    const referee = await prisma.user.findUnique({
      where: { id: newPremiumUserId },
      select: { email: true },
    });
    if (!referee) return;

    // "pending" = invited, "engaged" = ran their first analysis (bonus
    // credit already given); both are still eligible for the cash reward.
    const referral = await prisma.referral.findFirst({
      where: {
        refereeEmail: referee.email.toLowerCase(),
        status: { in: ["pending", "engaged"] },
      },
      select: { id: true, referrerId: true },
    });
    if (!referral) return;

    // Self-referral guard: never credit a user for their own upgrade.
    if (referral.referrerId === newPremiumUserId) return;

    // Claim the referral atomically — the updateMany count tells us whether
    // this invocation won the race (webhook + manual verify can both fire).
    const claimed = await prisma.referral.updateMany({
      where: { id: referral.id, status: { in: ["pending", "engaged"] } },
      data: { status: "converted", convertedAt: new Date() },
    });
    if (claimed.count === 0) return;

    const amount = getReferralRewardAmount();

    await prisma.$transaction([
      prisma.referral.update({
        where: { id: referral.id },
        data: { rewardStatus: "credited", rewardAmount: amount },
      }),
      prisma.user.update({
        where: { id: referral.referrerId },
        data: { earningsBalance: { increment: amount } },
      }),
    ]);

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: referral.referrerId,
      event: "referral_reward_credited",
      properties: { amount_ghs: amount, referral_id: referral.id },
    });
  } catch (error) {
    console.error("processReferralReward error:", error);
  }
}

export type WithdrawalResult =
  | { ok: true; amount: number; status: "paid" | "processing" }
  | { ok: false; error: string };

// Send the user's full earnings balance to their verified MoMo wallet.
// The balance is deducted atomically before the transfer (no double-spend
// across parallel requests) and refunded if the transfer fails outright.
export async function requestWithdrawal(userId: string): Promise<WithdrawalResult> {
  if (!isMoolreConfigured()) {
    return { ok: false, error: "Withdrawals are temporarily unavailable. Please try again later." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { earningsBalance: true, momoNumber: true, momoChannel: true },
  });
  if (!user) return { ok: false, error: "Account not found." };

  if (!user.momoNumber || !user.momoChannel) {
    return { ok: false, error: "Add your Mobile Money number in your profile first." };
  }

  const amount = Math.floor(user.earningsBalance * 100) / 100;
  if (amount < MIN_WITHDRAWAL_GHS) {
    return { ok: false, error: `Minimum withdrawal is GHS ${MIN_WITHDRAWAL_GHS}.` };
  }

  // Atomic deduction: only succeeds if the balance still covers the amount.
  const deducted = await prisma.user.updateMany({
    where: { id: userId, earningsBalance: { gte: amount } },
    data: { earningsBalance: { decrement: amount } },
  });
  if (deducted.count === 0) {
    return { ok: false, error: "Balance changed — please refresh and try again." };
  }

  const txRef = `wd-${userId.slice(-10)}-${Date.now()}`;
  const withdrawal = await prisma.withdrawal.create({
    data: { userId, amount, txRef, momoNumber: user.momoNumber },
  });

  try {
    const transfer = await initiateTransfer({
      amount: String(amount),
      receiver: user.momoNumber,
      channel: user.momoChannel,
      externalref: txRef,
      reference: "CareerOS referral earnings",
    });

    if (!transfer.initiated) {
      // Transfer rejected outright — refund the balance.
      await prisma.$transaction([
        prisma.withdrawal.update({ where: { id: withdrawal.id }, data: { status: "failed" } }),
        prisma.user.update({ where: { id: userId }, data: { earningsBalance: { increment: amount } } }),
      ]);
      console.error(`Withdrawal failed: ref=${txRef} code=${transfer.code}`);
      return { ok: false, error: "Transfer could not be completed. Your balance was not affected." };
    }

    let status: "paid" | "processing" = "processing";
    if (transfer.settled) {
      status = "paid";
    } else {
      const check = await getTransactionStatus(txRef).catch(() => ({ txstatus: null }));
      if (check.txstatus === 1) status = "paid";
      if (check.txstatus === 2) {
        await prisma.$transaction([
          prisma.withdrawal.update({ where: { id: withdrawal.id }, data: { status: "failed" } }),
          prisma.user.update({ where: { id: userId }, data: { earningsBalance: { increment: amount } } }),
        ]);
        return { ok: false, error: "Transfer failed on the network. Your balance was not affected." };
      }
    }

    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status, ...(status === "paid" ? { paidAt: new Date() } : {}) },
    });

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: userId,
      event: "earnings_withdrawn",
      properties: { amount_ghs: amount, status },
    });

    return { ok: true, amount, status };
  } catch (error) {
    console.error(`Withdrawal error for ${txRef}:`, error);
    await prisma.$transaction([
      prisma.withdrawal.update({ where: { id: withdrawal.id }, data: { status: "failed" } }),
      prisma.user.update({ where: { id: userId }, data: { earningsBalance: { increment: amount } } }),
    ]);
    return { ok: false, error: "Something went wrong. Your balance was not affected." };
  }
}

// Resolve withdrawals stuck in "processing" by checking the transfer's
// final status with Moolre. Called when the user views their referrals.
export async function finalizeProcessingWithdrawals(userId: string): Promise<void> {
  if (!isMoolreConfigured()) return;

  const processing = await prisma.withdrawal.findMany({
    where: { userId, status: "processing" },
    select: { id: true, txRef: true, amount: true },
  });

  for (const w of processing) {
    try {
      const status = await getTransactionStatus(w.txRef);
      if (status.txstatus === 1) {
        await prisma.withdrawal.update({
          where: { id: w.id },
          data: { status: "paid", paidAt: new Date() },
        });
      } else if (status.txstatus === 2) {
        await prisma.$transaction([
          prisma.withdrawal.update({ where: { id: w.id }, data: { status: "failed" } }),
          prisma.user.update({ where: { id: userId }, data: { earningsBalance: { increment: w.amount } } }),
        ]);
      }
      // txstatus 0 or null: still in flight — leave for the next check.
    } catch (error) {
      console.error(`Finalize withdrawal check failed for ${w.id}:`, error);
    }
  }
}
