import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDbUser } from "@/lib/auth";
import { ensureJobRecord } from "@/lib/jobs";
import { getZodErrorMessage } from "@/lib/validation";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from "@/lib/ratelimit";

// "Bring your own job": most real Ghanaian vacancies circulate on
// WhatsApp, company pages, and agency lists — not aggregator APIs. This
// lets a signed-in user paste any advert and run the full analysis
// pipeline on it (score, gaps, cover letter, tracking).

const pasteJobSchema = z.object({
  title: z.string().trim().min(3, "Give the job a title").max(200),
  companyName: z.string().trim().max(200).optional(),
  description: z
    .string()
    .trim()
    .min(100, "Paste the full advert — at least a few sentences.")
    .max(20000),
  applicationUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getDbUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit("default", RATE_LIMITS.strict, user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many pasted jobs. Please wait a minute." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
      );
    }

    const parsed = pasteJobSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const { title, companyName, description, applicationUrl } = parsed.data;

    // Namespaced id keeps pasted jobs distinct from aggregator ids; the
    // user-id suffix scopes visibility naturally (nobody browses these —
    // they're reached only via the creator's own detail link).
    const jobId = `pasted-${user.id.slice(-8)}${Date.now().toString(36)}`;

    const job = await ensureJobRecord({
      jobId,
      title,
      companyName: companyName || null,
      description,
      applicationUrl: applicationUrl || null,
      postedAt: new Date(),
      status: "active",
    });

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    console.error("Paste job error:", error);
    return NextResponse.json({ error: "Could not save this job. Try again." }, { status: 500 });
  }
}
