import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUser } from "@/lib/auth";
import { ensureJobRecord } from "@/lib/jobs";
import { createApplicationSchema, getZodErrorMessage } from "@/lib/validation";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const dbUser = await getDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = createApplicationSchema.parse(await request.json());

    await ensureJobRecord({
      jobId: payload.jobId,
      title: payload.jobTitle,
      companyName: payload.companyName,
      location: payload.location,
      workMode: payload.workMode,
    });

    const existing = await prisma.application.findFirst({
      where: {
        userId: dbUser.id,
        jobId: payload.jobId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already applied to this job", application: existing },
        { status: 400 },
      );
    }

    const application = await prisma.application.create({
      data: {
        userId: dbUser.id,
        jobId: payload.jobId,
        jobTitle: payload.jobTitle,
        companyName: payload.companyName,
        location: payload.location,
        workMode: payload.workMode,
        status: "Applied",
        appliedAt: new Date(),
        notes: payload.notes,
      },
    });

    return NextResponse.json({ success: true, application });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: getZodErrorMessage(error) },
        { status: 400 },
      );
    }

    console.error("Error applying to job:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const dbUser = await getDbUser();

    if (!dbUser) {
      return NextResponse.json({ applications: [] });
    }

    const applications = await prisma.application.findMany({
      where: { userId: dbUser.id },
      orderBy: { appliedAt: "desc" },
      include: {
        history: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 },
    );
  }
}
