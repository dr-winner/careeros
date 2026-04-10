import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { jobId, notes } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    const existing = await prisma.application.findFirst({
      where: {
        userId: dbUser.id,
        jobId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already applied to this job", application: existing },
        { status: 400 }
      );
    }

    const application = await prisma.application.create({
      data: {
        userId: dbUser.id,
        jobId,
        status: "Applied",
        appliedAt: new Date(),
        notes,
      },
    });

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error("Error applying to job:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!dbUser) {
      return NextResponse.json({ applications: [] });
    }

    const applications = await prisma.application.findMany({
      where: { userId: dbUser.id },
      orderBy: { appliedAt: "desc" },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
