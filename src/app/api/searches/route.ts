import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSavedSearchSchema, getZodErrorMessage } from "@/lib/validation";
import { ZodError } from "zod";

export async function GET() {
  try {
    const dbUser = await getDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searches = await prisma.savedSearch.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      searches,
      count: searches.length,
    });
  } catch (error) {
    console.error("Error fetching searches:", error);
    return NextResponse.json(
      { error: "Failed to fetch searches" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const dbUser = await getDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = createSavedSearchSchema.parse(await request.json());

    const search = await prisma.savedSearch.create({
      data: {
        userId: dbUser.id,
        name: parsed.name,
        searchQuery: parsed.searchQuery,
        location: parsed.location,
        workMode: parsed.workMode,
        seniority: parsed.seniority,
        alertEnabled: parsed.alertEnabled ?? true,
        alertFrequency: parsed.alertFrequency ?? "daily",
      },
    });

    return NextResponse.json({ search }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: getZodErrorMessage(error) },
        { status: 400 },
      );
    }

    console.error("Error creating search:", error);
    return NextResponse.json(
      { error: "Failed to create search" },
      { status: 500 },
    );
  }
}
