import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { checkQuota } from "@/lib/quota";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, isPremium: true, premiumSince: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Free users also get their monthly quota so the dashboard can show
    // "X of Y analyses left" (read-only check; nothing is consumed).
    const quota = user.isPremium ? null : await checkQuota(user.id, false);

    return NextResponse.json({
      isPremium: user.isPremium,
      premiumSince: user.premiumSince,
      quota: quota
        ? {
            used: quota.used,
            limit: quota.limit,
            remaining: quota.remaining,
            resetAt: quota.resetAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching premium status:", error);
    return NextResponse.json(
      { error: "Failed to fetch premium status" },
      { status: 500 }
    );
  }
}
