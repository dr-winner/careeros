import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import {
  parseExternalRef,
  activateSubscription,
  expectedPlanAmount,
} from "@/lib/subscription";
import { verifyCollectionPayment } from "@/lib/moolre";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/ratelimit";

// Backstop for the webhook: the success page calls this with the
// externalref from the redirect so a paying user gets Premium even when
// the webhook is late or Moolre never delivers it.
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Polled by the success page; keep it bounded but generous.
    const rl = await checkRateLimit("payment-verify", { max: 30, window: "1 m" }, clerkId);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please wait a moment." },
        { status: 429, headers: getRateLimitHeaders(rl) },
      );
    }

    const { ref } = await request.json();
    if (typeof ref !== "string" || !ref.startsWith("co-")) {
      return NextResponse.json({ error: "Invalid payment reference" }, { status: 400 });
    }

    const { userId: refUserId, billingCycle } = parseExternalRef(ref);

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, isPremium: true, subscriptionStatus: true, billingCycle: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure the ref belongs to this user
    if (refUserId !== user.id) {
      return NextResponse.json(
        { error: "Payment reference does not match account" },
        { status: 403 },
      );
    }

    // Lifetime supporters must never be downgraded to a period plan by
    // re-verifying an old or accidental payment.
    if (user.isPremium && user.subscriptionStatus === "lifetime") {
      return NextResponse.json({ isPremium: true, message: "You already have lifetime Premium" });
    }

    // Already active on the same plan: idempotent success (webhook won).
    if (user.isPremium && user.subscriptionStatus === "active" && user.billingCycle === billingCycle) {
      return NextResponse.json({ isPremium: true, message: "Premium is already active" });
    }

    const verification = await verifyCollectionPayment(ref, expectedPlanAmount(billingCycle));

    if (!verification.ok) {
      if (verification.reason === "pending") {
        return NextResponse.json({
          isPremium: false,
          pending: true,
          message: "Moolre is still confirming your payment. This usually takes under a minute.",
        });
      }
      if (verification.reason === "underpaid") {
        return NextResponse.json(
          { error: "The amount paid does not cover the selected plan. Please contact support@careeros.live with your payment reference." },
          { status: 400 },
        );
      }
      if (verification.reason === "failed") {
        return NextResponse.json({
          isPremium: false,
          pending: false,
          message: "Moolre reports this payment did not complete. If money left your wallet, email support@careeros.live with this reference.",
        });
      }
      return NextResponse.json(
        { error: "We couldn't reach Moolre to confirm the payment. Please try again in a moment." },
        { status: 503 },
      );
    }

    await activateSubscription(user.id, billingCycle);

    console.log(`Moolre: subscription verified via success page — user ${user.id} plan=${billingCycle} ref=${ref}`);

    return NextResponse.json({ isPremium: true, message: "Premium activated" });
  } catch (error) {
    console.error("Payment verify error:", error);
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 });
  }
}
