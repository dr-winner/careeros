import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { generatePremium } from "@/lib/ai";
import { hasAiProviderConfigured } from "@/lib/env";

export interface StructuredCV {
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    bullets: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  skills: string[];
  certifications?: string[];
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

    const prompt = `Rewrite this CV to be ATS-optimised with strong action verbs and quantified achievements. Tailor it for ${role || "general job applications"}.

CV TEXT:
${cvText}

Return ONLY valid JSON — no markdown, no explanation:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+XX XXX XXX XXXX",
  "location": "City, Country",
  "summary": "2-3 sentence compelling professional summary with specific expertise and value proposition",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Month Year – Month Year",
      "bullets": [
        "Achieved X by doing Y, resulting in Z% improvement",
        "Led initiative that delivered specific measurable outcome"
      ]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "Institution Name",
      "year": "YYYY"
    }
  ],
  "skills": ["Skill1", "Skill2", "Skill3"],
  "certifications": ["Certification Name (Year)"]
}`;

    const { text } = await generatePremium(
      prompt,
      "You are an expert CV writer for the African job market. Rewrite CVs to be ATS-friendly with strong action verbs and quantified achievements. Return ONLY valid JSON — no markdown, no commentary.",
      { maxTokens: 2048, temperature: 0.4, json: true },
    );

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse CV structure" }, { status: 500 });
    }

    const cvData: StructuredCV = JSON.parse(jsonMatch[0]);

    if (!cvData.name || !cvData.experience) {
      return NextResponse.json({ error: "Invalid CV structure returned" }, { status: 500 });
    }

    return NextResponse.json({ success: true, cvData });
  } catch (error) {
    console.error("CV regeneration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate CV" },
      { status: 500 },
    );
  }
}
