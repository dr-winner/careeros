import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateWithFallback } from "@/lib/ai";
import { mockInterviewSchema, getZodErrorMessage } from "@/lib/validation";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from "@/lib/ratelimit";
import { ZodError } from "zod";

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

    const body = await request.json();
    const payload = mockInterviewSchema.parse(body);

    const { action, role, experienceLevel, history, currentQuestion, userResponse } = payload;

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
      systemPrompt = `You are an expert interview coach. 
      Analyze the candidate's response to the following interview question for a ${role} position.
      Question: "${currentQuestion}"
      Candidate's Answer: "${userResponse}"
      
      Provide constructive feedback in the following JSON format:
      {
        "score": number (1-10),
        "strengths": string[],
        "weaknesses": string[],
        "improvementTips": string[],
        "betterSampleAnswer": string
      }`;
      userPrompt = `Please provide feedback on my answer.`;
    }

    const { text } = await generateWithFallback(userPrompt, systemPrompt, {
      temperature: action === "feedback" ? 0.3 : 0.7,
    });

    if (action === "feedback") {
      try {
        // Try to parse the JSON if it's feedback action
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const feedbackJson = jsonMatch ? JSON.parse(jsonMatch[0]) : { text };
        return NextResponse.json(feedbackJson);
      } catch (e) {
        return NextResponse.json({ feedback: text });
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
