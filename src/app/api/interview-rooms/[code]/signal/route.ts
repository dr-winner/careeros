import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from "@/lib/ratelimit";
import { appendInterviewSignal, listInterviewSignals, parseIncomingSignal } from "@/lib/interview-signal";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const roomCode = code.toUpperCase();
    const room = await prisma.interviewRoom.findUnique({
      where: { roomCode },
      select: { roomCode: true },
    });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const after = Number(request.nextUrl.searchParams.get("after") || "0");
    const signals = await listInterviewSignals(roomCode, Number.isFinite(after) ? after : 0);
    return NextResponse.json({ signals });
  } catch (error) {
    console.error("Interview signal GET error:", error);
    return NextResponse.json({ error: "Failed to read signals" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous";
    const rateLimitResult = await checkRateLimit("interview-signal", RATE_LIMITS.default, ip, {
      failClosed: true,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many signaling requests." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
      );
    }

    const { code } = await params;
    const roomCode = code.toUpperCase();
    const room = await prisma.interviewRoom.findUnique({
      where: { roomCode },
      select: { roomCode: true },
    });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const parsed = parseIncomingSignal(await request.json().catch(() => null));
    if (!parsed) return NextResponse.json({ error: "Invalid signal" }, { status: 400 });

    const signal = await appendInterviewSignal(roomCode, parsed);
    return NextResponse.json({ signal });
  } catch (error) {
    console.error("Interview signal POST error:", error);
    return NextResponse.json({ error: "Failed to send signal" }, { status: 500 });
  }
}
