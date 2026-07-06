import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { parseExternalRef, activateSubscription } from "@/lib/subscription";

const MOOLRE_BASE =
  process.env.MOOLRE_SANDBOX === "true"
    ? "https://sandbox.moolre.com"
    : "https://api.moolre.com";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ref } = await request.json();
    if (!ref || !ref.startsWith("co-")) {
      return NextResponse.json({ error: "Invalid payment reference" }, { status: 400 });
    }

    const { userId: refUserId, billingCycle } = parseExternalRef(ref as string);

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, isPremium: true, subscriptionStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isPremium && user.subscriptionStatus === "active") {
      return NextResponse.json({ isPremium: true, message: "Already premium" });
    }

    // Ensure the ref belongs to this user
    if (refUserId !== user.id) {
      return NextResponse.json(
        { error: "Payment reference does not match account" },
        { status: 403 },
      );
    }

    // Verify transaction with Moolre
    const res = await fetch(`${MOOLRE_BASE}/open/transact/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-USER": process.env.MOOLRE_API_USER!,
        "X-API-KEY": process.env.MOOLRE_API_KEY!,
      },
      body: JSON.stringify({
        type: 1,
        idtype: 1,
        id: ref,
        accountnumber: process.env.MOOLRE_ACCOUNT_NUMBER,
      }),
    });

    const data = await res.json();
    const txstatus = data?.data?.txstatus ?? data?.txstatus;

    if (txstatus !== 1) {
      return NextResponse.json({
        isPremium: false,
        message: "Payment not yet confirmed by Moolre. Please wait a moment and try again.",
      });
    }

    // Defense-in-depth: the verified transaction must cover the plan price
    // (legacy lifetime refs predate amount encoding — status check only).
    const expected =
      billingCycle === "monthly"
        ? parseFloat(process.env.MOOLRE_MONTHLY_AMOUNT || "25")
        : billingCycle === "annual"
          ? parseFloat(process.env.MOOLRE_ANNUAL_AMOUNT || "199")
          : null;
    if (expected !== null) {
      const paid = parseFloat(data?.data?.amount ?? data?.data?.value ?? "0");
      if (!(paid >= expected)) {
        console.error(`Payment verify: amount mismatch ref=${ref} paid=${paid} expected=${expected}`);
        return NextResponse.json(
          { error: "Payment amount does not match the selected plan." },
          { status: 400 },
        );
      }
    }

    await activateSubscription(user.id, billingCycle);

    console.log(`Moolre: subscription manually verified — user ${user.id} plan=${billingCycle} ref=${ref}`);

    return NextResponse.json({ isPremium: true, message: "Premium activated successfully" });
  } catch (error) {
    console.error("Payment verify error:", error);
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 });
  }
}
