import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

const MOOLRE_BASE =
  process.env.MOOLRE_SANDBOX === "true"
    ? "https://sandbox.moolre.com"
    : "https://api.moolre.com";

const PREMIUM_AMOUNT = process.env.MOOLRE_PREMIUM_AMOUNT || "99";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.careeros.live";

export async function POST() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, email: true, fullName: true, isPremium: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isPremium) {
      return NextResponse.json({ error: "Already premium" }, { status: 400 });
    }

    // externalref encodes the DB user ID so the webhook can look it up.
    // Format: "co-{dbUserId}-{timestamp}" — dbUserId is a cuid (no hyphens).
    const externalref = `co-${user.id}-${Date.now()}`;

    const res = await fetch(`${MOOLRE_BASE}/embed/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-USER": process.env.MOOLRE_API_USER!,
        "X-API-PUBKEY": process.env.MOOLRE_API_PUBKEY!,
      },
      body: JSON.stringify({
        type: 1,
        amount: PREMIUM_AMOUNT,
        email: user.email,
        externalref,
        callback: `${APP_URL}/api/webhooks/moolre`,
        redirect: `${APP_URL}/pricing?success=true`,
        reusable: 0,
        currency: "GHS",
        accountnumber: process.env.MOOLRE_ACCOUNT_NUMBER,
        metadata: { userId: user.id, plan: "premium" },
      }),
    });

    const data = await res.json();

    if (data.code !== "POS09") {
      console.error("Moolre create-link failed:", JSON.stringify(data));
      return NextResponse.json(
        { error: "Could not create payment link. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: data.data?.url || data.url });
  } catch (error) {
    console.error("Payment create-link error:", error);
    return NextResponse.json({ error: "Payment setup failed" }, { status: 500 });
  }
}
