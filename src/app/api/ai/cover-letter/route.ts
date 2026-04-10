import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { generateWithFallback } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY && !process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    const { jobTitle, companyName, jobDescription, recipientName } = await request.json();

    if (!jobTitle || !companyName) {
      return NextResponse.json(
        { error: "Job title and company name required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        resumes: {
          where: { isPrimary: true },
          take: 1,
          include: { skills: true, experiences: true },
        },
      },
    });

    const userName = user?.fullName || "Candidate";
    const userExperience = user?.experience || "";
    const userHeadline = user?.headline || "";
    const parsedResume = user?.resumes[0]?.parsedText || "";
    const skillsList = user?.resumes[0]?.skills || [];
    const resumeSkills = skillsList
      .map((s: { skillName: string }) => s.skillName)
      .join(", ");

    const recentRole = user?.resumes[0]?.experiences?.[0];
    const candidateContext = `
CANDIDATE DATA (use ONLY this information):
- Name: ${userName}
- Professional Headline: ${userHeadline || "Professional"}
- Experience Summary: ${userExperience || parsedResume.substring(0, 800) || "Relevant professional experience"}
- Key Skills: ${resumeSkills || "Strong professional skills"}
${recentRole ? `- Current/Most Recent Role: ${recentRole.title}${recentRole.company ? ` at ${recentRole.company}` : ""}` : ""}`;

    const prompt = `Write a professional cover letter for a ${jobTitle} position at ${companyName}.
${candidateContext}

JOB DETAILS:
${jobDescription || `The role of ${jobTitle} at ${companyName}. ${companyName} is seeking a qualified candidate.`}

WRITING RULES:
1. Start with a hook - NOT "I am writing to express my interest..."
2. Use specific examples from the candidate's experience
3. Connect candidate skills DIRECTLY to job requirements
4. Keep to 3-4 paragraphs, 250-350 words
5. Sound human - like someone actually excited about THIS job
6. Do NOT use generic phrases like "team player", "hard worker", "detail-oriented"
7. Do NOT invent skills or experiences not in the candidate data
${recipientName ? `8. Address to: ${recipientName}` : ""}

Write ONLY the cover letter. No preamble or explanation.`;

    const systemPrompt = `You are a career coach helping African job seekers. You write cover letters that are:
- Specific to the person and job (never generic templates)
- Honest - only use real skills/experience from the data provided
- Enthusiastic but professional
- Under 350 words

Do NOT write generic cover letters that could apply to any job or person.`;

    const { text: coverLetter, model } = await generateWithFallback(prompt, systemPrompt, {
      maxTokens: 600,
      temperature: 0.65,
    });

    const wordCount = coverLetter.split(/\s+/).length;
    const hasGenericPhrases = /I am writing to express (my interest|this letter)/i.test(coverLetter);
    
    if (wordCount > 400 || hasGenericPhrases) {
      console.warn("Cover letter may be too generic or long, consider regenerating");
    }

    return NextResponse.json({
      success: true,
      coverLetter,
      model,
      stats: { wordCount, model },
    });
  } catch (error) {
    console.error("Error generating cover letter:", error);
    return NextResponse.json(
      { error: "Failed to generate cover letter" },
      { status: 500 }
    );
  }
}
