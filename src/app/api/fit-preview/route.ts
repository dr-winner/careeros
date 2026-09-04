import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AiUnavailableError, extractJsonObject, generateWithFallback } from "@/lib/ai";
import { hasAiProviderConfigured } from "@/lib/env";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from "@/lib/ratelimit";
import { getZodErrorMessage } from "@/lib/validation";

export const maxDuration = 60;

// Anonymous instant fit check for the landing page — the ungated "aha
// moment". Real AI scoring, no account, no storage. The full gap
// breakdown stays behind signup; this returns just enough to prove the
// product works: score, verdict, matched skills, and a teaser.

const previewSchema = z.object({
  jobText: z.string().trim().min(100, "Paste the full job advert (at least a few sentences).").max(8000),
  cvText: z.string().trim().min(150, "Paste more of your CV — a few sections at least.").max(15000),
  // Honeypot: humans never see this field.
  website: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous";
    // Costs AI money on a public endpoint: strict per-IP cap, fail-closed.
    const rateLimitResult = await checkRateLimit("preview", RATE_LIMITS.preview, ip, { failClosed: true });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "You've used your free previews for now — create a free account for 3 full analyses every month." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
      );
    }

    const parsed = previewSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }
    if (parsed.data.website) {
      return NextResponse.json({ error: "Preview unavailable." }, { status: 400 });
    }

    if (!hasAiProviderConfigured()) {
      return NextResponse.json(
        { error: "The instant preview is briefly unavailable — sign up free to run a full analysis." },
        { status: 503 },
      );
    }

    const { jobText, cvText } = parsed.data;

    // Untrusted input into an LLM prompt — output only affects this
    // visitor's own preview and the score is clamped below.
    const { text } = await generateWithFallback(
      `You are scoring how well a candidate's CV fits a job advert.

JOB ADVERT:
${jobText.substring(0, 5000)}

CANDIDATE CV:
${cvText.substring(0, 8000)}

Return ONLY JSON:
{
  "fitScore": <integer 0-100, honest assessment considering skills, seniority and domain — not keyword overlap>,
  "verdict": "<3-4 word verdict, e.g. 'Strong Match' or 'Stretch Role'>",
  "matchedSkills": ["<up to 4 skills the CV genuinely shows that this job needs>"],
  "missingCount": <integer: how many important requirements the CV does NOT clearly show>,
  "teaser": "<one sentence naming the SINGLE biggest gap, phrased to be useful but incomplete, e.g. 'Your biggest gap is hands-on experience with paid ad campaigns.'>"
}`,
      "You are a precise career-fit scoring engine. Return ONLY valid JSON. Be honest — do not inflate scores.",
      { maxTokens: 600, temperature: 0.2, json: true },
    );

    const result = extractJsonObject(text);
    if (!result) throw new Error("Unparseable preview response");

    const matchedRaw = result.matchedSkills;
    const matchedSkills = (
      Array.isArray(matchedRaw)
        ? matchedRaw.filter((s): s is string => typeof s === "string")
        : typeof matchedRaw === "string" && matchedRaw.trim()
          ? [matchedRaw.trim()]
          : []
    ).slice(0, 4);

    const fitScore = Math.min(100, Math.max(0, Math.round(Number(result.fitScore) || 0)));

    return NextResponse.json({
      fitScore,
      verdict: String(result.verdict || "Assessment Ready").slice(0, 40),
      matchedSkills,
      missingCount: Math.min(15, Math.max(0, Math.round(Number(result.missingCount) || 0))),
      teaser: String(result.teaser || "").slice(0, 200),
    });
  } catch (error) {
    console.error("Fit preview error:", error);
    if (error instanceof AiUnavailableError) {
      return NextResponse.json(
        { error: "The instant preview is briefly unavailable — sign up free to run a full analysis." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Preview failed — try again, or sign up free for the full analysis." },
      { status: 500 },
    );
  }
}
