import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!dbUser) {
      return NextResponse.json({ searches: [] });
    }

    const searches = await prisma.savedSearch.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ searches });
  } catch (error) {
    console.error("Error fetching searches:", error);
    return NextResponse.json({ error: "Failed to fetch searches" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { name, searchQuery, location, workMode, seniority, alertEnabled, alertFrequency } = await request.json();

    if (!name || !searchQuery) {
      return NextResponse.json(
        { error: "Name and search query required" },
        { status: 400 }
      );
    }

    const search = await prisma.savedSearch.create({
      data: {
        userId: dbUser.id,
        name,
        searchQuery,
        location: location || null,
        workMode: workMode || null,
        seniority: seniority || null,
        alertEnabled: alertEnabled ?? true,
        alertFrequency: alertFrequency || "daily",
      },
    });

    return NextResponse.json({ search });
  } catch (error) {
    console.error("Error creating search:", error);
    return NextResponse.json({ error: "Failed to create search" }, { status: 500 });
  }
}
