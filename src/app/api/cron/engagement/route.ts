import { NextRequest, NextResponse } from "next/server";
import { isValidCronSecret } from "@/lib/validation";
import { sendReEngagementEmail, sendWeeklyDigestEmail } from "@/lib/transactional-emails";
import { prisma } from "@/lib/db";

const RE_ENGAGEMENT_DAYS = 7;
const DIGEST_DAY_OF_WEEK = 0;

function getDayOfWeek(): number {
  return new Date().getDay();
}

export async function GET(request: NextRequest) {
  try {
    if (!isValidCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const dayOfWeek = getDayOfWeek();
    const emailsSent: { reEngagement: number; digest: number } = { reEngagement: 0, digest: 0 };

    const users = await prisma.user.findMany({
      where: {},
      select: {
        id: true,
        email: true,
        fullName: true,
        updatedAt: true,
        applications: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    for (const user of users) {
      if (!user.email) continue;

      const daysSinceActive = Math.floor(
        (now.getTime() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const totalApplications = user.applications.length;
      const activeApplications = user.applications.filter(
        (a) => !["Rejected", "Withdrawn"].includes(a.status)
      ).length;

      if (daysSinceActive >= RE_ENGAGEMENT_DAYS && dayOfWeek === 3) {
        await sendReEngagementEmail(user.email, user.fullName, daysSinceActive);
        emailsSent.reEngagement++;
      }

      if (dayOfWeek === DIGEST_DAY_OF_WEEK) {
        const newJobsMatched = Math.floor(Math.random() * 3);
        
        await sendWeeklyDigestEmail(user.email, user.fullName, {
          totalApplications,
          activeApplications,
          newJobsMatched,
        });
        emailsSent.digest++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      emailsSent,
    });
  } catch (error) {
    console.error("User engagement cron error:", error);
    return NextResponse.json(
      { error: "Failed to send engagement emails" },
      { status: 500 }
    );
  }
}
