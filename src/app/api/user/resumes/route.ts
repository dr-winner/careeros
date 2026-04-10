import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ resumes: [] });
    }

    const resumes = await prisma.resume.findMany({
      where: { userId: dbUser.id },
      include: {
        skills: {
          select: { skillName: true },
        },
        experiences: {
          select: { title: true, company: true },
        },
        education: {
          select: { institution: true, degree: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ resumes });
  } catch (error) {
    console.error("Error fetching resumes:", error);
    return NextResponse.json({ error: "Failed to fetch resumes" }, { status: 500 });
  }
}
