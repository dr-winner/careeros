import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { isValidCronSecret } from "@/lib/validation";
import { readEnv, getEmailFrom } from "@/lib/env";
import { sendSms, isMoolreSmsConfigured } from "@/lib/moolre";

const resendApiKey = readEnv("RESEND_API_KEY");
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const PROVIDER_TIMEOUT_MS = 6_000;

const ADZUNA_COUNTRIES = [
  { name: "South Africa", code: "ZA", region: "Africa" },
  { name: "Kenya", code: "KE", region: "Africa" },
  { name: "Ghana", code: "GH", region: "Africa" },
];


type SavedSearchRecord = Awaited<ReturnType<typeof import("@/lib/db").prisma.savedSearch.findMany>>[number];
type SavedSearchWithUser = SavedSearchRecord & {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    phone: string | null;
    smsAlerts: boolean;
  };
};

interface JobAlert {
  id: string;
  title: string;
  companyName: string;
  location: string;
  workMode: string;
  applicationUrl: string;
  postedAt: Date;
  source: string;
}

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  redirect_url: string;
  created: string;
}

interface RemotiveJob {
  id: string;
  title: string;
  company_name: string;
  candidate_required_location: string;
  url: string;
  publication_date: string;
}

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://careeros.live").replace(/\/+$/, "");
}

async function fetchJsonWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = PROVIDER_TIMEOUT_MS,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeDate(dateStr: string): Date {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date() : date;
}

async function fetchFromAdzuna(query: string, country: string): Promise<JobAlert[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) return [];

  const countryMap: Record<string, string> = {
    "South Africa": "za",
    Kenya: "ke",
    Ghana: "gh",
  };

  const countryCode = countryMap[country] || "za";

  try {
    const url = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}&what=${encodeURIComponent(query)}&results_per_page=20`;
    const data = (await fetchJsonWithTimeout(url)) as { results?: AdzunaJob[] };

    if (!Array.isArray(data.results)) return [];

    return data.results.map((job) => ({
      id: `adzuna-${job.id}`,
      title: job.title,
      companyName: job.company?.display_name || "Unknown",
      location: job.location?.display_name || "Not specified",
      workMode: "Not specified",
      applicationUrl: job.redirect_url || "#",
      postedAt: normalizeDate(job.created || new Date().toISOString()),
      source: "Adzuna",
    }));
  } catch (error) {
    console.error("Adzuna error:", error);
    return [];
  }
}

async function fetchFromRemotive(query: string): Promise<JobAlert[]> {
  try {
    const searchData = (await fetchJsonWithTimeout(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=50`,
    )) as { jobs?: RemotiveJob[] };

    if (!Array.isArray(searchData.jobs)) return [];

    return searchData.jobs.map((job) => ({
      id: `remotive-${job.id}`,
      title: job.title,
      companyName: job.company_name || "Unknown",
      location: job.candidate_required_location || "Remote",
      workMode: "Remote",
      applicationUrl: job.url || "#",
      postedAt: normalizeDate(job.publication_date || new Date().toISOString()),
      source: "Remotive",
    }));
  } catch (error) {
    console.error("Remotive error:", error);
    return [];
  }
}

async function fetchJobsForQuery(query: string, location?: string | null): Promise<JobAlert[]> {
  const allJobs: JobAlert[] = [];

  // Fetch only from the matched country (or all countries if no location match)
  const matchedCountry = location
    ? ADZUNA_COUNTRIES.find((c) => location.toLowerCase().includes(c.name.toLowerCase()))
    : null;
  const countriesToSearch = matchedCountry ? [matchedCountry] : ADZUNA_COUNTRIES;

  const [adzunaJobs, remotiveJobs] = await Promise.all([
    Promise.all(countriesToSearch.map((c) => fetchFromAdzuna(query, c.name))),
    fetchFromRemotive(query),
  ]);

  for (const jobs of adzunaJobs) {
    allJobs.push(...jobs);
  }
  allJobs.push(...remotiveJobs);

  const seen = new Set<string>();
  return allJobs.filter((job) => {
    const key = `${job.title.toLowerCase()}::${job.companyName.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

function matchesJobAlert(search: string, job: JobAlert): boolean {
  const tokens = tokenizeSearchQuery(search);
  const searchableText = `${job.title} ${job.companyName} ${job.location}`.toLowerCase();

  if (tokens.length > 0) {
    return tokens.some((token) => searchableText.includes(token));
  }

  return searchableText.includes(search.toLowerCase());
}

function getJobsWithinPeriod(jobs: JobAlert[], hoursBack: number): JobAlert[] {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  return jobs.filter((job) => job.postedAt >= cutoff);
}

function renderEmailHtml(
  search: SavedSearchWithUser,
  jobs: JobAlert[],
  baseUrl: string,
): string {
  const jobList = jobs
    .slice(0, 5)
    .map((job) => {
      const title = escapeHtml(job.title);
      const company = escapeHtml(job.companyName);
      const location = escapeHtml(job.location);
      const workMode = escapeHtml(job.workMode);
      const href = escapeHtml(job.applicationUrl);
      const daysAgo = Math.floor((Date.now() - job.postedAt.getTime()) / (1000 * 60 * 60 * 24));

      return `
        <li style="margin-bottom: 12px; padding: 16px; background: #1a1a2e; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.2);">
          <strong style="color: #a78bfa; font-size: 16px;">${title}</strong>
          <span style="color: #6b7280; font-size: 14px;"> at ${company}</span><br>
          <span style="color: #9ca3af; font-size: 13px;">${location} • ${workMode} • ${daysAgo === 0 ? "Today" : `${daysAgo}d ago`}</span><br>
          <a href="${href}" target="_blank" style="color: #22d3ee; font-size: 14px; text-decoration: none; display: inline-block; margin-top: 8px;">View Job →</a>
        </li>
      `;
    })
    .join("");

  const alertName = escapeHtml(search.name);
  const searchQuery = escapeHtml(search.searchQuery);
  const locationText = search.location ? ` in ${escapeHtml(search.location)}` : "";
  const manageAlertsUrl = `${baseUrl}/alerts`;
  const greetingName = escapeHtml(search.user.fullName?.trim() || "there");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #a78bfa; margin: 0; font-size: 28px;">CareerOS</h1>
          <p style="color: #6b7280; margin: 8px 0 0; font-size: 14px;">New jobs matching your alert</p>
        </div>

        <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1)); padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid rgba(139, 92, 246, 0.3);">
          <p style="color: #fafafa; margin: 0; font-size: 16px;">Hi ${greetingName},</p>
          <p style="color: #a78bfa; margin: 12px 0 0; font-size: 14px;">
            <strong>Alert:</strong> ${alertName}<br>
            <span style="color: #9ca3af;">${searchQuery}${locationText}</span>
          </p>
        </div>

        <h2 style="color: #fafafa; margin-bottom: 16px; font-size: 18px;">${jobs.length} new job${jobs.length !== 1 ? "s" : ""} found</h2>

        <ul style="list-style: none; padding: 0; margin: 0 0 24px 0;">
          ${jobList}
        </ul>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${manageAlertsUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Manage Alerts
          </a>
        </div>

        <p style="color: #4b5563; font-size: 12px; text-align: center; margin-top: 32px;">
          You're receiving this because you set up a job alert on CareerOS.
          <a href="${manageAlertsUrl}" style="color: #8b5cf6; text-decoration: none;">Manage preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;
}

export async function GET(request: NextRequest) {
  try {
    if (!isValidCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!resend) {
      return NextResponse.json({ error: "Email delivery is not configured" }, { status: 503 });
    }

    const { prisma } = await import("@/lib/db");
    const now = new Date();
    const baseUrl = getBaseUrl();

    const searches = await prisma.savedSearch.findMany({
      where: { alertEnabled: true },
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true, smsAlerts: true } },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    let emailsSent = 0;
    let smsSent = 0;
    let searchesChecked = 0;
    let searchesMatched = 0;

    for (const search of searches as SavedSearchWithUser[]) {
      searchesChecked++;

      if (!search.user?.email) continue;

      const frequencyHours = search.alertFrequency === "weekly" ? 168 : 24;

      if (search.lastNotified) {
        const hoursSince = (now.getTime() - search.lastNotified.getTime()) / (1000 * 60 * 60);
        if (hoursSince < frequencyHours) continue;
      }

      try {
        const jobs = await fetchJobsForQuery(search.searchQuery, search.location);
        const recentJobs = getJobsWithinPeriod(jobs, frequencyHours);

        if (recentJobs.length === 0) continue;

        const matchedJobs = recentJobs.filter((job) => matchesJobAlert(search.searchQuery, job));

        if (matchedJobs.length === 0) continue;

        searchesMatched++;

        await resend.emails.send({
          from: getEmailFrom(),
          to: search.user.email,
          subject: `New jobs matching "${search.searchQuery}" (${matchedJobs.length})`,
          html: renderEmailHtml(search, matchedJobs, baseUrl),
        });

        await prisma.savedSearch.update({
          where: { id: search.id },
          data: { lastNotified: now },
        });

        emailsSent++;

        // SMS channel via Moolre — reaches users who don't check email.
        // Opt-in (smsAlerts) and requires a phone number on the profile.
        if (search.user.smsAlerts && search.user.phone && isMoolreSmsConfigured()) {
          const topJob = matchedJobs[0];
          const others = matchedJobs.length - 1;
          const smsBody =
            `CareerOS: ${matchedJobs.length} new job${matchedJobs.length !== 1 ? "s" : ""} for "${search.searchQuery}". ` +
            `Top match: ${topJob.title} at ${topJob.companyName}` +
            (others > 0 ? ` +${others} more` : "") +
            `. ${baseUrl}/alerts`;

          try {
            const sms = await sendSms([
              { recipient: search.user.phone, message: smsBody, ref: `alert-${search.id}-${now.getTime()}` },
            ]);
            if (sms.ok) smsSent++;
            else console.error(`SMS alert failed for search ${search.id}: ${sms.code}`);
          } catch (smsError) {
            console.error(`SMS alert error for search ${search.id}:`, smsError);
          }
        }
      } catch (error) {
        console.error(`Error processing search ${search.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      searchesChecked,
      searchesMatched,
      emailsSent,
      smsSent,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json({ error: "Failed to send alerts" }, { status: 500 });
  }
}
