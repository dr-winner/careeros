import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSessionSchema = z.object({
  role: z.string().trim().min(1).max(200),
  experienceLevel: z.string().trim().optional(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).min(1),
  score: z.number().min(0).max(10).optional(),
});

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const sessions = await prisma.interviewSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        role: true,
        experienceLevel: true,
        score: true,
        createdAt: true,
        messages: true,
      },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => {
        const msgs = JSON.parse(s.messages) as Array<{ role: string }>;
        return {
          id: s.id,
          role: s.role,
          experienceLevel: s.experienceLevel,
          score: s.score,
          createdAt: s.createdAt,
          messageCount: msgs.length,
          messages: msgs,
        };
      }),
    });
  } catch (error) {
    console.error("Interview sessions GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
    }

    const { role, experienceLevel, messages, score } = parsed.data;

    const session = await prisma.interviewSession.create({
      data: {
        userId: user.id,
        role,
        experienceLevel,
        messages: JSON.stringify(messages),
        score: score ?? null,
      },
    });

    return NextResponse.json({ session: { id: session.id, createdAt: session.createdAt } });
  } catch (error) {
    console.error("Interview sessions POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
