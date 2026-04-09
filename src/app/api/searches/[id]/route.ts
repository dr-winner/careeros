import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { alertEnabled, alertFrequency } = await request.json();

    const search = await prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!search || search.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.savedSearch.update({
      where: { id },
      data: {
        ...(alertEnabled !== undefined && { alertEnabled }),
        ...(alertFrequency && { alertFrequency }),
      },
    });

    return NextResponse.json({ search: updated });
  } catch (error) {
    console.error("Error updating search:", error);
    return NextResponse.json({ error: "Failed to update search" }, { status: 500 });
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

    const search = await prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!search || search.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.savedSearch.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting search:", error);
    return NextResponse.json({ error: "Failed to delete search" }, { status: 500 });
  }
}
