import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "waitlist.json");

async function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
}

async function getWaitlist(): Promise<Array<{ id: string; email: string; name: string | null; source: string | null; createdAt: string }>> {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveWaitlist(entries: Array<{ id: string; email: string; name: string | null; source: string | null; createdAt: string }>) {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(entries, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, source } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const waitlist = await getWaitlist();

    const existing = waitlist.find((e) => e.email === normalizedEmail);
    if (existing) {
      return NextResponse.json(
        { message: "You're already on the list!" },
        { status: 200 }
      );
    }

    const entry = {
      id: `wl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: normalizedEmail,
      name: name?.trim() || null,
      source: source || "landing_page",
      createdAt: new Date().toISOString(),
    };

    waitlist.push(entry);
    await saveWaitlist(waitlist);

    console.log(`[Waitlist] New signup: ${normalizedEmail}`);

    return NextResponse.json(
      { message: "You're on the list!", id: entry.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
