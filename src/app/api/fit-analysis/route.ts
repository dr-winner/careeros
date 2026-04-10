import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

interface FitAnalysisResult {
  fitScore: number;
  verdict: string;
  strengthsSummary: string;
  gapsSummary: string;
  riskSummary: string;
}

function calculateFitScore(
  userSkills: string[],
  jobRequirements: string[],
  experience: string | null
): FitAnalysisResult {
  const userSkillsLower = userSkills.map((s) => s.toLowerCase());
  const jobReqsLower = jobRequirements.map((r) => r.toLowerCase());

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const req of jobReqsLower) {
    const skillMatch = userSkillsLower.find(
      (us) => us.includes(req) || req.includes(us)
    );
    if (skillMatch) {
      matchedSkills.push(skillMatch);
    } else {
      missingSkills.push(req);
    }
  }

  const matchRate = jobReqsLower.length > 0 
    ? matchedSkills.length / jobReqsLower.length 
    : 0.5;

  const expScores: Record<string, number> = {
    "Student / Just graduated": 0.3,
    "0-2 years experience": 0.5,
    "3-5 years experience": 0.75,
    "5+ years experience": 1.0,
  };
  const expScore = experience ? (expScores[experience] || 0.5) : 0.5;

  const fitScore = Math.round((matchRate * 0.7 + expScore * 0.3) * 100);

  let verdict: string;
  if (fitScore >= 80) verdict = "Excellent Match";
  else if (fitScore >= 60) verdict = "Good Match";
  else if (fitScore >= 40) verdict = "Partial Match";
  else verdict = "Needs Improvement";

  const strengthsSummary = matchedSkills.length > 0
    ? `Strong in: ${matchedSkills.slice(0, 5).join(", ")}`
    : "Core skills align with role requirements";

  const gapsSummary = missingSkills.length > 0
    ? `Consider learning: ${missingSkills.slice(0, 3).join(", ")}`
    : "No significant skill gaps identified";

  const riskSummary = fitScore < 50
    ? "You may need to upskill before applying"
    : fitScore < 70
    ? "Consider gaining more experience"
    : "Strong candidate for this role";

  return {
    fitScore,
    verdict,
    strengthsSummary,
    gapsSummary,
    riskSummary,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, jobTitle, companyName } = body;

    if (!jobId || !jobTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const primaryResume = await prisma.resume.findFirst({
      where: { userId: user.id, isPrimary: true },
      include: { skills: true },
    });

    const allResumes = primaryResume
      ? [primaryResume]
      : await prisma.resume.findMany({
          where: { userId: user.id },
          include: { skills: true },
          take: 1,
        });

    const userSkills = allResumes.flatMap((r: typeof primaryResume) => {
      const skills = r?.skills || [];
      return skills.map((s: { skillName: string }) => s.skillName);
    });

    const jobReqs = jobTitle.toLowerCase().includes("frontend")
      ? ["react", "typescript", "css", "javascript", "git"]
      : jobTitle.toLowerCase().includes("backend") || jobTitle.toLowerCase().includes("engineer")
      ? ["node", "python", "postgresql", "aws", "git"]
      : jobTitle.toLowerCase().includes("data")
      ? ["excel", "sql", "python", "tableau", "analytics"]
      : jobTitle.toLowerCase().includes("design")
      ? ["figma", "user research", "prototyping", "ui", "ux"]
      : jobTitle.toLowerCase().includes("devops")
      ? ["aws", "docker", "kubernetes", "terraform", "ci/cd"]
      : jobTitle.toLowerCase().includes("mobile")
      ? ["flutter", "dart", "ios", "android", "firebase"]
      : jobTitle.toLowerCase().includes("product")
      ? ["product management", "agile", "roadmap", "stakeholder"]
      : ["communication", "problem solving", "teamwork"];

    const result = calculateFitScore(userSkills, jobReqs, user.experience);

    const existingAnalysis = await prisma.fitAnalysis.findFirst({
      where: {
        userId: user.id,
        jobId: jobId,
      },
    });

    let fitAnalysis;
    if (existingAnalysis) {
      fitAnalysis = await prisma.fitAnalysis.update({
        where: { id: existingAnalysis.id },
        data: {
          fitScore: result.fitScore,
          verdict: result.verdict,
          strengthsSummary: result.strengthsSummary,
          gapsSummary: result.gapsSummary,
          riskSummary: result.riskSummary,
        },
      });
    } else {
      fitAnalysis = await prisma.fitAnalysis.create({
        data: {
          userId: user.id,
          jobId,
          fitScore: result.fitScore,
          verdict: result.verdict,
          strengthsSummary: result.strengthsSummary,
          gapsSummary: result.gapsSummary,
          riskSummary: result.riskSummary,
        },
      });
    }

    return NextResponse.json({ fitAnalysis: result });
  } catch (error) {
    console.error("Error calculating fit analysis:", error);
    return NextResponse.json({ error: "Failed to calculate fit analysis" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const whereClause = jobId
      ? { userId: user.id, jobId }
      : { userId: user.id };

    const analyses = await prisma.fitAnalysis.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ fitAnalyses: analyses });
  } catch (error) {
    console.error("Error fetching fit analyses:", error);
    return NextResponse.json({ error: "Failed to fetch fit analyses" }, { status: 500 });
  }
}