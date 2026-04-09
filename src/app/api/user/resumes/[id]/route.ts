import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.resume.updateMany({
      where: { userId },
      data: { isPrimary: false },
    });

    await prisma.resume.update({
      where: { id },
      data: { isPrimary: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting primary resume:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const resume = await prisma.resume.findUnique({
      where: { id },
    });

    if (!resume || resume.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.resume.delete({
      where: { id },
    });

    if (resume.isPrimary) {
      const nextResume = await prisma.resume.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
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
