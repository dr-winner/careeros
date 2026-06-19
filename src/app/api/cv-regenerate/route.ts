import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { generateWithFallback } from "@/lib/ai";
import { hasAiProviderConfigured } from "@/lib/env";

interface CVData {
  name?: string;
  email?: string;
  phone?: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  skills: string[];
}

function extractCVData(text: string): CVData {
  const lines = text.split("\n").filter(Boolean);
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = text.match(/\+?[\d\s()-]{10,}/);
  const experience: CVData["experience"] = [];
  const education: CVData["education"] = [];
  const skills: string[] = [];

  if (/experience|work history|employment/i.test(text)) {
    const expMatch = text.match(/([A-Z][^0-9]+?)(?:at|@|,)\s*([A-Z][^,]+?)(?:,|\n)([^•\n]+)/gi);
    if (expMatch) {
      expMatch.forEach((match) => {
        const parts = match.split(/\n|,/).filter(Boolean);
        if (parts.length >= 2) {
          experience.push({
            title: parts[0]?.trim() || "",
            company: parts[1]?.trim() || "",
            duration: "",
            description: parts.slice(2).join(" ").trim() || "",
          });
        }
      });
    }
  }

  if (/skills|technologies|tools|competencies/i.test(text)) {
    const skillsMatch = text.match(/skills[:\s]+([^\n]+)/i);
    if (skillsMatch) {
      skills.push(...skillsMatch[1].split(/[,;•]/).map((s) => s.trim()).filter(Boolean));
    }
  }

  return {
    name: lines[0] || "",
    email: emailMatch?.[0],
    phone: phoneMatch?.[0],
    experience,
    education,
    skills,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { isPremium: true },
    });

    if (!dbUser?.isPremium) {
      return NextResponse.json(
        { error: "Premium subscription required", code: "PREMIUM_REQUIRED" },
        { status: 403 },
      );
    }

    if (!hasAiProviderConfigured()) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { cvText, role } = body;

    if (!cvText) {
      return NextResponse.json({ error: "No CV text provided" }, { status: 400 });
    }

    const cvData = extractCVData(cvText);

    const prompt = `Rewrite this CV to be ATS-optimised with strong action verbs, quantified achievements, and a clean structure. Tailor it for ${role || "general job applications"}.

CV:
${cvText}

Contact info: ${[cvData.email, cvData.phone].filter(Boolean).join(" | ") || "extract from CV above"}

Return the full rewritten CV in this format:

---
[Full Name]
[Email] | [Phone] | [Location]

PROFESSIONAL SUMMARY
[2-3 sentence compelling summary]

WORK EXPERIENCE

[Job Title] | [Company] | [Duration]
• [Achievement with metrics]
• [Achievement with impact]

EDUCATION

[Degree] | [Institution] | [Year]

SKILLS
[Technical skills], [Tools], [Soft skills]
---`;

    const { text: regeneratedCV } = await generateWithFallback(
      prompt,
      "You are an expert CV writer. Create professional, ATS-friendly CVs. Return only the CV content.",
      { maxTokens: 2048, temperature: 0.7 },
    );

    return NextResponse.json({ success: true, regeneratedCV, extractedData: cvData });
  } catch (error) {
    console.error("CV regeneration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate CV" },
      { status: 500 },
    );
  }
}
