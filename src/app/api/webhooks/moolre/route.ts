import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseExternalRef, activateSubscription } from "@/lib/subscription";
import { getPostHogClient } from "@/lib/posthog-server";

const MOOLRE_BASE =
  process.env.MOOLRE_SANDBOX === "true"
    ? "https://sandbox.moolre.com"
    : "https://api.moolre.com";

async function verifyTransaction(externalref: string): Promise<boolean> {
  try {
    const res = await fetch(`${MOOLRE_BASE}/open/transact/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-USER": process.env.MOOLRE_API_USER!,
        "X-API-KEY": process.env.MOOLRE_API_KEY!,
      },
      body: JSON.stringify({
        type: 1,
        idtype: 1, // look up by externalref
        id: externalref,
        accountnumber: process.env.MOOLRE_ACCOUNT_NUMBER,
      }),
    });
    const data = await res.json();
    // txstatus: 0=Pending, 1=Success, 2=Failed
    const txstatus = data?.data?.txstatus ?? data?.txstatus;
    return txstatus === 1;
  } catch (err) {
    console.error("Moolre verify error:", err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, data } = body;

    // Only process successful payment notifications
    if (code !== "SS01") {
      return NextResponse.json({ received: true });
    }

    const externalref: string | undefined = data?.externalref;
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
      select: { isPremium: true, subscriptionStatus: true },
    });

    if (!existing) {
      console.error("Moolre webhook: user not found:", userId);
      return NextResponse.json({ received: true });
    }

    // Idempotent: already on active lifetime plan, skip
    if (existing.subscriptionStatus === "lifetime") {
      return NextResponse.json({ received: true });
    }

    const verified = await verifyTransaction(externalref);
    if (!verified) {
      console.error(`Moolre webhook: transaction verification failed for ref=${externalref}. Aborting subscription activation.`);
      return NextResponse.json({ error: "Transaction verification failed" }, { status: 400 });
    }

    await activateSubscription(userId, billingCycle);

    const logSuffix = `user ${userId} plan=${billingCycle} ref=${externalref}`;
    console.log(`Moolre: subscription activated (verified) — ${logSuffix}`);

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: userId,
      event: "subscription_activated",
      properties: {
        billing_cycle: billingCycle,
        verified,
        source: "webhook",
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Moolre webhook error:", error);
    // Always 200 so Moolre doesn't retry forever
    return NextResponse.json({ received: true });
  }
}
