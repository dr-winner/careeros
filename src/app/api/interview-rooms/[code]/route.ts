import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const room = await prisma.interviewRoom.findUnique({
      where: { roomCode: code.toUpperCase() },
      select: { roomCode: true, role: true, experienceLevel: true, status: true, createdAt: true },
    });

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    return NextResponse.json({ room });
  } catch (error) {
    console.error("Error fetching interview room:", error);
    return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 });
  }
}
