import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateWithFallback } from "@/lib/ai";
import { mockInterviewSchema, getZodErrorMessage } from "@/lib/validation";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from "@/lib/ratelimit";
import { getDbUser } from "@/lib/auth";
import { claimQuota, releaseQuota } from "@/lib/quota";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  let refund: (() => Promise<void>) | null = null;

  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Per-user keying — mobile carrier NAT makes IP keying unfair here.
    const rateLimitResult = await checkRateLimit("ai", RATE_LIMITS.ai, clerkId);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many AI requests. Please wait before trying again." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      );
    }

    const body = await request.json();
    const payload = mockInterviewSchema.parse(body);

    const { action, role, experienceLevel, history, currentQuestion, userResponse } = payload;

    // Mock interviews are sold as a Premium feature. Free users spend one
    // monthly AI credit per session (claimed at "start"); follow-up turns
    // and feedback inside that session are free so a session is never
    // cut off mid-conversation.
    if (action === "start") {
      const dbUser = await getDbUser();
      if (!dbUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const quota = await claimQuota(dbUser.id, dbUser.isPremium);
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: "quota_exceeded",
            message: `Free plan includes ${quota.limit} AI credits per month. Upgrade to Premium for unlimited mock interviews.`,
            resetAt: quota.resetAt,
          },
          { status: 402 },
        );
      }
      if (!dbUser.isPremium) {
        refund = () => releaseQuota(dbUser.id, false);
      }
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "start") {
      systemPrompt = `You are an expert interviewer for a ${role} position (${experienceLevel || "Mid-level"}). 
      Your goal is to conduct a realistic, professional, and challenging mock interview.
      Start by welcoming the candidate and asking a first, common opening question for this role.
      Keep your response concise and professional.`;
      userPrompt = `I am ready for my mock interview for the ${role} position. Please start.`;
    } else if (action === "respond") {
      systemPrompt = `You are an expert interviewer for a ${role} position. 
      You are in the middle of a mock interview. 
      Review the conversation history and the candidate's last response.
      Acknowledge their answer briefly and ask the NEXT logical interview question.
      Mix behavioral, technical, and situational questions.
      Keep your response concise and professional.`;
      userPrompt = `History: ${JSON.stringify(history)}`;
    } else if (action === "feedback") {
      systemPrompt = `You are an expert interview coach for ${role} positions. Return ONLY valid JSON — no markdown, no explanation.`;
      userPrompt = `Interview question: "${currentQuestion}"
Candidate's answer: "${userResponse}"

Return this JSON:
{
  "score": <integer 1-10>,
  "strengths": ["<specific strength from their actual answer>"],
  "weaknesses": ["<specific gap in their actual answer>"],
  "improvementTips": ["<concrete, actionable tip>"],
  "betterSampleAnswer": "<a complete, specific sample answer — NO placeholders like [mention X], write actual example content>"
}`;
    }

    let text: string;
    try {
      ({ text } = await generateWithFallback(userPrompt, systemPrompt, {
        temperature: action === "feedback" ? 0.3 : 0.7,
        json: action === "feedback",
      }));
    } catch (aiError) {
      if (refund) await refund().catch(() => {});
      throw aiError;
    }

    if (action === "feedback") {
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const feedbackJson = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        if (!feedbackJson?.score) throw new Error("Invalid feedback JSON");
        return NextResponse.json(feedbackJson);
      } catch {
        return NextResponse.json({ error: "Failed to parse feedback" }, { status: 500 });
      }
    }

    return NextResponse.json({ text });

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: getZodErrorMessage(error) }, { status: 400 });
    }
    console.error("Interview API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
