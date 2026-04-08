import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = "duvorrichardwinner@gmail.com";

export async function sendWaitlistNotification(email: string) {
  try {
    await resend.emails.send({
      from: "CareerOS <noreply@careeros.live>",
      to: ADMIN_EMAIL,
      subject: "New waitlist signup!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">New CareerOS Waitlist Signup</h2>
          <p style="color: #333; font-size: 16px;">
            <strong>Email:</strong> ${email}
          </p>
          <p style="color: #666; font-size: 14px;">
            Someone just joined the CareerOS waitlist.
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send email notification:", error);
    return { success: false, error };
  }
}

export async function addToResendAudience(email: string) {
  try {
    await resend.contacts.create({
      audienceId: process.env.RESEND_AUDIENCE_ID || "",
      email,
      unsubscribed: false,
    });
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string };
    if (err?.message?.includes("already exists")) {
      return { success: true, alreadyExists: true };
    }
    console.error("Failed to add to Resend audience:", error);
    return { success: false, error };
  }
}
