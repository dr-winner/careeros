import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseExternalRef, activateSubscription } from "@/lib/subscription";
import { getPostHogClient } from "@/lib/posthog-server";

const MOOLRE_BASE =
  process.env.MOOLRE_SANDBOX === "true"
    ? "https://sandbox.moolre.com"
    : "https://api.moolre.com";

// Expected GHS per plan — activation asserts the paid amount matches,
// so a verified-but-underpaid transaction can never grant a plan.
function expectedAmount(billingCycle: "monthly" | "annual" | "lifetime"): number | null {
  if (billingCycle === "monthly") return parseFloat(process.env.MOOLRE_MONTHLY_AMOUNT || "25");
  if (billingCycle === "annual") return parseFloat(process.env.MOOLRE_ANNUAL_AMOUNT || "199");
  return null; // legacy lifetime refs predate amount encoding — status check only
}

async function verifyTransaction(
  externalref: string,
  billingCycle: "monthly" | "annual" | "lifetime",
): Promise<boolean> {
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
    if (txstatus !== 1) return false;

    const expected = expectedAmount(billingCycle);
    if (expected !== null) {
      const paid = parseFloat(data?.data?.amount ?? data?.data?.value ?? "0");
      if (!(paid >= expected)) {
        console.error(
          `Moolre verify: amount mismatch for ref=${externalref} — paid ${paid}, expected ${expected}`,
        );
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error("Moolre verify error:", err);
    return false;
  }
}

// Trust model: Moolre does not sign webhooks (no HMAC/signature in their
// spec), so this endpoint treats every payload as untrusted input. The
// ONLY thing that activates a subscription is our own server-to-server
// verifyTransaction call against Moolre's status API — a forged webhook
// can at most trigger a lookup that finds nothing.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, data } = body;

    // P01 is the documented payment-received code; SS01 (status-lookup
    // success) is kept for compatibility with observed payloads.
    if (code !== "P01" && code !== "SS01") {
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

    const verified = await verifyTransaction(externalref, billingCycle);
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
