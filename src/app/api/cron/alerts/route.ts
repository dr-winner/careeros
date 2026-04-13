import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { isValidCronSecret } from "@/lib/validation";
import { readEnv } from "@/lib/env";
import type { Prisma } from "@prisma/client";

const resendApiKey = readEnv("RESEND_API_KEY");
const resend = resendApiKey ? new Resend(resendApiKey) : null;

type SearchWithUser = Awaited<
  ReturnType<typeof prisma.savedSearch.findMany>
>[number] & {
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
};

type MatchedJob = {
  id: string;
  title: string;
  companyName: string | null;
  location: string | null;
  workMode: string | null;
  applicationUrl: string | null;
  postedAt: Date | null;
};

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://careeros.app").replace(
    /\/+$/,
    "",
  );
}

function getNotificationCutoff(now: Date, frequency: string): Date {
  const intervalMs =
    frequency === "weekly" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  return new Date(now.getTime() - intervalMs);
}

function shouldNotify(
  lastNotified: Date | null,
  now: Date,
  frequency: string,
): boolean {
  if (!lastNotified) return true;
  return lastNotified < getNotificationCutoff(now, frequency);
}

function tokenizeSearchQuery(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 8);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildManageAlertsUrl(): string {
  return `${getBaseUrl()}/alerts`;
}

function buildJobUrl(job: MatchedJob): string {
  if (job.applicationUrl && job.applicationUrl.trim().length > 0) {
    return job.applicationUrl;
  }

  return `${getBaseUrl()}/jobs/${encodeURIComponent(job.id)}`;
}

function buildJobSearchClause(search: SearchWithUser): Prisma.JobWhereInput {
  const tokens = tokenizeSearchQuery(search.searchQuery);

  if (tokens.length > 0) {
    return {
      OR: tokens.map((token) => ({
        OR: [
          { title: { contains: token, mode: "insensitive" } },
          { companyName: { contains: token, mode: "insensitive" } },
          { description: { contains: token, mode: "insensitive" } },
          { requirementsText: { contains: token, mode: "insensitive" } },
        ],
      })),
    };
  }

  return {
    OR: [
      {
        title: {
          contains: search.searchQuery,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search.searchQuery,
          mode: "insensitive",
        },
      },
      {
        requirementsText: {
          contains: search.searchQuery,
          mode: "insensitive",
        },
      },
    ],
  };
}

async function findMatchesForSearch(
  search: SearchWithUser,
  now: Date,
): Promise<MatchedJob[]> {
  const cutoff =
    search.lastNotified ?? getNotificationCutoff(now, search.alertFrequency);

  const andClauses: Prisma.JobWhereInput[] = [
    {
      status: {
        not: "archived",
      },
    },
    buildJobSearchClause(search),
  ];

  const locationValue = search.location?.trim();
  if (locationValue) {
    andClauses.push({
      OR: [
        { location: { contains: locationValue, mode: "insensitive" } },
        { country: { contains: locationValue, mode: "insensitive" } },
      ],
    });
  }

  const workModeValue = search.workMode?.trim();
  if (workModeValue) {
    andClauses.push({
      workMode: {
        contains: workModeValue,
        mode: "insensitive",
      },
    });
  }

  const seniorityValue = search.seniority?.trim();
  if (seniorityValue) {
    andClauses.push({
      seniorityLevel: {
        contains: seniorityValue,
        mode: "insensitive",
      },
    });
  }

  const jobs = await prisma.job.findMany({
    where: {
      AND: andClauses,
    },
    select: {
      id: true,
      title: true,
      companyName: true,
      location: true,
      workMode: true,
      applicationUrl: true,
      postedAt: true,
    },
    orderBy: [{ postedAt: "desc" }, { id: "desc" }],
    take: 20,
  });

  return jobs.filter((job) => {
    if (!job.postedAt) return true;
    return job.postedAt > cutoff;
  });
}

function renderEmailHtml(search: SearchWithUser, jobs: MatchedJob[]): string {
  const jobList = jobs
    .slice(0, 5)
    .map((job) => {
      const title = escapeHtml(job.title);
      const company = escapeHtml(job.companyName || "Unknown Company");
      const location = escapeHtml(job.location || "Location not specified");
      const workMode = escapeHtml(job.workMode || "Not specified");
      const href = escapeHtml(buildJobUrl(job));

      return `
        <li style="margin-bottom: 12px; padding: 12px; background: #f9fafb; border-radius: 8px;">
          <strong style="color: #059669;">${title}</strong> at ${company}<br>
          <span style="color: #6b7280; font-size: 14px;">${location} • ${workMode}</span><br>
          <a href="${href}" style="color: #059669; font-size: 14px;">View Job →</a>
        </li>
      `;
    })
    .join("");

  const alertName = escapeHtml(search.name);
  const searchQuery = escapeHtml(search.searchQuery);
  const locationText = search.location
    ? ` in ${escapeHtml(search.location)}`
    : "";
  const manageAlertsUrl = escapeHtml(buildManageAlertsUrl());
  const greetingName = escapeHtml(search.user.fullName?.trim() || "there");

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #059669; margin: 0;">CareerOS</h1>
        <p style="color: #6b7280; margin: 8px 0 0;">New jobs matching your alert</p>
      </div>

      <p style="color: #111827;">Hi ${greetingName},</p>

      <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <strong style="color: #059669;">Alert:</strong> ${alertName}<br>
        <span style="color: #6b7280; font-size: 14px;">${searchQuery}${locationText}</span>
      </div>

      <h2 style="color: #1f2937; margin-bottom: 16px;">${jobs.length} new job${jobs.length > 1 ? "s" : ""} found</h2>

      <ul style="list-style: none; padding: 0; margin: 0;">
        ${jobList}
      </ul>

      <div style="margin-top: 24px; text-align: center;">
        <a href="${manageAlertsUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Manage Alerts
        </a>
      </div>

      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
        You're receiving this because you set up a job alert on CareerOS.
        <a href="${manageAlertsUrl}" style="color: #059669;">Manage preferences</a>
      </p>
    </div>
  `;
}

export async function GET(request: NextRequest) {
  try {
    if (!isValidCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!resend) {
      return NextResponse.json(
        { error: "Email delivery is not configured" },
        { status: 503 },
      );
    }

    const now = new Date();

    const searches = await prisma.savedSearch.findMany({
      where: {
        alertEnabled: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    let emailsSent = 0;
    let searchesChecked = 0;
    let searchesMatched = 0;

    for (const search of searches as SearchWithUser[]) {
      searchesChecked++;

      if (!search.user?.email) {
        continue;
      }

      if (!shouldNotify(search.lastNotified, now, search.alertFrequency)) {
        continue;
      }

      const matches = await findMatchesForSearch(search, now);

      if (matches.length === 0) {
        continue;
      }

      searchesMatched++;

      await resend.emails.send({
        from: "CareerOS <noreply@careeros.app>",
        to: search.user.email,
        subject: `New jobs matching "${search.searchQuery}"`,
        html: renderEmailHtml(search, matches),
      });

      await prisma.savedSearch.update({
        where: { id: search.id },
        data: { lastNotified: now },
      });

      emailsSent++;
    }

    return NextResponse.json({
      success: true,
      searchesChecked,
      searchesMatched,
      emailsSent,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Failed to send alerts" },
      { status: 500 },
    );
  }
}
