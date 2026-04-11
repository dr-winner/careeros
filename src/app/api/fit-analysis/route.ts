import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureJobRecord } from "@/lib/jobs";
import { fitAnalysisRequestSchema, getZodErrorMessage } from "@/lib/validation";
import { ZodError } from "zod";

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
  experience: string | null,
): FitAnalysisResult {
  const userSkillsLower = userSkills.map((s) => s.toLowerCase());
  const jobReqsLower = jobRequirements.map((r) => r.toLowerCase());

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const req of jobReqsLower) {
    const skillMatch = userSkillsLower.find(
      (us) => us.includes(req) || req.includes(us),
    );

    if (skillMatch) {
      matchedSkills.push(skillMatch);
    } else {
      missingSkills.push(req);
    }
  }

  const matchRate =
    jobReqsLower.length > 0 ? matchedSkills.length / jobReqsLower.length : 0.5;

  const expScores: Record<string, number> = {
    "Student / Just graduated": 0.3,
    "0-2 years experience": 0.5,
    "3-5 years experience": 0.75,
    "5+ years experience": 1.0,
  };

  const expScore = experience ? (expScores[experience] ?? 0.5) : 0.5;
  const fitScore = Math.round((matchRate * 0.7 + expScore * 0.3) * 100);

  let verdict: string;
  if (fitScore >= 80) verdict = "Excellent Match";
  else if (fitScore >= 60) verdict = "Good Match";
  else if (fitScore >= 40) verdict = "Partial Match";
  else verdict = "Needs Improvement";

  const strengthsSummary =
    matchedSkills.length > 0
      ? `Strong in: ${matchedSkills.slice(0, 5).join(", ")}`
      : "Core skills align with role requirements";

  const gapsSummary =
    missingSkills.length > 0
      ? `Consider learning: ${missingSkills.slice(0, 3).join(", ")}`
      : "No significant skill gaps identified";

  const riskSummary =
    fitScore < 50
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

function inferJobRequirements(jobTitle: string): string[] {
  const lowerTitle = jobTitle.toLowerCase();

  if (lowerTitle.includes("frontend")) {
    return ["react", "typescript", "css", "javascript", "git"];
  }

  if (lowerTitle.includes("backend") || lowerTitle.includes("engineer")) {
    return ["node", "python", "postgresql", "aws", "git"];
  }

  if (lowerTitle.includes("data")) {
    return ["excel", "sql", "python", "tableau", "analytics"];
  }

  if (lowerTitle.includes("design")) {
    return ["figma", "user research", "prototyping", "ui", "ux"];
  }

  if (lowerTitle.includes("devops")) {
    return ["aws", "docker", "kubernetes", "terraform", "ci/cd"];
  }

  if (lowerTitle.includes("mobile")) {
    return ["flutter", "dart", "ios", "android", "firebase"];
  }

  if (lowerTitle.includes("product")) {
    return ["product management", "agile", "roadmap", "stakeholder"];
  }

  return ["communication", "problem solving", "teamwork"];
}

export async function POST(request: NextRequest) {
  try {
    const user = await getDbUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = fitAnalysisRequestSchema.parse(await request.json());

    await ensureJobRecord({
      jobId: payload.jobId,
      title: payload.jobTitle,
    });

    const primaryResume = await prisma.resume.findFirst({
      where: {
        userId: user.id,
        isPrimary: true,
      },
      include: {
        skills: true,
      },
    });

    const resumes = primaryResume
      ? [primaryResume]
      : await prisma.resume.findMany({
          where: { userId: user.id },
          include: { skills: true },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
        });

    const userSkills = [
      ...new Set(
        resumes.flatMap((resume) =>
          (resume.skills || []).map((skill) => skill.skillName),
        ),
      ),
    ];

    const jobRequirements = inferJobRequirements(payload.jobTitle);
    const result = calculateFitScore(
      userSkills,
      jobRequirements,
      user.experience,
    );

    const existingAnalysis = await prisma.fitAnalysis.findFirst({
      where: {
        userId: user.id,
        jobId: payload.jobId,
      },
    });

    const fitAnalysis = existingAnalysis
      ? await prisma.fitAnalysis.update({
          where: { id: existingAnalysis.id },
          data: {
            fitScore: result.fitScore,
            verdict: result.verdict,
            strengthsSummary: result.strengthsSummary,
            gapsSummary: result.gapsSummary,
            riskSummary: result.riskSummary,
          },
        })
      : await prisma.fitAnalysis.create({
          data: {
            userId: user.id,
            jobId: payload.jobId,
            fitScore: result.fitScore,
            verdict: result.verdict,
            strengthsSummary: result.strengthsSummary,
            gapsSummary: result.gapsSummary,
            riskSummary: result.riskSummary,
          },
        });

    return NextResponse.json({
      fitAnalysis: {
        ...fitAnalysis,
        fitScore: result.fitScore,
        verdict: result.verdict,
        strengthsSummary: result.strengthsSummary,
        gapsSummary: result.gapsSummary,
        riskSummary: result.riskSummary,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: getZodErrorMessage(error) },
        { status: 400 },
      );
    }

    console.error("Error calculating fit analysis:", error);
    return NextResponse.json(
      { error: "Failed to calculate fit analysis" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getDbUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    const analyses = await prisma.fitAnalysis.findMany({
      where: jobId ? { userId: user.id, jobId } : { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ fitAnalyses: analyses });
  } catch (error) {
    console.error("Error fetching fit analyses:", error);
    return NextResponse.json(
      { error: "Failed to fetch fit analyses" },
      { status: 500 },
    );
  }
}
