import { prisma } from "@/lib/db";
import { getTransactionStatus, initiateTransfer, isMoolreConfigured } from "@/lib/moolre";
import { readEnv } from "@/lib/env";
import { getPostHogClient } from "@/lib/posthog-server";

// Initiate a payout and confirm settlement. Transfers settle async
// (txstatus 0 on initiation), so poll status once; if still pending the
// reward stays "processing" and finalizeProcessingRewards resolves it.
async function executeRewardTransfer(params: {
  amount: string;
  receiver: string;
  channel: number;
  externalref: string;
}): Promise<"paid" | "processing" | "failed"> {
  const transfer = await initiateTransfer({ ...params, reference: "CareerOS referral reward" });
  if (!transfer.initiated) {
    console.error(`Referral reward initiation failed: ref=${params.externalref} code=${transfer.code}`);
    return "failed";
  }
  if (transfer.settled) return "paid";

  const status = await getTransactionStatus(params.externalref).catch(() => ({ txstatus: null }));
  if (status.txstatus === 1) return "paid";
  if (status.txstatus === 2) return "failed";
  return "processing";
}

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

    const outcome = await executeRewardTransfer({
      amount,
      receiver: momoNumber,
      channel: momoChannel,
      externalref: rewardTxRef,
    });

    await prisma.referral.update({
      where: { id: referral.id },
      data:
        outcome === "paid"
          ? { rewardStatus: "paid", rewardPaidAt: new Date() }
          : { rewardStatus: outcome },
    });

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: referral.referrerId,
      event: outcome === "failed" ? "referral_reward_failed" : "referral_reward_paid",
      properties: {
        amount_ghs: amount,
        referral_id: referral.id,
        outcome,
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
    // Fresh ref per attempt (Moolre rejects duplicate externalrefs), stored
    // so finalizeProcessingRewards can look up this exact transfer later.
    const retryRef = `rw-${referral.id}-r${Date.now()}`;
    const amount = String(referral.rewardAmount ?? getReferralRewardAmount());

    const claimed = await prisma.referral.updateMany({
      where: { id: referral.id, rewardStatus: { in: ["unpayable", "failed"] } },
      data: { rewardStatus: "processing", rewardTxRef: retryRef },
    });
    if (claimed.count === 0) continue;

    try {
      const outcome = await executeRewardTransfer({
        amount,
        receiver: referrer.momoNumber,
        channel: referrer.momoChannel,
        externalref: retryRef,
      });

      await prisma.referral.update({
        where: { id: referral.id },
        data:
          outcome === "paid"
            ? { rewardStatus: "paid", rewardPaidAt: new Date() }
            : { rewardStatus: outcome },
      });
      if (outcome === "paid") paid++;
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

// Resolve rewards stuck in "processing" by checking the transfer's final
// status with Moolre. Called when the referrer views their referrals, so
// pending payouts settle into paid/failed without a dedicated cron.
export async function finalizeProcessingRewards(referrerId: string): Promise<void> {
  if (!isMoolreConfigured()) return;

  const processing = await prisma.referral.findMany({
    where: { referrerId, rewardStatus: "processing", rewardTxRef: { not: null } },
    select: { id: true, rewardTxRef: true },
  });

  for (const referral of processing) {
    try {
      const status = await getTransactionStatus(referral.rewardTxRef!);
      if (status.txstatus === 1) {
        await prisma.referral.update({
          where: { id: referral.id },
          data: { rewardStatus: "paid", rewardPaidAt: new Date() },
        });
      } else if (status.txstatus === 2) {
        await prisma.referral.update({
          where: { id: referral.id },
          data: { rewardStatus: "failed" },
        });
      }
      // txstatus 0 or null: still in flight — leave for the next check.
    } catch (error) {
      console.error(`Finalize reward check failed for referral ${referral.id}:`, error);
    }
  }
}
