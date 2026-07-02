import { prisma } from "@/lib/db";
import { initiateTransfer, isMoolreConfigured } from "@/lib/moolre";
import { readEnv } from "@/lib/env";
import { getPostHogClient } from "@/lib/posthog-server";

// GHS paid to the referrer's MoMo wallet when their referee goes premium.
export function getReferralRewardAmount(): string {
  return readEnv("MOOLRE_REFERRAL_REWARD_GHS") || "5";
}

// Called after a subscription activates. Finds the pending referral that
// matches the new premium user's email and pays the referrer via Moolre
// Disbursements. Never throws — payment activation must not fail because
// a reward couldn't be sent.
export async function processReferralReward(newPremiumUserId: string): Promise<void> {
  try {
    const referee = await prisma.user.findUnique({
      where: { id: newPremiumUserId },
      select: { email: true },
    });
    if (!referee) return;

    const referral = await prisma.referral.findFirst({
      where: { refereeEmail: referee.email.toLowerCase(), status: "pending" },
      include: {
        user: { select: { id: true, momoNumber: true, momoChannel: true, fullName: true } },
      },
    });
    if (!referral) return;

    // Self-referral guard: never pay a user for their own upgrade.
    if (referral.referrerId === newPremiumUserId) return;

    // Claim the referral atomically — the updateMany count tells us whether
    // this invocation won the race (webhook + manual verify can both fire).
    const claimed = await prisma.referral.updateMany({
      where: { id: referral.id, status: "pending" },
      data: { status: "converted", convertedAt: new Date() },
    });
    if (claimed.count === 0) return;

    const { momoNumber, momoChannel } = referral.user;
    const amount = getReferralRewardAmount();

    if (!isMoolreConfigured() || !momoNumber || !momoChannel) {
      // Referrer hasn't added a payout wallet yet; leave the reward claimable.
      await prisma.referral.update({
        where: { id: referral.id },
        data: { rewardStatus: "unpayable", rewardAmount: parseFloat(amount) },
      });
      return;
    }

    const rewardTxRef = `rw-${referral.id}`;

    await prisma.referral.update({
      where: { id: referral.id },
      data: { rewardStatus: "processing", rewardAmount: parseFloat(amount), rewardTxRef },
    });

    const transfer = await initiateTransfer({
      amount,
      receiver: momoNumber,
      channel: momoChannel,
      externalref: rewardTxRef,
      reference: "CareerOS referral reward",
    });

    await prisma.referral.update({
      where: { id: referral.id },
      data: transfer.ok
        ? { rewardStatus: "paid", rewardPaidAt: new Date() }
        : { rewardStatus: "failed" },
    });

    if (!transfer.ok) {
      console.error(`Referral reward transfer failed: ref=${rewardTxRef} code=${transfer.code}`);
    }

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: referral.referrerId,
      event: transfer.ok ? "referral_reward_paid" : "referral_reward_failed",
      properties: {
        amount_ghs: amount,
        referral_id: referral.id,
        moolre_code: transfer.code,
      },
    });
  } catch (error) {
    console.error("processReferralReward error:", error);
  }
}

// Retry payouts that were recorded but couldn't be paid at conversion time
// (no wallet on file, or a failed transfer). Called when a referrer saves
// a MoMo number, so earned rewards land as soon as a wallet exists.
export async function retryUnpaidRewards(referrerId: string): Promise<number> {
  const referrer = await prisma.user.findUnique({
    where: { id: referrerId },
    select: { momoNumber: true, momoChannel: true },
  });
  if (!referrer?.momoNumber || !referrer.momoChannel || !isMoolreConfigured()) return 0;

  const unpaid = await prisma.referral.findMany({
    where: { referrerId, rewardStatus: { in: ["unpayable", "failed"] } },
  });

  let paid = 0;
  for (const referral of unpaid) {
    const rewardTxRef = referral.rewardTxRef || `rw-${referral.id}`;
    const amount = String(referral.rewardAmount ?? getReferralRewardAmount());

    const claimed = await prisma.referral.updateMany({
      where: { id: referral.id, rewardStatus: { in: ["unpayable", "failed"] } },
      data: { rewardStatus: "processing", rewardTxRef },
    });
    if (claimed.count === 0) continue;

    try {
      const transfer = await initiateTransfer({
        amount,
        receiver: referrer.momoNumber,
        channel: referrer.momoChannel,
        externalref: `${rewardTxRef}-r${Date.now()}`,
        reference: "CareerOS referral reward",
      });

      await prisma.referral.update({
        where: { id: referral.id },
        data: transfer.ok
          ? { rewardStatus: "paid", rewardPaidAt: new Date() }
          : { rewardStatus: "failed" },
      });
      if (transfer.ok) paid++;
    } catch (error) {
      console.error(`Reward retry failed for referral ${referral.id}:`, error);
      await prisma.referral.update({
        where: { id: referral.id },
        data: { rewardStatus: "failed" },
      });
    }
  }
  return paid;
}
