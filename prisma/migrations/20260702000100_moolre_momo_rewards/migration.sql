-- Additive only: MoMo payout details on User, cash reward tracking on Referral.

ALTER TABLE "User" ADD COLUMN "momoNumber" TEXT;
ALTER TABLE "User" ADD COLUMN "momoChannel" INTEGER;
ALTER TABLE "User" ADD COLUMN "smsAlerts" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Referral" ADD COLUMN "rewardStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "Referral" ADD COLUMN "rewardAmount" DOUBLE PRECISION;
ALTER TABLE "Referral" ADD COLUMN "rewardTxRef" TEXT;
ALTER TABLE "Referral" ADD COLUMN "rewardPaidAt" TIMESTAMP(3);
ALTER TABLE "Referral" ADD COLUMN "convertedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Referral_rewardTxRef_key" ON "Referral"("rewardTxRef");
CREATE INDEX "Referral_refereeEmail_idx" ON "Referral"("refereeEmail");
