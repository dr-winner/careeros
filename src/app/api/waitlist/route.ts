import { NextRequest, NextResponse } from "next/server";
import { sendWaitlistNotification, sendConfirmationEmail, addToResend } from "@/lib/email";

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

    // Add to Resend contacts (checks for duplicates)
    const result = await addToResend(normalizedEmail);

    if (result.alreadyExists) {
      // Email already on waitlist - don't send emails again
      return NextResponse.json(
        { message: "You're already on the list!" },
        { status: 200 }
      );
    }

    // New signup - send emails
    await sendWaitlistNotification(normalizedEmail);
    await sendConfirmationEmail(normalizedEmail);

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
