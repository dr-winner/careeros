import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUser } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const dbUser = await getDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const resume = await prisma.resume.findFirst({
      where: {
        id,
        userId: dbUser.id,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.resume.updateMany({
        where: { userId: dbUser.id },
        data: { isPrimary: false },
      }),
      prisma.resume.update({
        where: { id: resume.id },
        data: { isPrimary: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting primary resume:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const dbUser = await getDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const resume = await prisma.resume.findFirst({
      where: {
        id,
        userId: dbUser.id,
      },
      select: {
        id: true,
        isPrimary: true,
      },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    await prisma.resume.delete({
      where: { id: resume.id },
    });

    if (resume.isPrimary) {
      const nextResume = await prisma.resume.findFirst({
        where: { userId: dbUser.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });

      if (nextResume) {
        await prisma.resume.update({
          where: { id: nextResume.id },
          data: { isPrimary: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting resume:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
