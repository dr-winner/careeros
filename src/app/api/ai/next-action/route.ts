import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// The "next best action" is a small decision over the user's own state. It
// used to be an LLM call per dashboard visit: slow, paid, and when the
// provider was down the card spun "Analyzing your career path..." forever.
// Rules are instant, free, and always answer.

type NextAction = {
  action: string;
  description: string;
  priority: "high" | "medium" | "low";
  link: string;
  icon: "resume" | "search" | "track" | "practice" | "profile";
};

const DAY_MS = 24 * 60 * 60 * 1000;

function pickNextAction(input: {
  hasResume: boolean;
  hasHeadline: boolean;
  applications: { status: string; updatedAt: Date; jobTitle: string | null }[];
  savedJobCount: number;
  analysisCount: number;
}): NextAction {
  const { hasResume, hasHeadline, applications, savedJobCount, analysisCount } = input;

  if (!hasResume) {
    return {
      action: "Upload your CV",
      description:
        "Every fit score, gap list and cover letter is built from your CV. Nothing else here works properly without it.",
      priority: "high",
      link: "/resumes",
      icon: "resume",
    };
  }

  const interviewing = applications.find((a) => a.status === "interview");
  if (interviewing) {
    return {
      action: `Prepare for your ${interviewing.jobTitle || "upcoming"} interview`,
      description: "Run a mock interview for this role so the real one isn't your first rehearsal.",
      priority: "high",
      link: "/interview",
      icon: "practice",
    };
  }

  const stale = applications.find(
    (a) => a.status === "applied" && Date.now() - a.updatedAt.getTime() > 10 * DAY_MS,
  );
  if (stale) {
    return {
      action: `Follow up on ${stale.jobTitle || "your application"}`,
      description:
        "It has been over 10 days with no update. A short, polite follow-up email puts you back on the recruiter's screen.",
      priority: "medium",
      link: "/applications",
      icon: "track",
    };
  }

  if (analysisCount === 0) {
    return {
      action: "Run your first fit check",
      description: "Open any job and analyse it — you'll see exactly which requirements you meet and which to fix before applying.",
      priority: "high",
      link: "/jobs",
      icon: "search",
    };
  }

  if (savedJobCount > 0 && applications.length === 0) {
    return {
      action: `Apply to one of your ${savedJobCount} saved jobs`,
      description: "Saved is not applied. Pick the best-fit one and send it today while the listing is still open.",
      priority: "high",
      link: "/saved-jobs",
      icon: "track",
    };
  }

  if (!hasHeadline) {
    return {
      action: "Complete your profile",
      description: "A headline and target role make your job feed and alerts far more relevant.",
      priority: "medium",
      link: "/profile",
      icon: "profile",
    };
  }

  return {
    action: "Find today's matches",
    description: "New roles land daily. Check the feed and analyse anything above 60% before it closes.",
    priority: "medium",
    link: "/jobs",
    icon: "search",
  };
}

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        headline: true,
        resumes: { select: { id: true }, take: 1 },
        applications: {
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: { status: true, updatedAt: true, jobTitle: true },
        },
        _count: { select: { savedJobs: true, fitAnalyses: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const action = pickNextAction({
      hasResume: user.resumes.length > 0,
      hasHeadline: !!user.headline?.trim(),
      applications: user.applications,
      savedJobCount: user._count.savedJobs,
      analysisCount: user._count.fitAnalyses,
    });

    return NextResponse.json(action);
  } catch (error) {
    console.error("Next action API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
