import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

const MOOLRE_BASE =
  process.env.MOOLRE_SANDBOX === "true"
    ? "https://sandbox.moolre.com"
    : "https://api.moolre.com";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://careeros.live").replace(/\/+$/, "");

// Plan amounts in GHS
const AMOUNTS: Record<string, string> = {
  monthly: process.env.MOOLRE_MONTHLY_AMOUNT || "25",
  annual:  process.env.MOOLRE_ANNUAL_AMOUNT  || "199",
};

// Encoded in externalref as single char: m=monthly, a=annual
const PLAN_CODE: Record<string, string> = {
  monthly: "m",
  annual:  "a",
};

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const plan: "monthly" | "annual" = body.plan === "annual" ? "annual" : "monthly";

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, email: true, fullName: true, isPremium: true, subscriptionStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Block if already on an active or lifetime plan
    if (user.isPremium && (user.subscriptionStatus === "active" || !user.subscriptionStatus)) {
      return NextResponse.json({ error: "Already premium" }, { status: 400 });
    }

    // Format: co-{userId}-{planCode}-{timestamp}
    // userId is a cuid (no hyphens), so split("-") is unambiguous
    const externalref = `co-${user.id}-${PLAN_CODE[plan]}-${Date.now()}`;

    const res = await fetch(`${MOOLRE_BASE}/embed/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-USER": process.env.MOOLRE_API_USER!,
        "X-API-PUBKEY": process.env.MOOLRE_API_PUBKEY!,
      },
      body: JSON.stringify({
        type: 1,
        amount: AMOUNTS[plan],
        email: user.email,
        externalref,
        callback: `${APP_URL}/api/webhooks/moolre`,
        redirect: `${APP_URL}/pricing?success=true&ref=${encodeURIComponent(externalref)}`,
        reusable: 0,
        currency: "GHS",
        accountnumber: process.env.MOOLRE_ACCOUNT_NUMBER,
        metadata: { userId: user.id, plan },
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

    const paymentUrl = data.data?.url || data.url || data.data?.link || data.link;
    if (!paymentUrl) {
      console.error("Moolre returned POS09 but no URL:", JSON.stringify(data));
      return NextResponse.json(
        { error: "Payment URL not returned. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: paymentUrl, plan, amount: AMOUNTS[plan] });
  } catch (error) {
    console.error("Payment create-link error:", error);
    return NextResponse.json({ error: "Payment setup failed" }, { status: 500 });
  }
}
