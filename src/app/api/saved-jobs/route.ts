import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const dbUser = await getDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const savedJobs = await prisma.savedJob.findMany({
      where: { userId: dbUser.id },
      orderBy: { savedAt: "desc" },
    });

    return NextResponse.json({
      savedJobs,
      count: savedJobs.length,
    });
  } catch (error) {
    console.error("Error fetching saved jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved jobs" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const dbUser = await getDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId")?.trim();

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    await prisma.savedJob.deleteMany({
      where: {
        userId: dbUser.id,
        externalJobId: jobId,
      },
    });

    const count = await prisma.savedJob.count({
      where: { userId: dbUser.id },
    });

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Error deleting saved job:", error);
    return NextResponse.json(
      { error: "Failed to delete saved job" },
      { status: 500 },
    );
  }
}
