import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";
import { readEnv } from "@/lib/env";

const groqApiKey = readEnv("GROQ_API_KEY");

const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

interface CVAnalysis {
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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { question, analysis } = body as { question: string; analysis: CVAnalysis };

    if (!question || !analysis) {
      return NextResponse.json({ error: "Missing question or analysis" }, { status: 400 });
    }

    if (!groq) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    const prompt = `You are an expert CV advisor. A user has just had their CV analyzed and has a question about their results.

CV Analysis Summary:
- Overall Score: ${analysis.overall.score}%
- Verdict: ${analysis.overall.verdict}
- Summary: ${analysis.overall.summary}

Content Analysis:
- Score: ${analysis.content.score}%
- Issues: ${analysis.content.issues.join(", ")}
- Strengths: ${analysis.content.strengths.join(", ")}

Style Analysis:
- Score: ${analysis.style.score}%
- Issues: ${analysis.style.issues.join(", ")}
- Strengths: ${analysis.style.strengths.join(", ")}

Structure Analysis:
- Score: ${analysis.structure.score}%
- Issues: ${analysis.structure.issues.join(", ")}
- Strengths: ${analysis.structure.strengths.join(", ")}

User's Question: ${question}

Please provide a helpful, actionable answer that:
1. Addresses their specific question
2. Gives concrete advice they can implement
3. Is encouraging but honest
4. Mentions specific examples or improvements when relevant

Keep your response concise but informative (2-4 sentences).`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert CV advisor helping users improve their resumes.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 512,
    });

    const answer = completion.choices[0]?.message?.content || "I couldn't generate an answer. Please try again.";

    return NextResponse.json({ answer });

  } catch (error) {
    console.error("CV question error:", error);
    return NextResponse.json(
      { error: "Failed to answer question" },
      { status: 500 }
    );
  }
}
