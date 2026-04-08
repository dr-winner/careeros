import { NextRequest, NextResponse } from "next/server";
import { sendWaitlistNotification, addToResend } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Add to Resend contacts
    await addToResend(normalizedEmail);

    // Send admin notification
    await sendWaitlistNotification(normalizedEmail);

    return NextResponse.json(
      { message: "You're on the list!" },
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
