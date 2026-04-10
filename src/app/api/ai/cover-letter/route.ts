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
          include: { skills: true },
        },
      },
    });

    const userName = user?.fullName || "Candidate";
    const userEmail = user?.email || "";
    const userPhone = user?.phone || "";
    const userExperience = user?.experience || "";
    const userHeadline = user?.headline || "";
    const parsedResume = user?.resumes[0]?.parsedText || "";
    const skillsList = user?.resumes[0]?.skills || [];
    const resumeSkills = skillsList
      .map((s: { skillName: string }) => s.skillName)
      .join(", ");

    const prompt = `Write a professional cover letter for a ${jobTitle} position at ${companyName}.

Candidate Information:
- Name: ${userName}
- Email: ${userEmail}
- Phone: ${userPhone}
- Professional Headline: ${userHeadline}
- Experience: ${userExperience || parsedResume.substring(0, 500) || "Relevant professional experience"}
- Key Skills: ${resumeSkills || "Strong professional skills"}

Job Description:
${jobDescription || `The role of ${jobTitle} at ${companyName}.`}

Requirements:
1. Professional business letter format
2. 3-4 paragraphs
3. Highlight relevant skills and experience
4. Show enthusiasm for the company
5. End with call to action
${recipientName ? `6. Address to: ${recipientName}` : ""}

Write ONLY the cover letter content, no preamble.`;

    const systemPrompt = "You are a professional career coach and cover letter writer. Write compelling, personalized cover letters.";

    const { text: coverLetter, model } = await generateWithFallback(prompt, systemPrompt, {
      maxTokens: 800,
      temperature: 0.7,
    });

    return NextResponse.json({
      success: true,
      coverLetter,
      model,
    });
  } catch (error) {
    console.error("Error generating cover letter:", error);
    return NextResponse.json(
      { error: "Failed to generate cover letter" },
      { status: 500 }
    );
  }
}
