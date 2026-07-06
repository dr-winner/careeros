import { prisma } from "@/lib/db";
import { getTransactionStatus, initiateTransfer, isMoolreConfigured } from "@/lib/moolre";
import { readEnv } from "@/lib/env";
import { getPostHogClient } from "@/lib/posthog-server";
import { sendRewardCreditedEmail, sendWithdrawalEmail } from "@/lib/transactional-emails";
import { smsRewardCredited } from "@/lib/notify-sms";

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

    const [, referrer] = await prisma.$transaction([
      prisma.referral.update({
        where: { id: referral.id },
        data: { rewardStatus: "credited", rewardAmount: amount },
      }),
      prisma.user.update({
        where: { id: referral.referrerId },
        data: { earningsBalance: { increment: amount } },
        select: { email: true, fullName: true, phone: true, earningsBalance: true },
      }),
    ]);

    // The "you just made money" moment — the strongest share trigger we
    // have, delivered on both channels.
    await Promise.all([
      sendRewardCreditedEmail(referrer.email, referrer.fullName, amount, referrer.earningsBalance).catch(() => {}),
      smsRewardCredited(referrer.phone, amount, referrer.earningsBalance),
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

// Refund a withdrawal's amount back to the user's balance, but only if
// this caller wins the race to flip the row out of "processing" — a
// concurrent finalize/request path can never double-credit real cash.
async function refundWithdrawal(withdrawalId: string, userId: string, amount: number): Promise<boolean> {
  const flipped = await prisma.withdrawal.updateMany({
    where: { id: withdrawalId, status: "processing" },
    data: { status: "failed" },
  });
  if (flipped.count !== 1) return false;

  await prisma.user.update({
    where: { id: userId },
    data: { earningsBalance: { increment: amount } },
  });
  return true;
}

// Send the user's full earnings balance to their verified MoMo wallet.
// The balance is deducted atomically before the transfer (no double-spend
// across parallel requests) and refunded if the transfer fails outright.
export async function requestWithdrawal(userId: string): Promise<WithdrawalResult> {
  if (!isMoolreConfigured()) {
    return { ok: false, error: "Withdrawals are temporarily unavailable. Please try again later." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { earningsBalance: true, momoNumber: true, momoChannel: true, email: true, fullName: true },
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
      // Transfer rejected outright — refund the balance (guarded).
      await refundWithdrawal(withdrawal.id, userId, amount);
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
        await refundWithdrawal(withdrawal.id, userId, amount);
        return { ok: false, error: "Transfer failed on the network. Your balance was not affected." };
      }
    }

    if (status === "paid") {
      // Guarded flip: only mark paid if still processing (a concurrent
      // finalize may have already resolved this row).
      await prisma.withdrawal.updateMany({
        where: { id: withdrawal.id, status: "processing" },
        data: { status: "paid", paidAt: new Date() },
      });
    }

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: userId,
      event: "earnings_withdrawn",
      properties: { amount_ghs: amount, status },
    });

    // Receipt email closes the loop (MoMo's own credit alert covers SMS,
    // so no SMS here — don't burn credits duplicating the network's).
    await sendWithdrawalEmail(user.email, user.fullName, amount, user.momoNumber).catch(() => {});

    return { ok: true, amount, status };
  } catch (error) {
    console.error(`Withdrawal error for ${txRef}:`, error);
    await refundWithdrawal(withdrawal.id, userId, amount).catch(() => {});
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
        await prisma.withdrawal.updateMany({
          where: { id: w.id, status: "processing" },
          data: { status: "paid", paidAt: new Date() },
        });
      } else if (status.txstatus === 2) {
        // Guarded refund — two concurrent page loads can't both credit.
        await refundWithdrawal(w.id, userId, w.amount);
      }
      // txstatus 0 or null: still in flight — leave for the next check.
    } catch (error) {
      console.error(`Finalize withdrawal check failed for ${w.id}:`, error);
    }
  }
}
