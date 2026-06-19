import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUserId } from "@/lib/auth";

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

function analyzeCVContent(text: string): AnalysisResult {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = text.split("\n").filter(Boolean);
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  
  const hasContact = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/.test(text) || /@[\w.]+/.test(text);
  const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(text);
  const hasName = lines.length > 0 && lines[0].length < 50 && lines[0].length > 2;
  
  const actionVerbs = ["led", "managed", "developed", "created", "implemented", "increased", "reduced", "improved", "designed", "built", "analyzed", "coordinated", "achieved", "delivered"];
  const hasActionVerbs = actionVerbs.some(verb => new RegExp(`\\b${verb}\\b`, "i").test(text));
  
  const hasQuantification = /\d+%|\d+x|\$\d+|\d+\s*(years?|months?|customers?|clients?|projects?|users?)/i.test(text);
  
  const hasBullets = /[•\-\*]\s/.test(text) || /^[\-\*]\s/m.test(text);
  const hasSections = /experience|education|skills|summary|objective/i.test(text);
  
  const contentScore = Math.min(100, Math.max(0, 
    (hasContact ? 15 : 0) + 
    (hasEmail ? 10 : 0) + 
    (hasName ? 10 : 0) + 
    (hasActionVerbs ? 20 : 0) + 
    (hasQuantification ? 15 : 0) + 
    (words.length >= 200 ? 15 : words.length / 15) +
    (hasBullets ? 10 : 0) +
    (hasSections ? 5 : 0)
  ));
  
  const styleIssues: string[] = [];
  const styleStrengths: string[] = [];
  let styleScore = 70;
  
  if (words.length < 100) {
    styleIssues.push("CV is too short - aim for at least 300-500 words");
    styleScore -= 15;
  } else if (words.length > 1000) {
    styleIssues.push("CV is too long - keep it to 1-2 pages maximum");
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
  
  const longSentences = text.split(/[.!?]+/).filter(s => s.trim().split(/\s+/).length > 25);
  if (longSentences.length > 3) {
    styleIssues.push("Some sentences are too long - keep them concise");
    styleScore -= 5;
  }
  
  const hasPassiveVoice = /\b(was|were|been|being)\b.*\b(by)\b/i.test(text);
  if (hasPassiveVoice) {
    styleIssues.push("Uses passive voice - try active voice for stronger impact");
    styleScore -= 5;
  } else {
    styleStrengths.push("Uses active voice");
  }
  
  const hasTypos = /\b(teh|recieve|occured|seperate|definately)\b/i.test(text);
  if (hasTypos) {
    styleIssues.push("Possible spelling errors detected - proof carefully");
    styleScore -= 10;
  }
  
  styleScore = Math.max(0, Math.min(100, styleScore));
  
  const structureIssues: string[] = [];
  const structureStrengths: string[] = [];
  let structureScore = 60;
  
  const hasSummary = /summary|objective|profile|about/i.test(text);
  if (!hasSummary) {
    structureIssues.push("Missing professional summary or objective");
    structureScore -= 10;
  } else {
    structureStrengths.push("Has professional summary");
  }
  
  const hasExperience = /experience|work\s*history|employment/i.test(text);
  if (!hasExperience) {
    structureIssues.push("Missing work experience section");
    structureScore -= 15;
  } else {
    structureStrengths.push("Has work experience section");
  }
  
  const hasEducation = /education|academic|university|degree|certif/i.test(text);
  if (!hasEducation) {
    structureIssues.push("Missing education section");
    structureScore -= 10;
  } else {
    structureStrengths.push("Has education section");
  }
  
  const hasSkills = /skills|competencies|technologies|tools/i.test(text);
  if (!hasSkills) {
    structureIssues.push("Missing skills section");
    structureScore -= 10;
  } else {
    structureStrengths.push("Has skills section");
  }
  
  if (paragraphs.length < 3) {
    structureIssues.push("CV lacks clear section organization");
    structureScore -= 5;
  } else {
    structureStrengths.push("Well-organized sections");
  }
  
  structureScore = Math.max(0, Math.min(100, structureScore));
  
  const contentIssues: string[] = [];
  const contentStrengths: string[] = [];
  
  if (hasActionVerbs) {
    contentStrengths.push("Uses strong action verbs");
  } else {
    contentIssues.push("Start bullet points with action verbs (Led, Managed, Developed...)");
  }
  
  if (hasQuantification) {
    contentStrengths.push("Quantifies achievements with numbers");
  } else {
    contentIssues.push("Add numbers to achievements (e.g., 'Increased sales by 40%')");
  }
  
  if (words.length >= 300) {
    contentStrengths.push("Provides adequate detail");
  } else {
    contentIssues.push("Add more detail about your responsibilities and achievements");
  }
  
  const hasKeywords = /software|development|management|analysis|project|team/i.test(text);
  if (hasKeywords) {
    contentStrengths.push("Includes relevant industry keywords");
  }
  
  const overallScore = Math.round((contentScore + styleScore + structureScore) / 3);
  
  let verdict = "Needs Work";
  let summary = "Your CV has several areas that need improvement.";
  
  if (overallScore >= 80) {
    verdict = "Strong CV";
    summary = "Your CV is well-structured and competitive. Minor tweaks can make it perfect.";
  } else if (overallScore >= 65) {
    verdict = "Good Foundation";
    summary = "Your CV is decent but has room for improvement in content and structure.";
  } else if (overallScore >= 50) {
    verdict = "Needs Work";
    summary = "Your CV needs significant improvements to be competitive in the job market.";
  } else {
    verdict = "Needs Attention";
    summary = "Your CV requires substantial revision to effectively market your skills.";
  }
  
  const recommendations = [
    ...contentIssues.slice(0, 2),
    ...styleIssues.slice(0, 2),
    ...structureIssues.slice(0, 2),
    "Tailor your CV for each job application",
    "Use keywords from the job description",
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6);
  
  return {
    overall: {
      score: overallScore,
      verdict,
      summary,
    },
    content: {
      score: Math.round(contentScore),
      issues: contentIssues,
      strengths: contentStrengths,
    },
    style: {
      score: Math.round(styleScore),
      issues: styleIssues,
      strengths: styleStrengths,
    },
    structure: {
      score: Math.round(structureScore),
      issues: structureIssues,
      strengths: structureStrengths,
    },
    recommendations,
  };
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getDbUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { resumeId } = body;

    let extractedText = "";

    if (resumeId) {
      const resume = await prisma.resume.findFirst({
        where: { id: resumeId, userId },
      });

      if (resume?.parsedText) {
        extractedText = resume.parsedText;
      }
    }

    if (!extractedText) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uint8Array = new Uint8Array(buffer);

        try {
          const { getDocumentProxy, extractText } = await import("unpdf");
          const pdf = await getDocumentProxy(uint8Array);
          const { text } = await extractText(pdf, { mergePages: true });
          extractedText = text;
        } catch (pdfError) {
          console.error("PDF extraction error:", pdfError);
          extractedText = buffer.toString("utf-8").slice(0, 10000);
        }
      }
    }

    if (!extractedText) {
      return NextResponse.json({ error: "No CV content to analyze" }, { status: 400 });
    }

    const analysis = analyzeCVContent(extractedText);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze CV" },
      { status: 500 }
    );
  }
}
