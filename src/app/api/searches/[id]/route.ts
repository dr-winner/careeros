import { NextRequest, NextResponse } from "next/server";
import { getClerkUserId, getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getZodErrorMessage, updateSavedSearchSchema } from "@/lib/validation";
import { ZodError } from "zod";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const clerkUserId = await getClerkUserId();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await getDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;
    const payload = updateSavedSearchSchema.parse(await request.json());

    const search = await prisma.savedSearch.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!search || search.userId !== dbUser.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.savedSearch.update({
      where: { id },
      data: {
        ...(payload.alertEnabled !== undefined
          ? { alertEnabled: payload.alertEnabled }
          : {}),
        ...(payload.alertFrequency !== undefined
          ? { alertFrequency: payload.alertFrequency }
          : {}),
      },
    });

    return NextResponse.json({ search: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: getZodErrorMessage(error) },
        { status: 400 },
      );
    }

    console.error("Error updating search:", error);
    return NextResponse.json(
      { error: "Failed to update search" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const clerkUserId = await getClerkUserId();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await getDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;

    const search = await prisma.savedSearch.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!search || search.userId !== dbUser.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.savedSearch.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting search:", error);
    return NextResponse.json(
      { error: "Failed to delete search" },
      { status: 500 },
    );
  }
}
