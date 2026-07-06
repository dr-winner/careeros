import { NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { requestWithdrawal } from "@/lib/referral-reward";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from "@/lib/ratelimit";

// Withdraw the user's full referral earnings balance to their verified
// MoMo wallet via Moolre Disbursements.
export async function POST() {
  try {
    const user = await getDbUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fail-closed: withdrawals move real money and must never run unmetered.
    const rateLimitResult = await checkRateLimit("payment", RATE_LIMITS.payment, user.id, { failClosed: true });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many withdrawal attempts. Please wait a minute." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
      );
    }

    const result = await requestWithdrawal(user.id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      amount: result.amount,
      status: result.status,
      message:
        result.status === "paid"
          ? `GHS ${result.amount} sent to your MoMo!`
          : `GHS ${result.amount} is on its way to your MoMo — it settles within a few minutes.`,
    });
  } catch (error) {
    console.error("Withdrawal route error:", error);
    return NextResponse.json({ error: "Withdrawal failed. Please try again." }, { status: 500 });
  }
}
