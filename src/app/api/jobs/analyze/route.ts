import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

interface JobAnalysis {
  id: string;
  userId: string;
  jobId: string;
  fitScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  verdict: "Strong Match" | "Good Fit" | "Partial Match" | "Reach Position";
}

const SKILL_KEYWORDS: Record<string, string[]> = {
  "JavaScript": ["javascript", "js", "ecmascript"],
  "TypeScript": ["typescript", "ts"],
  "React": ["react", "reactjs", "react.js"],
  "Node.js": ["node", "nodejs", "node.js", "express"],
  "Python": ["python", "django", "flask"],
  "Java": ["java", "spring", "springboot"],
  "SQL": ["sql", "mysql", "postgresql", "postgres"],
  "AWS": ["aws", "amazon web services", "ec2", "s3", "lambda"],
  "Azure": ["azure", "microsoft azure"],
  "Docker": ["docker", "container", "kubernetes", "k8s"],
  "Git": ["git", "github", "gitlab", "version control"],
  "Data Analysis": ["data analysis", "analytics", "pandas", "numpy"],
  "Machine Learning": ["machine learning", "ml", "ai", "tensorflow", "pytorch"],
  "Communication": ["communication", "stakeholder", "presentation"],
  "Leadership": ["leadership", "team lead", "mentoring"],
};

function extractSkills(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foundSkills: string[] = [];

  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      foundSkills.push(skill);
    }
  }

  return foundSkills;
}

function calculateFitScore(userSkills: string[], jobDescription: string): {
  score: number;
  matched: string[];
  missing: string[];
  confidence: "high" | "medium" | "low";
} {
  const jobSkills = extractSkills(jobDescription);
  
  if (jobSkills.length === 0) {
    return { score: 50, matched: [], missing: [], confidence: "low" };
  }
  
  const matched = userSkills.filter(skill =>
    jobSkills.some(jobSkill =>
      jobSkill.toLowerCase() === skill.toLowerCase() ||
      skill.toLowerCase().includes(jobSkill.toLowerCase()) ||
      jobSkill.toLowerCase().includes(skill.toLowerCase())
    )
  );

  const missing = jobSkills.filter(skill =>
    !matched.some(m => m.toLowerCase() === skill.toLowerCase())
  );

  const score = Math.round((matched.length / jobSkills.length) * 100);
  
  const confidence = jobSkills.length >= 5 ? "high" : jobSkills.length >= 3 ? "medium" : "low";

  return { score, matched, missing, confidence };
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, jobDescription } = await request.json();

    if (!jobId || !jobDescription) {
      return NextResponse.json(
        { error: "Job ID and description required" },
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

    const userSkills = [
      ...(user?.headline ? extractSkills(user.headline) : []),
      ...(user?.experience ? extractSkills(user.experience) : []),
      ...(user?.resumes[0]?.skills?.map((s: { skillName: string }) => s.skillName) || []),
    ];

    const uniqueSkills = [...new Set(userSkills)];

    const { score, matched, missing, confidence } = calculateFitScore(uniqueSkills, jobDescription);

    let verdict: JobAnalysis["verdict"];
    if (score >= 80) verdict = "Strong Match";
    else if (score >= 60) verdict = "Good Fit";
    else if (score >= 40) verdict = "Partial Match";
    else verdict = "Reach Position";

    const analysis: Omit<JobAnalysis, "id"> & { confidence: string } = {
      userId,
      jobId,
      fitScore: score,
      matchedSkills: matched,
      missingSkills: missing,
      strengths: matched.map(s => `You have experience with ${s}`),
      gaps: missing.map(s => `Consider learning ${s}`),
      verdict,
      confidence,
    };

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Error analyzing job fit:", error);
    return NextResponse.json(
      { error: "Failed to analyze job fit" },
      { status: 500 }
    );
  }
}
