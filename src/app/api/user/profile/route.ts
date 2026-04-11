import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getZodErrorMessage, profileUpdateSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await getDbUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [savedJobsCount, resumesCount, alertsCount, applicationsCount] =
      await Promise.all([
        prisma.savedJob.count({ where: { userId: user.id } }),
        prisma.resume.count({ where: { userId: user.id } }),
        prisma.savedSearch.count({ where: { userId: user.id } }),
        prisma.application.count({ where: { userId: user.id } }),
      ]);

    return NextResponse.json({
      user,
      counts: {
        savedJobs: savedJobsCount,
        resumes: resumesCount,
        alerts: alertsCount,
        applications: applicationsCount,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getDbUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = profileUpdateSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: getZodErrorMessage(error) },
        { status: 400 },
      );
    }

    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
