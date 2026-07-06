import { sendSms, isMoolreSmsConfigured } from "@/lib/moolre";

// Transactional SMS for the moments that matter most in the Ghanaian
// context: money in, money out, premium on. SMS lands where email often
// doesn't — but credits cost money, so only high-signal events send.
// All fire-and-forget safe: failures log and never break the caller.

function canSms(phone: string | null | undefined): phone is string {
  return Boolean(phone && /^0\d{9}$/.test(phone) && isMoolreSmsConfigured());
}

export async function smsPremiumActivated(phone: string | null | undefined): Promise<void> {
  if (!canSms(phone)) return;
  try {
    await sendSms([
      {
        recipient: phone,
        message:
          "CareerOS: Premium is ACTIVE. Unlimited analyses, AI cover letters, interview prep - all unlocked. Go land that job: careeros.live",
        ref: `prem-${Date.now()}`,
      },
    ]);
  } catch (err) {
    console.error("Premium SMS failed:", err);
  }
}

export async function smsRewardCredited(
  phone: string | null | undefined,
  amountGhs: number,
  balanceGhs: number,
): Promise<void> {
  if (!canSms(phone)) return;
  try {
    await sendSms([
      {
        recipient: phone,
        message: `CareerOS: GHS ${amountGhs.toFixed(0)} earned! Your referral went Premium. Balance: GHS ${balanceGhs.toFixed(2)} - withdraw to MoMo anytime: careeros.live/referrals`,
        ref: `rwd-${Date.now()}`,
      },
    ]);
  } catch (err) {
    console.error("Reward SMS failed:", err);
  }
}
