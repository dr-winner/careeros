import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { initiateMomoPayment, isValidMomoChannel } from "@/lib/moolre";
import { getZodErrorMessage } from "@/lib/validation";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from "@/lib/ratelimit";

// Direct MoMo checkout: Moolre pushes a USSD approval prompt to the payer's
// phone — no browser redirect, works alongside the hosted payment link.
// Uses the same externalref format as create-link so the existing Moolre
// webhook and /api/payment/verify flow confirm and activate the plan.

const AMOUNTS: Record<string, string> = {
  monthly: process.env.MOOLRE_MONTHLY_AMOUNT || "25",
  annual:  process.env.MOOLRE_ANNUAL_AMOUNT  || "199",
};

const PLAN_CODE: Record<string, string> = {
  monthly: "m",
  annual:  "a",
};

const momoChargeSchema = z.object({
  plan: z.enum(["monthly", "annual"]).default("monthly"),
  phone: z.string().trim().regex(/^0\d{9}$/, "Enter a valid MoMo number, e.g. 0241234567"),
  channel: z.number().int(),
  otpcode: z.string().trim().optional(),
  // The externalref from the request that triggered OTP verification —
  // the OTP resubmission must reuse it, or Moolre treats the call as a
  // fresh payment and sends another OTP (infinite verification loop).
  ref: z.string().trim().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Per-user limit: each call pushes a USSD prompt to an arbitrary phone
    // number, so unthrottled access is a harassment vector. Fail-closed:
    // if the limiter is down, this endpoint must not run unmetered.
    const rateLimitResult = await checkRateLimit("payment", RATE_LIMITS.payment, clerkId, { failClosed: true });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many payment attempts. Please wait a minute and try again." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
      );
    }

    const parsed = momoChargeSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const { plan, phone, channel, otpcode, ref } = parsed.data;
    if (!isValidMomoChannel(channel)) {
      return NextResponse.json({ error: "Select a valid mobile money network" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, isPremium: true, subscriptionStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isPremium && (user.subscriptionStatus === "active" || !user.subscriptionStatus)) {
      return NextResponse.json({ error: "Already premium" }, { status: 400 });
    }

    // Reuse the ref from the OTP-triggering request when resubmitting
    // with a code; ownership-checked so nobody can replay another user's
    // reference. Otherwise mint a fresh one.
    const refPrefix = `co-${user.id}-${PLAN_CODE[plan]}-`;
    const externalref =
      otpcode && ref && ref.startsWith(refPrefix)
        ? ref
        : `${refPrefix}${Date.now()}`;

    const result = await initiateMomoPayment({
      payer: phone,
      channel,
      amount: AMOUNTS[plan],
      externalref,
      reference: `CareerOS ${plan} plan`,
      otpcode,
    });

    if (result.otpRequired) {
      return NextResponse.json({
        otpRequired: true,
        ref: externalref,
        message: result.message || "Enter the verification code sent to your phone via SMS.",
      });
    }

    if (!result.ok) {
      console.error(`MoMo charge failed: code=${result.code} ref=${externalref}`);
      return NextResponse.json(
        { error: result.message || "Could not start the MoMo payment. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      ref: externalref,
      message: "Approve the payment prompt on your phone, then tap Confirm below.",
    });
  } catch (error) {
    console.error("MoMo charge error:", error);
    return NextResponse.json({ error: "Payment setup failed" }, { status: 500 });
  }
}
