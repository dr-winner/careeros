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

    const prompt = `Rewrite the following CV text. Tailor the content and skills selection specifically for the target role: "${role || "general job applications"}".
Ensure the resulting experience bullets are robust, professional, and completely free of AI-style writing templates.

CV TEXT:
${cvText}

Return ONLY valid JSON using this format:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+XX XXX XXX XXXX",
  "location": "City, Country",
  "summary": "A 2-3 sentence grounded, professional summary highlighting specific technical/domain expertise and key value proposition. Avoid generic buzzwords.",
  "experience": [
    {
      "title": "Exact Job Title",
      "company": "Company Name",
      "duration": "Month Year – Month Year (or Present)",
      "bullets": [
        "First professional achievement/responsibility bullet using strong action verb and naming specific tech/tools used.",
        "Second professional achievement/responsibility bullet."
      ]
    }
  ],
  "education": [
    {
      "degree": "Degree Name (e.g., BSc in Computer Science)",
      "institution": "Institution Name",
      "year": "YYYY"
    }
  ],
  "skills": ["Skill1", "Skill2", "Skill3"],
  "certifications": ["Certification Name (Year)"]
}`;

    const systemPrompt = `You are a world-class professional CV writer and elite resume coach. Your goal is to rewrite the candidate's CV text into a polished, high-fidelity, industry-approved professional CV format.

CRITICAL INSTRUCTIONS FOR PROFESSIONAL COPYWRITING:
1. NO AI CLICHÉS OR BUZZWORDS: Strictly avoid generic, robotic, or hyperbolic phrases such as "results-driven visionary," "proven track record of success," "passionate developer," "seamless orchestration," "leveraged cutting-edge paradigms," "fostered synergy," or "spearheaded transformation." 
2. BE CONCISE AND DIRECT: Write in a grounded, professional, and action-oriented tone. Describe work objectively. Start bullet points with strong, precise, and active verbs (e.g., "Developed," "Designed," "Built," "Managed," "Led," "Created," "Analyzed," "Optimized," "Reduced," "Negotiated").
3. DO NOT FABRICATE METRICS: Only quantify achievements if the candidate's input text provides numbers, percentages, or concrete metrics. If there are no numbers in the source text, do NOT make up fake percentages (e.g., do not write "improved efficiency by 35%" if the user did not say so). Instead, write clear statements of what was accomplished, the technologies or methodologies used, and the direct business or technical outcomes.
4. ACTION-CONTEXT-RESULT STRUCTURE: Write work experience bullet points using the ACR (Action-Context-Result) format: tell exactly what the candidate did, what context or tools they used (e.g., specific libraries, frameworks, or databases), and the direct outcome.
5. TECH STACKS IN CONTEXT: Naturally include tools, frameworks, and methodologies inside the bullet points of each role (e.g., "...using React, TypeScript, and AWS to ensure stable deployments").
6. ACCURATE PARSING: Maintain the user's name, email, phone, location, education history, and certifications exactly as provided, but clean up formatting.

Return ONLY valid JSON corresponding to the schema — no markdown wrapper, no conversational text, and no commentary.`;

    const { text } = await generatePremium(
      prompt,
      systemPrompt,
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
