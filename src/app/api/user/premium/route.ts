import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { isPremium: true, premiumSince: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      isPremium: user.isPremium,
      premiumSince: user.premiumSince,
    });
  } catch (error) {
    console.error("Error fetching premium status:", error);
    return NextResponse.json(
      { error: "Failed to fetch premium status" },
      { status: 500 }
    );
  }
}
