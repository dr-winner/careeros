import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUserId } from "@/lib/auth";
import { generateWithFallback } from "@/lib/ai";
import { hasAiProviderConfigured } from "@/lib/env";
import { isUserPremium } from "@/lib/auth";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from "@/lib/ratelimit";
import { ensureJobRecord } from "@/lib/jobs";
import { claimQuota, releaseQuota } from "@/lib/quota";
import { sendReferralConvertedEmail } from "@/lib/transactional-emails";

const SKILL_KEYWORDS: Record<string, string[]> = {
  JavaScript: ["javascript", "js", "ecmascript"],
  TypeScript: ["typescript", "ts"],
  React: ["react", "reactjs", "react.js", "nextjs", "next.js"],
  Vue: ["vue", "vuejs", "vue.js", "nuxt"],
  Angular: ["angular", "angularjs"],
  "Node.js": ["node", "nodejs", "node.js", "express", "expressjs"],
  Python: ["python", "django", "flask", "fastapi", "pandas", "numpy"],
  Java: ["java", "spring", "springboot", "spring boot", "jvm"],
  "C#": ["c#", "csharp", ".net", "dotnet", "asp.net"],
  PHP: ["php", "laravel", "codeigniter", "wordpress"],
  Ruby: ["ruby", "ruby on rails", "rails"],
  Go: ["golang", "go programming"],
  Rust: ["rust", "rustlang"],
  Swift: ["swift", "ios", "swiftui"],
  Kotlin: ["kotlin", "android"],
  Flutter: ["flutter", "dart"],
  "React Native": ["react native", "rn"],
  SQL: ["sql", "mysql", "postgresql", "postgres", "sqlite", "mssql", "database"],
  MongoDB: ["mongodb", "mongo", "nosql"],
  Redis: ["redis", "cache"],
  AWS: ["aws", "amazon web services", "ec2", "s3", "lambda"],
  Azure: ["azure", "microsoft azure", "azure devops"],
  GCP: ["gcp", "google cloud", "google cloud platform"],
  Docker: ["docker", "container", "containerization"],
  Kubernetes: ["kubernetes", "k8s", "helm"],
  "CI/CD": ["ci/cd", "jenkins", "gitlab ci", "github actions", "pipeline"],
  Git: ["git", "github", "gitlab", "bitbucket", "version control"],
  Linux: ["linux", "unix", "bash", "shell"],
  "Machine Learning": ["machine learning", "ml", "tensorflow", "pytorch", "keras"],
  "Data Analysis": ["data analysis", "analytics", "tableau", "power bi"],
  Agile: ["agile", "scrum", "kanban", "jira"],
  Leadership: ["leadership", "team lead", "mentoring", "management"],
  Communication: ["communication", "stakeholder", "presentation"],
  "Project Management": ["project management", "pmp"],
  Marketing: ["marketing", "seo", "sem", "digital marketing"],
  Sales: ["sales", "crm", "salesforce", "business development"],
  Finance: ["finance", "accounting", "financial analysis"],
  HR: ["hr", "human resources", "recruitment"],
  "Graphic Design": ["graphic design", "photoshop", "illustrator", "figma"],
  "UI/UX": ["ui/ux", "ui design", "ux design", "user experience"],
  Networking: ["networking", "cisco", "ccna", "network security"],
  Cybersecurity: ["cybersecurity", "security", "penetration testing"],
  API: ["api", "rest api", "restful", "graphql"],
  Testing: ["testing", "qa", "selenium", "jest", "unit test"],
  Microservices: ["microservices", "service mesh"],
  Cloud: ["cloud", "cloud computing", "serverless"],
};

function extractSkills(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foundSkills: string[] = [];
  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some((kw) => lowerText.includes(kw))) {
      foundSkills.push(skill);
    }
  }
  return foundSkills;
}

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

    const isPremiumEarly = await isUserPremium();
    // Atomic claim: parallel requests cannot exceed the free-tier limit.
    const quota = await claimQuota(userId, isPremiumEarly);

    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          message: `Free plan includes ${quota.limit} analyses per month. Upgrade to Premium for unlimited.`,
          remaining: 0,
          resetAt: quota.resetAt,
        },
        { status: 402 },
      );
    }
    if (!isPremiumEarly) {
      refund = () => releaseQuota(userId, isPremiumEarly);
    }

    const { jobId, jobDescription: clientDescription, jobTitle, companyName } = await request.json();
    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    // Persist job to DB (upsert) so description is available for future analyses
    if (clientDescription || jobTitle) {
      ensureJobRecord({ jobId, title: jobTitle, companyName, description: clientDescription }).catch(() => {});
    }

    // Prefer the full description stored in DB over the truncated client-sent one
    const storedJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: { description: true },
    });
    const jobDescription = storedJob?.description || clientDescription || "";

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
    const resumeSkills =
      user?.resumes[0]?.skills?.map((s: { skillName: string }) => s.skillName) || [];
    const experiences = user?.resumes[0]?.experiences || [];
    const education = user?.resumes[0]?.education || [];
    const allUserSkills = [...new Set([...profileSkills, ...resumeSkills])];
    const jobSkills = extractSkills(jobDescription || "");

    const matched = allUserSkills.filter((skill) =>
      jobSkills.some(
        (j) =>
          j.toLowerCase() === skill.toLowerCase() ||
          skill.toLowerCase().includes(j.toLowerCase()) ||
          j.toLowerCase().includes(skill.toLowerCase()),
      ),
    );
    const missing = jobSkills.filter(
      (j) => !matched.some((m) => m.toLowerCase() === j.toLowerCase()),
    );

    let score =
      jobSkills.length > 0
        ? Math.min(100, Math.round((matched.length / jobSkills.length) * 100))
        : 50;

    const getVerdict = (s: number) => {
      if (s >= 80) return "Strong Match";
      if (s >= 60) return "Good Fit";
      if (s >= 40) return "Partial Match";
      return "Reach Position";
    };
    let verdict = getVerdict(score);

    const hasAI = hasAiProviderConfigured();
    const isPremium = isPremiumEarly;

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

    // SECURITY NOTE: jobDescription and CV text below are untrusted user
    // input flowing into LLM prompts (prompt injection is possible). Safe
    // today because model output only affects the requesting user's own
    // displayed score/advice and scores are clamped — revisit if AI output
    // ever gains authority (auto-actions, payments, other users' data).
    if (hasAI && jobDescription && !profileIncomplete) {
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
      }

      // AI CV optimization — premium only
      if (isPremium && missing.length > 0) {
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

    // Quota already claimed atomically at the top of the handler.

    // Persist this analysis so the analytics page has real data
    try {
      const jobRecord = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true } });
      if (jobRecord) {
        await prisma.fitAnalysis.upsert({
          where: { userId_jobId: { userId, jobId } },
          update: { fitScore: score, verdict },
          create: { userId, jobId, fitScore: score, verdict },
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
        aiEnabled: hasAI,
        isPremium,
        premiumRequired: !isPremium && missing.length > 0,
        profileIncomplete,
        lowConfidence,
        quota: isPremium
          ? null
          : { remaining: quota.remaining, limit: quota.limit, resetAt: quota.resetAt },
      },
    });
  } catch (error) {
    console.error("Error analyzing job fit:", error);
    // Refund the claimed free-tier slot — a failed analysis shouldn't count.
    if (refund) await refund().catch(() => {});
    return NextResponse.json({ error: "Failed to analyze job fit" }, { status: 500 });
  }
}
