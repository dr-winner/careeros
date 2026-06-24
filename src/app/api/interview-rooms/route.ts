import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDbUserId } from "@/lib/auth";

const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getDbUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { role, experienceLevel } = (await request.json()) as {
      role?: string;
      experienceLevel?: string;
    };

    if (!role) return NextResponse.json({ error: "Role is required" }, { status: 400 });

    let roomCode = generateCode();
    for (let i = 0; i < 10; i++) {
      const existing = await prisma.interviewRoom.findUnique({ where: { roomCode } });
      if (!existing) break;
      roomCode = generateCode();
    }

    const room = await prisma.interviewRoom.create({
      data: { roomCode, createdBy: userId, role, experienceLevel: experienceLevel || null },
    });

    return NextResponse.json({ room });
  } catch (error) {
    console.error("Error creating interview room:", error);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
