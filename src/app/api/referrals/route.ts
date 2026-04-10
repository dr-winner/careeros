import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    const referralCode = user?.email.split("@")[0].toUpperCase().substring(0, 8) || "DEFAULT";
    
    const existing = await prisma.waitlistReferral.findUnique({
      where: { referralCode },
    });
    
    if (!existing) {
      await prisma.waitlistReferral.create({
        data: { referralCode },
      });
    }

    const referralCount = await prisma.referral.count({
      where: { referrerId: user?.id || "" },
    });

    return NextResponse.json({
      referralCode,
      referralUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://careeros.app"}/?ref=${referralCode}`,
      referralCount,
    });
  } catch (error) {
    console.error("Error getting referral:", error);
    return NextResponse.json({ error: "Failed to get referral info" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { refereeEmail } = await request.json();

    if (!refereeEmail) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const referralCode = user.email.split("@")[0].toUpperCase().substring(0, 8);

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
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://careeros.app"}?ref=${referralCode}">Join CareerOS</a>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending referral:", error);
    return NextResponse.json({ error: "Failed to send referral" }, { status: 500 });
  }
}
