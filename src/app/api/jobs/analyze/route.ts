import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUserId } from "@/lib/auth";
import { AiUnavailableError, generateWithFallback } from "@/lib/ai";
import { hasAiProviderConfigured } from "@/lib/env";
import { isUserPremium } from "@/lib/auth";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from "@/lib/ratelimit";
import { ensureJobRecord } from "@/lib/jobs";
import { checkQuota, claimQuota, releaseQuota } from "@/lib/quota";
import { sendReferralConvertedEmail } from "@/lib/transactional-emails";
import { SOFT_SKILLS, extractSkills, sanitizeSkillList } from "@/lib/skills";

// Below this the "description" is a category label or a stub, not an advert.
const MIN_DESCRIPTION_CHARS = 80;

const getVerdict = (s: number) => {
  if (s >= 80) return "Strong Match";
  if (s >= 60) return "Good Fit";
  if (s >= 40) return "Partial Match";
  return "Reach Position";
};

// A stored analysis is served for free while it's this fresh. Re-opening
// the same job must never cost a credit — only an explicit re-analyze does.
const CACHED_ANALYSIS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  // Set once a free-tier slot has been claimed, so the catch block can
  // refund it if the analysis fails after claiming.
  let refund: (() => Promise<void>) | null = null;

  try {
    const userId = await getDbUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Per-user keying — mobile carrier NAT makes IP keying unfair here.
    const rateLimitResult = await checkRateLimit("ai", RATE_LIMITS.ai, userId);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
      );
    }

    // Validate input BEFORE touching quota — a malformed request must
    // never cost the user a credit.
    const body = await request.json().catch(() => ({}));
    const {
      jobId,
      jobDescription: clientDescription,
      jobTitle,
      companyName,
      force,
    } = body as {
      jobId?: string;
      jobDescription?: string;
      jobTitle?: string;
      companyName?: string;
      force?: boolean;
    };
    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    const isPremium = await isUserPremium();

    // Persist job to DB (upsert) so description is available for future analyses
    if (clientDescription || jobTitle) {
      await ensureJobRecord({ jobId, title: jobTitle, companyName, description: clientDescription }).catch(() => {});
    }

    // Prefer the full description stored in DB over the truncated client-sent one
    const storedJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: { description: true },
    });
    const storedDescription = (storedJob?.description || "").trim();
    const jobDescription =
      storedDescription.length >= MIN_DESCRIPTION_CHARS
        ? storedDescription
        : (clientDescription || "").trim();

    // Several sources (Workable, SmartRecruiters, Jobberman) list a title
    // but no advert text. There is nothing to score against, and the old
    // behaviour — a flat 50% with "low confidence" — read as a random
    // number and cost a credit. Ask for the advert instead; the client
    // re-submits with the pasted text, which ensureJobRecord persists.
    if (jobDescription.length < MIN_DESCRIPTION_CHARS) {
      return NextResponse.json({
        analysis: null,
        needsDescription: true,
        charged: false,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        resumes: {
          where: { isPrimary: true },
          take: 1,
          include: { skills: true, experiences: true, education: true },
        },
      },
    });

    const profileSkills = extractSkills(
      [user?.headline || "", user?.experience || "", user?.desiredRole || ""].join(" "),
    );
    const rawResumeSkills =
      user?.resumes[0]?.skills?.map((s: { skillName: string }) => s.skillName) || [];
    // CV skills arrive as raw parser output ("React and Next.js", "and Python",
    // "richard · github.com"). Map them onto the dictionary so they compare
    // like-for-like with the advert, and drop fragments that aren't skills.
    const resumeSkills = sanitizeSkillList(rawResumeSkills);
    const experiences = user?.resumes[0]?.experiences || [];
    const education = user?.resumes[0]?.education || [];
    const allUserSkills = [...new Set([...profileSkills, ...resumeSkills])];
    const allJobSkills = extractSkills(jobDescription || "");
    // Score on hard requirements; soft skills only count if that's all there is.
    const hardJobSkills = allJobSkills.filter((s) => !SOFT_SKILLS.has(s));
    const jobSkills = hardJobSkills.length > 0 ? hardJobSkills : allJobSkills;

    // Exact canonical overlap only. The old "either contains the other" rule
    // let a React CV claim React Native and a Java CV claim JavaScript.
    const userSkillSet = new Set(allUserSkills.map((s) => s.toLowerCase()));
    const matched = jobSkills.filter((j) => userSkillSet.has(j.toLowerCase()));
    const missing = jobSkills.filter((j) => !userSkillSet.has(j.toLowerCase()));

    let score =
      jobSkills.length > 0
        ? Math.min(100, Math.round((matched.length / jobSkills.length) * 100))
        : 50;
    let verdict = getVerdict(score);

    const hasAI = hasAiProviderConfigured();

    let cvAdvice = "";
    let cvOptimization: {
      content: string[];
      format: string[];
      atsTips: string[];
      keywordsToAdd: string[];
      phrasesToUse: string[];
    } | null = null;
    let aiNarrative: { strengths: string; gaps: string; recommendation: string } | null = null;

    const profileIncomplete = allUserSkills.length === 0 && !user?.headline && !user?.experience;

    // Low confidence: the keyword score has weak inputs — either the CV
    // has few identifiable skills, or the job text yielded no extractable
    // requirements (score defaults to 50 with no real basis). The UI must
    // caveat these scores; AI scoring below replaces them when available.
    const lowConfidence =
      (allUserSkills.length < 3 && !profileIncomplete) || jobSkills.length === 0;

    const quotaSnapshot = isPremium ? null : await checkQuota(userId, false);
    const quotaPayload = quotaSnapshot
      ? { remaining: quotaSnapshot.remaining, limit: quotaSnapshot.limit, resetAt: quotaSnapshot.resetAt }
      : null;

    // Nothing to analyse against: no CV, no headline, no experience. A
    // keyword-only score is a nudge to complete the profile, not a paid
    // deliverable — return it without spending a credit.
    if (profileIncomplete) {
      return NextResponse.json({
        analysis: {
          fitScore: score,
          matchedSkills: matched,
          missingSkills: missing,
          verdict,
          hasResume: !!user?.resumes[0],
          hasProfile: false,
          cvAdvice: missing.length > 0 ? `Skills this role asks for: ${missing.slice(0, 5).join(", ")}` : "",
          cvOptimization: null,
          aiNarrative: null,
          aiEnabled: hasAI,
          isPremium,
          premiumRequired: false,
          profileIncomplete: true,
          lowConfidence: true,
          cached: false,
          charged: false,
          quota: quotaPayload,
        },
      });
    }

    // Free tier: re-opening a job you've already analysed is free. Serve
    // the stored result (score, verdict, narrative) and recompute the
    // cheap keyword overlap live so it reflects any CV updates.
    if (!isPremium && !force) {
      const existing = await prisma.fitAnalysis.findUnique({
        where: { userId_jobId: { userId, jobId } },
        select: {
          fitScore: true,
          verdict: true,
          strengthsSummary: true,
          gapsSummary: true,
          riskSummary: true,
          createdAt: true,
        },
      });
      const fresh =
        existing && Date.now() - existing.createdAt.getTime() < CACHED_ANALYSIS_MAX_AGE_MS;
      if (existing && fresh) {
        const storedNarrative =
          existing.strengthsSummary && existing.gapsSummary && existing.riskSummary
            ? {
                strengths: existing.strengthsSummary,
                gaps: existing.gapsSummary,
                recommendation: existing.riskSummary,
              }
            : null;
        return NextResponse.json({
          analysis: {
            fitScore: Math.round(existing.fitScore),
            matchedSkills: matched,
            missingSkills: missing,
            verdict: existing.verdict,
            hasResume: !!user?.resumes[0],
            hasProfile: !!(user?.headline || user?.experience),
            cvAdvice: missing.length > 0 ? `Skills to develop: ${missing.slice(0, 5).join(", ")}` : "",
            cvOptimization: null,
            aiNarrative: storedNarrative,
            aiEnabled: hasAI,
            isPremium,
            premiumRequired: missing.length > 0,
            profileIncomplete: false,
            lowConfidence,
            cached: true,
            charged: false,
            analyzedAt: existing.createdAt,
            quota: quotaPayload,
          },
        });
      }
    }

    // Atomic claim: parallel requests cannot exceed the free-tier limit.
    const quota = await claimQuota(userId, isPremium);

    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          message: `Free plan includes ${quota.limit} AI credits per month. Upgrade to Premium for unlimited.`,
          remaining: 0,
          resetAt: quota.resetAt,
        },
        { status: 402 },
      );
    }
    if (!isPremium) {
      refund = () => releaseQuota(userId, isPremium);
    }

    // SECURITY NOTE: jobDescription and CV text below are untrusted user
    // input flowing into LLM prompts (prompt injection is possible). Safe
    // today because model output only affects the requesting user's own
    // displayed score/advice and scores are clamped — revisit if AI output
    // ever gains authority (auto-actions, payments, other users' data).
    // Set when every provider fails. The user then sees a keyword estimate,
    // which must not cost a credit and must not wear the "AI" badge.
    let aiUnavailable = false;

    if (hasAI && jobDescription) {
      // AI narrative analysis for ALL users — brief summary of fit + AI-scored fitScore
      try {
        const narrativePrompt = `You are a career advisor speaking directly to a job seeker. Analyze their fit for this role and speak in second person ("you", "your").

JOB: ${jobTitle || "Position"}
JOB DESCRIPTION: ${(jobDescription || "").substring(0, 5000)}

ABOUT THE USER:
- Skills: ${allUserSkills.join(", ") || "None listed"}
- Experience level: ${user?.experience || "Not specified"}
- Headline: ${user?.headline || "Not set"}

Return ONLY this JSON (no markdown). Use "you"/"your" throughout, never "the candidate":
{
  "fitScore": <integer 0-100 representing how well this person fits the role, considering skills depth, seniority match, and role requirements — not just keyword overlap>,
  "strengths": "1-2 sentences on your strengths for this role",
  "gaps": "1-2 sentences on key gaps you should address",
  "recommendation": "direct 1-sentence recommendation on whether you should apply"
}`;

        const { text } = await generateWithFallback(
          narrativePrompt,
          "You are a career advisor speaking directly to a job seeker. Always use second person (you/your). Return only valid JSON, no markdown.",
          { maxTokens: 350, temperature: 0.3, json: true },
        );
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.fitScore !== undefined) {
            const aiScore = Math.min(100, Math.max(0, Math.round(Number(parsed.fitScore))));
            if (!isNaN(aiScore)) {
              score = aiScore;
              verdict = getVerdict(score);
            }
          }
          aiNarrative = {
            strengths: parsed.strengths,
            gaps: parsed.gaps,
            recommendation: parsed.recommendation,
          };
        }
      } catch (err) {
        console.error("AI narrative error:", err);
        if (err instanceof AiUnavailableError) {
          aiUnavailable = true;
          if (refund) {
            await refund().catch(() => {});
            refund = null;
          }
        }
      }

      // AI CV optimization — premium only
      if (isPremium && missing.length > 0 && !aiUnavailable) {
        try {
          const optimizePrompt = `You are an expert CV optimization specialist for the African job market. Speak directly to the user using "you"/"your".

JOB TITLE: ${jobTitle || "This position"}
JOB DESCRIPTION: ${(jobDescription || "").substring(0, 4000)}

ABOUT THE USER:
- Headline: ${user?.headline || "Not set"}
- Experience: ${user?.experience || "Not provided"}
- Skills: ${allUserSkills.join(", ") || "None"}
- Work history: ${experiences.map((e: { title: string; company: string | null }) => `${e.title}${e.company ? " at " + e.company : ""}`).join(", ") || "Not provided"}
- Education: ${education.map((e: { degree: string | null; institution: string }) => `${e.degree || "Degree"} from ${e.institution}`).join(", ") || "Not provided"}
- Missing skills: ${missing.join(", ")}

Return ONLY this JSON (no markdown):
{
  "content": ["specific content change 1", "specific content change 2"],
  "format": ["formatting tip 1", "formatting tip 2"],
  "atsTips": ["ATS tip 1", "ATS tip 2"],
  "keywordsToAdd": ["keyword1", "keyword2"],
  "phrasesToUse": ["power phrase 1", "power phrase 2"]
}`;

          const { text } = await generateWithFallback(
            optimizePrompt,
            "You are an expert CV optimizer for the African job market. Speak directly to the user using you/your. Return ONLY valid JSON.",
            { maxTokens: 600, temperature: 0.4, json: true },
          );
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            cvOptimization = {
              content: parsed.content || [],
              format: parsed.format || [],
              atsTips: parsed.atsTips || [],
              keywordsToAdd: parsed.keywordsToAdd || [],
              phrasesToUse: parsed.phrasesToUse || [],
            };
            cvAdvice = parsed.content?.[0] || "";
          }
        } catch (err) {
          console.error("AI CV optimization error:", err);
        }
      }
    }

    // Non-AI fallback advice
    if (!cvAdvice && missing.length > 0) {
      cvAdvice = `Skills to develop: ${missing.slice(0, 5).join(", ")}`;
      if (!isPremium) {
        cvOptimization = null;
      }
    }

    // Persist this analysis so re-opens are free and analytics has real
    // data. createdAt is refreshed so the cache window restarts.
    const analyzedAt = new Date();
    try {
      const jobRecord = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true } });
      if (jobRecord) {
        await prisma.fitAnalysis.upsert({
          where: { userId_jobId: { userId, jobId } },
          update: {
            fitScore: score,
            verdict,
            strengthsSummary: aiNarrative?.strengths ?? null,
            gapsSummary: aiNarrative?.gaps ?? null,
            riskSummary: aiNarrative?.recommendation ?? null,
            createdAt: analyzedAt,
          },
          create: {
            userId,
            jobId,
            fitScore: score,
            verdict,
            strengthsSummary: aiNarrative?.strengths ?? null,
            gapsSummary: aiNarrative?.gaps ?? null,
            riskSummary: aiNarrative?.recommendation ?? null,
            createdAt: analyzedAt,
          },
        });

        // Referral reward: credit referrer on user's very first analysis
        const totalAnalyses = await prisma.fitAnalysis.count({ where: { userId } });
        if (totalAnalyses === 1) {
          const referral = await prisma.referral.findFirst({
            where: { refereeEmail: user?.email?.toLowerCase(), status: "pending" },
            select: { id: true, referrerId: true },
          });
          if (referral) {
            // "engaged" (not "converted"): the referee ran their first
            // analysis, earning the referrer a bonus slot. "converted" is
            // reserved for premium upgrade, which triggers the GHS 5
            // Moolre payout in processReferralReward.
            const [referrer] = await Promise.all([
              prisma.user.update({
                where: { id: referral.referrerId },
                data: { bonusAnalyses: { increment: 1 } },
                select: { email: true, fullName: true },
              }),
              prisma.referral.update({
                where: { id: referral.id },
                data: { status: "engaged" },
              }),
            ]);
            sendReferralConvertedEmail(
              referrer.email,
              referrer.fullName,
              user?.fullName ?? null
            ).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error("FitAnalysis persist/referral credit error:", err);
    }

    return NextResponse.json({
      analysis: {
        fitScore: score,
        matchedSkills: matched,
        missingSkills: missing,
        verdict,
        hasResume: !!user?.resumes[0],
        hasProfile: !!(user?.headline || user?.experience),
        cvAdvice,
        cvOptimization: isPremium ? cvOptimization : null,
        aiNarrative,
        aiEnabled: hasAI && !aiUnavailable,
        aiUnavailable,
        isPremium,
        premiumRequired: !isPremium && missing.length > 0,
        profileIncomplete,
        lowConfidence,
        cached: false,
        charged: !isPremium && !aiUnavailable,
        analyzedAt,
        quota: isPremium
          ? null
          : {
              remaining: aiUnavailable ? quota.remaining + 1 : quota.remaining,
              limit: quota.limit,
              resetAt: quota.resetAt,
            },
      },
    });
  } catch (error) {
    console.error("Error analyzing job fit:", error);
    // Refund the claimed free-tier slot — a failed analysis shouldn't count.
    if (refund) await refund().catch(() => {});
    return NextResponse.json({ error: "Failed to analyze job fit" }, { status: 500 });
  }
}
