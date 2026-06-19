import { prisma } from "./db";
import type { User } from "@clerk/backend";
import { sendWelcomeEmail } from "./transactional-emails";

export async function syncClerkUserToDb(clerkUser: User) {
  const primaryEmail =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId) ||
    clerkUser.emailAddresses[0];

  if (!primaryEmail) {
    console.error(`User ${clerkUser.id} has no email addresses`);
    return null;
  }

  const fullName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null;
  const email = primaryEmail.emailAddress;

  try {
    // Check existence first by clerkId
    let existingUser = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    // If not found by clerkId, try finding by email (handles case where user recreated Clerk account)
    if (!existingUser) {
      existingUser = await prisma.user.findUnique({
        where: { email },
      });
    }

    console.log(`[syncClerkUserToDb] Syncing user: ${clerkUser.id} (${email})`);
    
    let user;
    if (existingUser) {
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          clerkId: clerkUser.id,
          email,
          fullName,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email,
          fullName,
        },
      });
    }
    console.log(`[syncClerkUserToDb] Sync success: ${user.id}`);

    // Send welcome email only if this is a brand new user
    if (!existingUser) {
      // Use fire-and-forget or background task for email to not block sync
      sendWelcomeEmail(email, fullName || "there").catch(err =>
        console.error("Failed to send welcome email:", err)
      );
    }

    return user;
  } catch (error) {
    console.error("Database error during syncClerkUserToDb:", error);
    // Return null so caller can handle failure
    return null;
  }
}

export async function getDbUser(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId },
  });
}
