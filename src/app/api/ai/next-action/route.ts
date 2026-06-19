import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { generateWithFallback } from "@/lib/ai";

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        resumes: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        applications: {
          orderBy: { updatedAt: "desc" },
          take: 5,
        },
        savedJobs: {
          take: 5,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = {
      fullName: user.fullName,
      headline: user.headline,
      experience: user.experience,
      hasResume: (user.resumes?.length || 0) > 0,
      applicationCount: user.applications?.length || 0,
      savedJobCount: user.savedJobs?.length || 0,
      recentApplications: (user.applications || []).map((a: { jobTitle: string | null; status: string }) => ({ title: a.jobTitle, status: a.status })),
    };

    const systemPrompt = `You are a personalized career assistant agent. 
    Analyze the user's current progress and suggest the SINGLE most important "Next Best Action" they should take.
    
    Current User Data: ${JSON.stringify(userData)}
    
    Provide your response in JSON format:
    {
      "action": "short action title",
      "description": "brief explanation of why",
      "priority": "high" | "medium" | "low",
      "link": "/dashboard/resumes" | "/jobs" | "/applications" | "/interview" | "/profile",
      "icon": "resume" | "search" | "track" | "practice" | "profile"
    }`;

    const { text } = await generateWithFallback(
      "What is my next best action?",
      systemPrompt,
      { temperature: 0.3 }
    );

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const actionJson = jsonMatch ? JSON.parse(jsonMatch[0]) : { 
      action: "Keep exploring", 
      description: "Continue your job search journey.",
      priority: "medium",
      link: "/jobs",
      icon: "search"
    };

    return NextResponse.json(actionJson);

  } catch (error) {
    console.error("Next action API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
