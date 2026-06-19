import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUserId } from "@/lib/auth";
import { generateWithFallback } from "@/lib/ai";
import { hasAiProviderConfigured } from "@/lib/env";

interface AnalysisResult {
  overall: {
    score: number;
    verdict: string;
    summary: string;
  };
  content: {
    score: number;
    issues: string[];
    strengths: string[];
  };
  style: {
    score: number;
    issues: string[];
    strengths: string[];
  };
  structure: {
    score: number;
    issues: string[];
    strengths: string[];
  };
  recommendations: string[];
}

function heuristicAnalysis(text: string): AnalysisResult {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = text.split("\n").filter(Boolean);
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(text);
  const hasName = lines.length > 0 && lines[0].length < 50 && lines[0].length > 2;
  const hasActionVerbs =
    /\b(led|managed|developed|created|implemented|increased|reduced|improved|designed|built|analyzed|coordinated|achieved|delivered)\b/i.test(
      text,
    );
  const hasQuantification =
    /\d+%|\d+x|\$\d+|\d+\s*(years?|months?|customers?|clients?|projects?|users?)/i.test(text);
  const hasBullets = /[•\-\*]\s/.test(text) || /^[\-\*]\s/m.test(text);
  const hasSections = /experience|education|skills|summary|objective/i.test(text);

  const contentScore = Math.min(
    100,
    Math.max(
      0,
      (hasEmail ? 25 : 0) +
        (hasName ? 10 : 0) +
        (hasActionVerbs ? 20 : 0) +
        (hasQuantification ? 20 : 0) +
        (words.length >= 200 ? 15 : words.length / 15) +
        (hasBullets ? 10 : 0),
    ),
  );

  let styleScore = 70;
  const styleIssues: string[] = [];
  const styleStrengths: string[] = [];
  if (words.length < 100) {
    styleIssues.push("CV is too short — aim for at least 300–500 words");
    styleScore -= 15;
  } else if (words.length > 1000) {
    styleIssues.push("CV is too long — keep it to 1–2 pages");
    styleScore -= 10;
  } else {
    styleStrengths.push("Good length for a professional CV");
  }
  if (!hasBullets && lines.length > 3) {
    styleIssues.push("Use bullet points for easy scanning");
    styleScore -= 10;
  } else if (hasBullets) {
    styleStrengths.push("Uses bullet points effectively");
  }
  if (/\b(was|were|been|being)\b.*\b(by)\b/i.test(text)) {
    styleIssues.push("Passive voice detected — use active voice for stronger impact");
    styleScore -= 5;
  } else {
    styleStrengths.push("Uses active voice");
  }
  styleScore = Math.max(0, Math.min(100, styleScore));

  let structureScore = 60;
  const structureIssues: string[] = [];
  const structureStrengths: string[] = [];
  if (!/summary|objective|profile|about/i.test(text)) {
    structureIssues.push("Missing professional summary");
    structureScore -= 10;
  } else {
    structureStrengths.push("Has professional summary");
  }
  if (!/experience|work\s*history|employment/i.test(text)) {
    structureIssues.push("Missing work experience section");
    structureScore -= 15;
  } else {
    structureStrengths.push("Has work experience section");
  }
  if (!/education|university|degree|certif/i.test(text)) {
    structureIssues.push("Missing education section");
    structureScore -= 10;
  } else {
    structureStrengths.push("Has education section");
  }
  if (!hasSections) {
    structureIssues.push("Missing skills section");
    structureScore -= 10;
  } else {
    structureStrengths.push("Has skills section");
  }
  if (paragraphs.length >= 3) structureStrengths.push("Well-organized sections");
  structureScore = Math.max(0, Math.min(100, structureScore));

  const contentIssues: string[] = [];
  const contentStrengths: string[] = [];
  if (hasActionVerbs) contentStrengths.push("Uses strong action verbs");
  else contentIssues.push("Start bullets with action verbs (Led, Built, Managed...)");
  if (hasQuantification) contentStrengths.push("Quantifies achievements with numbers");
  else contentIssues.push("Add numbers to achievements (e.g., 'Increased sales by 40%')");
  if (words.length >= 300) contentStrengths.push("Provides adequate detail");
  else contentIssues.push("Add more detail about responsibilities and achievements");

  const overallScore = Math.round((contentScore + styleScore + structureScore) / 3);
  let verdict = "Needs Attention";
  let summary = "Your CV requires revision to effectively market your skills.";
  if (overallScore >= 80) {
    verdict = "Strong CV";
    summary = "Your CV is well-structured and competitive. Minor tweaks can make it perfect.";
  } else if (overallScore >= 65) {
    verdict = "Good Foundation";
    summary = "Your CV is decent but has room for improvement in content and structure.";
  } else if (overallScore >= 50) {
    verdict = "Needs Work";
    summary = "Your CV needs significant improvements to be competitive in the job market.";
  }

  return {
    overall: { score: overallScore, verdict, summary },
    content: { score: Math.round(contentScore), issues: contentIssues, strengths: contentStrengths },
    style: { score: styleScore, issues: styleIssues, strengths: styleStrengths },
    structure: { score: structureScore, issues: structureIssues, strengths: structureStrengths },
    recommendations: [
      ...contentIssues.slice(0, 2),
      ...styleIssues.slice(0, 2),
      ...structureIssues.slice(0, 2),
      "Tailor your CV for each job application",
    ]
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 6),
  };
}

async function aiAnalysis(text: string): Promise<AnalysisResult> {
  const cvExcerpt = text.substring(0, 4000);
  const prompt = `Analyze this CV and return a detailed quality assessment. Be specific and actionable.

CV TEXT:
${cvExcerpt}

Return ONLY this JSON (no markdown, no explanation):
{
  "overall": {
    "score": <0-100 integer>,
    "verdict": "<Strong CV|Good Foundation|Needs Work|Needs Attention>",
    "summary": "<2-3 sentence honest assessment>"
  },
  "content": {
    "score": <0-100 integer>,
    "issues": ["<specific issue 1>", "<specific issue 2>"],
    "strengths": ["<specific strength 1>", "<specific strength 2>"]
  },
  "style": {
    "score": <0-100 integer>,
    "issues": ["<specific issue 1>"],
    "strengths": ["<specific strength 1>"]
  },
  "structure": {
    "score": <0-100 integer>,
    "issues": ["<specific issue 1>"],
    "strengths": ["<specific strength 1>"]
  },
  "recommendations": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>", "<actionable tip 4>"]
}`;

  const { text: aiText } = await generateWithFallback(
    prompt,
    "You are an expert CV reviewer for African job markets. Return ONLY valid JSON.",
    { maxTokens: 700, temperature: 0.3 },
  );

  const jsonMatch = aiText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI returned no JSON");

  const parsed = JSON.parse(jsonMatch[0]) as AnalysisResult;
  // Clamp scores
  parsed.overall.score = Math.max(0, Math.min(100, parsed.overall.score));
  parsed.content.score = Math.max(0, Math.min(100, parsed.content.score));
  parsed.style.score = Math.max(0, Math.min(100, parsed.style.score));
  parsed.structure.score = Math.max(0, Math.min(100, parsed.structure.score));
  return parsed;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getDbUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let extractedText = "";
    let resumeId: string | null = null;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      resumeId = body.resumeId || null;

      if (resumeId) {
        const resume = await prisma.resume.findFirst({
          where: { id: resumeId, userId },
        });
        if (resume?.parsedText) extractedText = resume.parsedText;
      }
    } else {
      const formData = await request.formData();
      resumeId = (formData.get("resumeId") as string | null) || null;
      const file = formData.get("file") as File | null;

      if (resumeId) {
        const resume = await prisma.resume.findFirst({
          where: { id: resumeId, userId },
        });
        if (resume?.parsedText) extractedText = resume.parsedText;
      }

      if (!extractedText && file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uint8Array = new Uint8Array(buffer);
        try {
          const { getDocumentProxy, extractText } = await import("unpdf");
          const pdf = await getDocumentProxy(uint8Array);
          const { text } = await extractText(pdf, { mergePages: true });
          extractedText = text;
        } catch {
          extractedText = buffer.toString("utf-8").slice(0, 10000);
        }
      }
    }

    if (!extractedText) {
      return NextResponse.json({ error: "No CV content to analyze" }, { status: 400 });
    }

    let analysis: AnalysisResult;
    let aiPowered = false;

    if (hasAiProviderConfigured()) {
      try {
        analysis = await aiAnalysis(extractedText);
        aiPowered = true;
      } catch (err) {
        console.error("AI CV analysis failed, falling back to heuristics:", err);
        analysis = heuristicAnalysis(extractedText);
      }
    } else {
      analysis = heuristicAnalysis(extractedText);
    }

    return NextResponse.json({ success: true, analysis, aiPowered });
  } catch (error) {
    console.error("CV analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze CV" }, { status: 500 });
  }
}
