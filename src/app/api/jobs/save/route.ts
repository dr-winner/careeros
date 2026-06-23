import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUser } from "@/lib/auth";
import { ensureJobRecord } from "@/lib/jobs";
import { getZodErrorMessage, saveJobSchema } from "@/lib/validation";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const user = await getDbUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = saveJobSchema.parse(await request.json());

    await ensureJobRecord({
      jobId: payload.jobId,
      title: payload.title,
      companyName: payload.companyName,
      location: payload.location,
      country: payload.country,
      workMode: payload.workMode,
      description: payload.description,
      applicationUrl: payload.applicationUrl,
      status: "active",
    });

    const existing = await prisma.savedJob.findFirst({
      where: {
        userId: user.id,
        externalJobId: payload.jobId,
      },
    });

    if (existing) {
      await prisma.savedJob.delete({
        where: { id: existing.id },
      });

      const count = await prisma.savedJob.count({
        where: { userId: user.id },
      });

      return NextResponse.json({
        saved: false,
        count,
        jobId: payload.jobId,
      });
    }

    const savedJob = await prisma.savedJob.create({
      data: {
        userId: user.id,
        externalJobId: payload.jobId,
        title: payload.title || "Unknown Position",
        companyName: payload.companyName,
        location: payload.location,
        country: payload.country,
        workMode: payload.workMode,
        applicationUrl: payload.applicationUrl,
      },
    });

    const count = await prisma.savedJob.count({
      where: { userId: user.id },
    });

    return NextResponse.json({
      saved: true,
      count,
      savedJob,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: getZodErrorMessage(error) },
        { status: 400 },
      );
    }

    console.error("Error saving job:", error);
    return NextResponse.json({ error: "Failed to save job" }, { status: 500 });
  }
}
