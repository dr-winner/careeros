import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { getDbUser } from "@/lib/auth";
import { getZodErrorMessage, referralInviteSchema } from "@/lib/validation";

const resend = new Resend(process.env.RESEND_API_KEY);

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://careeros.app").replace(
    /\/+$/,
    "",
  );
}

function buildReferralCode(userId: string): string {
  return `CAREER-${userId
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-10)
    .toUpperCase()}`;
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

    const referralCount = await prisma.referral.count({
      where: {
        referrerId: user.id,
      },
    });

    return NextResponse.json({
      referralCode,
      referralUrl,
      referralCount,
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

    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: "CareerOS <noreply@careeros.app>",
        to: refereeEmail,
        subject: "You're invited to join CareerOS",
        html: `
          <h1>You've been invited!</h1>
          <p>${user.fullName || "Someone"} has invited you to join CareerOS, the AI-powered career platform for African job seekers.</p>
          <p>Sign up with this link and you'll both get priority access!</p>
          <a href="${referralUrl}">Join CareerOS</a>
        `,
      });
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
