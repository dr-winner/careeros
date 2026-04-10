import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUserId } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await getDbUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, title, companyName, location, country, workMode, applicationUrl } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    const existing = await prisma.savedJob.findUnique({
      where: {
        userId_externalJobId: { userId, externalJobId: jobId },
      },
    });

    if (existing) {
      await prisma.savedJob.delete({
        where: { userId_externalJobId: { userId, externalJobId: jobId } },
      });
      return NextResponse.json({ saved: false });
    }

    await prisma.savedJob.create({
      data: {
        userId,
        externalJobId: jobId,
        title: title || "Unknown Position",
        companyName,
        location,
        country,
        workMode,
        applicationUrl,
      },
    });

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Error saving job:", error);
    return NextResponse.json({ error: "Failed to save job" }, { status: 500 });
  }
}
