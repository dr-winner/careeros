import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { sanitizeSkillList } from "@/lib/skills";

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
          select: { id: true, skillName: true },
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

    const resumesWithText = [];
    for (const resume of resumes) {
      const raw = resume.skills.map((s) => s.skillName);
      const clean = sanitizeSkillList(raw);
      const same =
        raw.length === clean.length &&
        raw.every((name, i) => name === clean[i]);

      if (!same) {
        await prisma.$transaction([
          prisma.resumeSkill.deleteMany({ where: { resumeId: resume.id } }),
          ...(clean.length > 0
            ? [
                prisma.resumeSkill.createMany({
                  data: clean.map((skillName) => ({
                    resumeId: resume.id,
                    skillName,
                    source: "canonical",
                  })),
                }),
              ]
            : []),
        ]);
      }

      resumesWithText.push({
        ...resume,
        skills: (same ? raw : clean).map((skillName) => ({ skillName })),
        parsedText: resume.parsedText || "",
      });
    }

    return NextResponse.json({ resumes: resumesWithText });
  } catch (error) {
    console.error("Error fetching resumes:", error);
    return NextResponse.json({ error: "Failed to fetch resumes" }, { status: 500 });
  }
}
