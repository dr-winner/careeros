import { NextRequest, NextResponse } from "next/server";
import { isValidCronSecret } from "@/lib/validation";
import { sendReEngagementEmail, sendWeeklyDigestEmail } from "@/lib/transactional-emails";
import { prisma } from "@/lib/db";

const RE_ENGAGEMENT_DAYS = 7;
const DIGEST_DAY_OF_WEEK = 0; // Sunday
const RE_ENGAGEMENT_DAY = 3; // Wednesday
const BATCH_SIZE = 100;

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
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const emailsSent: { reEngagement: number; digest: number } = { reEngagement: 0, digest: 0 };

    let cursor: string | undefined;

    while (true) {
      const users = await prisma.user.findMany({
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: {
          id: true,
          email: true,
          fullName: true,
          updatedAt: true,
          applications: {
            select: { id: true, status: true },
          },
          savedJobs: {
            where: { savedAt: { gte: oneWeekAgo } },
            select: { id: true },
          },
        },
        orderBy: { id: "asc" },
      });

      if (users.length === 0) break;
      cursor = users[users.length - 1].id;

      for (const user of users) {
        if (!user.email) continue;

        const totalApplications = user.applications.length;
        const activeApplications = user.applications.filter(
          (a) => !["Rejected", "Withdrawn"].includes(a.status),
        ).length;
        const hasAnyActivity = totalApplications > 0 || user.savedJobs.length > 0;

        const daysSinceActive = Math.floor(
          (now.getTime() - user.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysSinceActive >= RE_ENGAGEMENT_DAYS && dayOfWeek === RE_ENGAGEMENT_DAY && hasAnyActivity) {
          await sendReEngagementEmail(user.email, user.fullName, daysSinceActive);
          emailsSent.reEngagement++;
        }

        // Only send digest to users with actual activity — avoids spamming empty accounts
        if (dayOfWeek === DIGEST_DAY_OF_WEEK && hasAnyActivity) {
          const newJobsMatched = user.savedJobs.length;

          await sendWeeklyDigestEmail(user.email, user.fullName, {
            totalApplications,
            activeApplications,
            newJobsMatched,
          });
          emailsSent.digest++;
        }
      }

      if (users.length < BATCH_SIZE) break;
    }

    return NextResponse.json({ success: true, timestamp: now.toISOString(), emailsSent });
  } catch (error) {
    console.error("User engagement cron error:", error);
    return NextResponse.json({ error: "Failed to send engagement emails" }, { status: 500 });
  }
}
