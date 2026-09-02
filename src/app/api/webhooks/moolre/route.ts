import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  parseExternalRef,
  activateSubscription,
  expectedPlanAmount,
} from "@/lib/subscription";
import { verifyCollectionPayment } from "@/lib/moolre";
import { getPostHogClient } from "@/lib/posthog-server";

// Trust model: Moolre does not sign webhooks (no HMAC/signature in their
// spec), so this endpoint treats every payload as untrusted input. The
// ONLY thing that activates a subscription is our own server-to-server
// verifyCollectionPayment call against Moolre's status API — a forged
// webhook can at most trigger a lookup that finds nothing.
//
// Response codes are deliberate:
//   200 — nothing to do (irrelevant event, unknown ref, already active,
//         payment genuinely pending/failed). Moolre must not retry.
//   500 — we could not complete activation for a payment that IS
//         verified (DB error, provider lookup error). Moolre retries, so
//         a paying user is never silently left on the free plan.
export async function POST(request: NextRequest) {
  let externalref: string | undefined;

  try {
    const body = await request.json();
    const { code, data } = body;

    // P01 is the documented payment-received code; SS01 (status-lookup
    // success) is kept for compatibility with observed payloads.
    if (code !== "P01" && code !== "SS01") {
      return NextResponse.json({ received: true });
    }

    externalref = data?.externalref;
    if (!externalref?.startsWith("co-")) {
      return NextResponse.json({ received: true });
    }

    const { userId, billingCycle } = parseExternalRef(externalref);
    if (!userId) {
      console.error("Moolre webhook: could not parse userId from ref:", externalref);
      return NextResponse.json({ received: true });
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true, subscriptionStatus: true, currentPeriodEnd: true },
    });

    if (!existing) {
      console.error("Moolre webhook: user not found:", userId);
      return NextResponse.json({ received: true });
    }

    // Lifetime supporters are never overwritten by a period plan.
    if (existing.subscriptionStatus === "lifetime") {
      return NextResponse.json({ received: true });
    }

    const verification = await verifyCollectionPayment(
      externalref,
      expectedPlanAmount(billingCycle),
    );

    if (!verification.ok) {
      if (verification.reason === "error") {
        // Couldn't reach/parse Moolre — ask them to redeliver.
        console.error(`Moolre webhook: status lookup error for ref=${externalref}, requesting retry`);
        return NextResponse.json({ error: "Verification unavailable" }, { status: 503 });
      }
      console.error(
        `Moolre webhook: not activating ref=${externalref} reason=${verification.reason} txstatus=${verification.txstatus} amount=${verification.amount}`,
      );
      return NextResponse.json({ received: true, activated: false, reason: verification.reason });
    }

    await activateSubscription(userId, billingCycle);

    console.log(`Moolre: subscription activated (verified) — user ${userId} plan=${billingCycle} ref=${externalref}`);

    try {
      getPostHogClient().capture({
        distinctId: userId,
        event: "subscription_activated",
        properties: { billing_cycle: billingCycle, verified: true, source: "webhook" },
      });
    } catch {
      // analytics must never affect the activation response
    }

    return NextResponse.json({ received: true, activated: true });
  } catch (error) {
    console.error("Moolre webhook error:", { externalref, error });
    // A 5xx here means "we may owe this user Premium" — Moolre retries,
    // and the manual /api/payment/verify path remains as a backstop.
    return NextResponse.json({ error: "Activation failed, retry" }, { status: 500 });
  }
}
