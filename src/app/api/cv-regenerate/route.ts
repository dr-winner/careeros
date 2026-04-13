import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";
import { isUserPremium } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readEnv } from "@/lib/env";

const groqApiKey = readEnv("GROQ_API_KEY");

const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

interface CVData {
  name?: string;
  email?: string;
  phone?: string;
  summary?: string;
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
  
  const experienceSection = text.match(/experience|work history|employment/i);
  const skillsSection = text.match(/skills|technologies|tools|competencies/i);
  
  const experience: CVData["experience"] = [];
  const education: CVData["education"] = [];
  const skills: string[] = [];
  
  if (experienceSection) {
    const expMatch = text.match(/([A-Z][^0-9]+?)(?:at|@|,)\s*([A-Z][^,]+?)(?:,|\n)([^•\n]+)/gi);
    if (expMatch) {
      expMatch.forEach(match => {
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
  
  if (skillsSection) {
    const skillsMatch = text.match(/skills[:\s]+([^\n]+)/i);
    if (skillsMatch) {
      skills.push(...skillsMatch[1].split(/[,;•]/).map(s => s.trim()).filter(Boolean));
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

async function regenerateCV(cvText: string, cvData: CVData, role?: string): Promise<string> {
  const prompt = `You are a professional CV writer. Rewrite the following CV content to be:
1. ATS-optimized (use keywords from job descriptions)
2. Written with strong action verbs (Led, Managed, Developed, Implemented, Increased, Reduced, Improved)
3. Quantified achievements where possible (%, numbers, scale)
4. Clean and professional structure
5. Tailored for ${role || "general job applications"}

Current CV Content:
${cvText}

Extracted Info:
- Name: ${cvData.name || "Not found"}
- Email: ${cvData.email || "Not found"}
- Phone: ${cvData.phone || "Not found"}

Please provide a fully rewritten CV in this exact format:

---
[Full Name]
[Email] | [Phone] | [Location]

PROFESSIONAL SUMMARY
[2-3 sentence compelling summary of qualifications]

WORK EXPERIENCE

[Job Title] | [Company Name] | [Duration]
• [Achievement with metrics where possible]
• [Achievement with impact]
• [Achievement]

[Repeat for each position...]

EDUCATION

[Degree] | [Institution] | [Year]

SKILLS
[Technical skills], [Tools], [Soft skills]
---

Make it concise, powerful, and tailored for ${role || "job applications"}.`;

  const completion = await groq!.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are an expert CV writer. Create professional, ATS-friendly CVs.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "llama-3.1-8b-instant",
    temperature: 0.7,
    max_tokens: 2048,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content received from Groq API");
  }
  return content;
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
        { status: 403 }
      );
    }

    const body = await request.json();
    const { cvText, role } = body;

    if (!cvText) {
      return NextResponse.json({ error: "No CV text provided" }, { status: 400 });
    }

    if (!groq) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    console.log("CV Regeneration - Processing CV with role:", role);
    const cvData = extractCVData(cvText);
    const regeneratedCV = await regenerateCV(cvText, cvData, role);

    return NextResponse.json({
      success: true,
      regeneratedCV,
      extractedData: cvData,
    });

  } catch (error) {
    console.error("CV regeneration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate CV" },
      { status: 500 }
    );
  }
}
