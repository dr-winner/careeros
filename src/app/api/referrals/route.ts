import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getDbUser } from "@/lib/auth";
import { getZodErrorMessage, referralInviteSchema } from "@/lib/validation";
import { sendReferralReceivedEmail } from "@/lib/transactional-emails";
import { getEmailFrom } from "@/lib/env";
import { buildReferralCode } from "@/lib/referral-code";
import { finalizeProcessingWithdrawals, MIN_WITHDRAWAL_GHS } from "@/lib/referral-reward";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://careeros.live";

function getBaseUrl(): string {
  return APP_URL.replace(/\/+$/, "");
}

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getDbUser();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const referralCode = buildReferralCode(user.id);
    const referralUrl = `${getBaseUrl()}/?ref=${encodeURIComponent(referralCode)}`;

    // Settle any in-flight withdrawals before reporting balances.
    await finalizeProcessingWithdrawals(user.id).catch(() => {});

    const [referralCount, convertedCount, lifetime, withdrawn, freshUser, referralRows] = await Promise.all([
      prisma.referral.count({
        where: { referrerId: user.id },
      }),
      prisma.referral.count({
        where: { referrerId: user.id, status: "converted" },
      }),
      // Everything ever credited (old direct-paid rewards included)
      prisma.referral.aggregate({
        where: { referrerId: user.id, rewardStatus: { in: ["credited", "paid"] } },
        _sum: { rewardAmount: true },
      }),
      prisma.withdrawal.aggregate({
        where: { userId: user.id, status: "paid" },
        _sum: { amount: true },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { earningsBalance: true },
      }),
      prisma.referral.findMany({
        where: { referrerId: user.id },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          refereeEmail: true,
          status: true,
          rewardAmount: true,
          createdAt: true,
          convertedAt: true,
        },
      }),
    ]);

    // Mask referee emails — link-attributed referees never shared their
    // address with the referrer directly.
    const maskEmail = (email: string) => {
      const [local, domain] = email.split("@");
      if (!domain) return "•••";
      const visible = local.slice(0, 2);
      return `${visible}${"•".repeat(Math.max(2, Math.min(6, local.length - 2)))}@${domain}`;
    };

    const referrals = referralRows.map((r) => ({
      id: r.id,
      email: maskEmail(r.refereeEmail),
      status: r.status, // "pending" | "engaged" | "converted"
      rewardGhs: r.status === "converted" ? (r.rewardAmount ?? 0) : 0,
      createdAt: r.createdAt,
      convertedAt: r.convertedAt,
    }));

    return NextResponse.json({
      referralCode,
      referralUrl,
      referralCount,
      convertedCount,
      balanceGhs: freshUser?.earningsBalance ?? 0,
      lifetimeGhs: lifetime._sum.rewardAmount ?? 0,
      withdrawnGhs: withdrawn._sum.amount ?? 0,
      minWithdrawalGhs: MIN_WITHDRAWAL_GHS,
      hasPayoutWallet: Boolean(user.momoNumber && user.momoChannel),
      referrals,
    });
  } catch (error) {
    console.error("Error getting referral:", error);
    return NextResponse.json(
      { error: "Failed to get referral info" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedBody = referralInviteSchema.safeParse(await request.json());

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(parsedBody.error) },
        { status: 400 },
      );
    }

    const { refereeEmail } = parsedBody.data;
    const user = await getDbUser();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.email.toLowerCase() === refereeEmail) {
      return NextResponse.json(
        { error: "You cannot send a referral to your own email address" },
        { status: 400 },
      );
    }

    const referralCode = buildReferralCode(user.id);
    const referralUrl = `${getBaseUrl()}/?ref=${encodeURIComponent(referralCode)}`;

    const existingReferral = await prisma.referral.findFirst({
      where: {
        referrerId: user.id,
        refereeEmail,
      },
    });

    if (existingReferral) {
      return NextResponse.json(
        {
          success: true,
          alreadyInvited: true,
          referralCode,
          referralUrl,
        },
        { status: 200 },
      );
    }

    await prisma.referral.create({
      data: {
        referrerId: user.id,
        refereeEmail,
        referralCode,
      },
    });

    const { Resend } = await import("resend");
    const resendApiKey = (await import("@/lib/env")).readEnv("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    if (resend) {
      await resend.emails.send({
        from: getEmailFrom(),
        to: refereeEmail,
        subject: `${user.fullName?.split(" ")[0] || "Someone"} thinks you'd be great at this`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 32px 20px; }
              .card { background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.05)); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 16px; padding: 32px; margin-bottom: 24px; }
              .greeting { color: #fafafa; font-size: 20px; margin: 0 0 16px; }
              .body-text { color: #d1d5db; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
              .highlight { color: #a78bfa; font-weight: 500; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 8px 0; }
              .footer { text-align: center; padding: 24px 0; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 24px; }
              .footer-text { color: #6b7280; font-size: 12px; margin: 8px 0; }
            </style>
          </head>
          <body style="margin:0;padding:0;background-color:#0a0a0f;">
            <div style="background-color:#0a0a0f;color:#e5e7eb;padding:12px 0;">
            <div class="container">
              <div class="card">
                <p class="greeting">Hey there 👋</p>
                
                <p class="body-text">
                  ${user.fullName?.split(" ")[0] || "Someone"} thinks you'd be great for this. And since they know you, they're probably right.
                </p>
                
                <p class="body-text">
                  CareerOS helps you understand how well you fit a job <span class="highlight">before</span> you apply. No more guessing. No more wasting hours on roles you had no chance at anyway.
                </p>
                
                <p class="body-text">
                  It's free to get started. And honestly? It's pretty useful.
                </p>

                <a href="${referralUrl}" class="cta-button">Check it out →</a>
              </div>

              <div class="footer">
                <p class="footer-text">
                  Sent by ${user.fullName || "your friend"} via CareerOS
                </p>
              </div>
            </div>
          </div>
          </body>
          </html>
        `,
      });

      await sendReferralReceivedEmail(user.email, user.fullName, refereeEmail);
    }

    return NextResponse.json({
      success: true,
      referralCode,
      referralUrl,
    });
  } catch (error) {
    console.error("Error sending referral:", error);
    return NextResponse.json(
      { error: "Failed to send referral" },
      { status: 500 },
    );
  }
}
