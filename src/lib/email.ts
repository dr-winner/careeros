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
    console.error("Failed to send admin notification:", error);
    return { success: false, error };
  }
}

export async function sendConfirmationEmail(email: string) {
  try {
    await resend.emails.send({
      from: "CareerOS <noreply@careeros.live>",
      to: email,
      subject: "You're on the list!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a;">You're on the list!</h2>
          <p style="color: #333; line-height: 1.6;">
            Thanks for joining the CareerOS waitlist. We'll notify you when we launch.
          </p>
          <p style="color: #333; line-height: 1.6;">
            CareerOS helps you understand how well you fit a job before you apply - so you stop wasting time on roles you have no chance at.
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Stay tuned. Something good is coming.
          </p>
          <p style="color: #666; font-size: 14px;">
            — The CareerOS Team
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send confirmation email:", error);
    return { success: false, error };
  }
}

export async function addToResend(email: string) {
  try {
    await resend.contacts.create({
      email,
      unsubscribed: false,
    });
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string };
    if (err?.message?.includes("already exists") || err?.message?.includes("already taken")) {
      return { success: true, alreadyExists: true };
    }
    console.error("Failed to add contact:", error);
    return { success: false, error };
  }
}
