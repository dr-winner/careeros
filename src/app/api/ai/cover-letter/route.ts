import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { generateWithFallback } from "@/lib/ai";
import { coverLetterRequestSchema, getZodErrorMessage } from "@/lib/validation";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from "@/lib/ratelimit";

async function findPreferredResume(userId: string) {
  const include = {
    skills: true,
    experiences: {
      orderBy: [
        { endDate: "desc" as const },
        { startDate: "desc" as const },
        { id: "desc" as const },
      ],
      take: 3,
    },
  };

  const primaryResume = await prisma.resume.findFirst({
    where: { userId, isPrimary: true },
    include,
  });

  if (primaryResume) {
    return {
      resume: primaryResume,
      usedPrimaryResume: true,
    };
  }

  const latestResume = await prisma.resume.findFirst({
    where: { userId },
    include,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return {
    resume: latestResume,
    usedPrimaryResume: false,
  };
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous";
    const rateLimitResult = await checkRateLimit("ai", RATE_LIMITS.ai, ip);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many AI requests. Please wait before trying again." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      );
    }

    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    const payload = coverLetterRequestSchema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { resume: selectedResume, usedPrimaryResume } =
      await findPreferredResume(user.id);

    const userName = user.fullName || "Candidate";
    const userExperience = user.experience?.trim() || "";
    const userHeadline = user.headline?.trim() || "";
    const parsedResume = selectedResume?.parsedText?.trim() || "";

    const resumeSkills = (selectedResume?.skills ?? [])
      .map((skill) => skill.skillName?.trim())
      .filter((skill): skill is string => !!skill)
      .join(", ");

    const recentRole = selectedResume?.experiences?.[0];
    const experienceSummary =
      userExperience ||
      parsedResume.slice(0, 800) ||
      "Relevant professional experience";

    const candidateContext = `
CANDIDATE DATA (use ONLY this information):
- Name: ${userName}
- Professional Headline: ${userHeadline || "Professional"}
- Experience Summary: ${experienceSummary}
- Key Skills: ${resumeSkills || "Strong professional skills"}
${
  recentRole
    ? `- Current/Most Recent Role: ${recentRole.title}${recentRole.company ? ` at ${recentRole.company}` : ""}`
    : ""
}
`.trim();

    const prompt = `Write a professional cover letter for a ${payload.jobTitle} position at ${payload.companyName}.
${candidateContext}

JOB DETAILS:
${
  payload.jobDescription ||
  `The role of ${payload.jobTitle} at ${payload.companyName}. ${payload.companyName} is seeking a qualified candidate.`
}

WRITING RULES:
1. Start with a hook - NOT "I am writing to express my interest..."
2. Use specific examples from the candidate's experience
3. Connect candidate skills DIRECTLY to job requirements
4. Keep to 3-4 paragraphs, 250-350 words
5. Sound human - like someone actually excited about THIS job
6. Do NOT use generic phrases like "team player", "hard worker", "detail-oriented"
7. Do NOT invent skills or experiences not in the candidate data
8. ONE closing paragraph only - do not repeat "I look forward to discussing" or "I am confident" twice
9. Each paragraph must make a NEW point - no restating what was said in a previous paragraph
${payload.recipientName ? `10. Address to: ${payload.recipientName}` : ""}

Write ONLY the cover letter body. No preamble or explanation.`;

    const systemPrompt = `You are a career coach helping African job seekers write cover letters that stand out. Your letters are:
- Specific to the person and job (never generic templates)
- Honest - only use real skills/experience from the data provided
- Enthusiastic but professional, under 350 words
- Structured: opening hook → skills/experience → why this company → single clean closing
- Never repetitive: each paragraph makes exactly one new point, the closing line appears once only

Do NOT write generic cover letters that could apply to any job or person.`;

    const { text: coverLetter, model } = await generateWithFallback(
      prompt,
      systemPrompt,
      {
        maxTokens: 600,
        temperature: 0.65,
      },
    );

    const wordCount = coverLetter.trim().split(/\s+/).filter(Boolean).length;
    const hasGenericPhrases =
      /I am writing to express (my interest|this letter)/i.test(coverLetter);

    if (wordCount > 400 || hasGenericPhrases) {
      console.warn("Cover letter output may be too generic or too long", {
        wordCount,
        hasGenericPhrases,
        model,
      });
    }

    return NextResponse.json({
      success: true,
      coverLetter,
      model,
      stats: {
        wordCount,
        model,
        usedPrimaryResume,
        usedAnyResume: !!selectedResume,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: getZodErrorMessage(error) },
        { status: 400 },
      );
    }

    console.error("Error generating cover letter:", error);
    return NextResponse.json(
      { error: "Failed to generate cover letter" },
      { status: 500 },
    );
  }
}
