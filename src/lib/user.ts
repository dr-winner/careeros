import { prisma } from "./db";
import type { User } from "@clerk/backend";
import { sendWelcomeEmail } from "./transactional-emails";

export async function syncClerkUserToDb(clerkUser: User): Promise<boolean> {
  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  );

  if (!primaryEmail) return false;

  const existingUser = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  const fullName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null;
  const email = primaryEmail.emailAddress;

  await prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    update: {
      email,
      fullName,
    },
    create: {
      clerkId: clerkUser.id,
      email,
      fullName,
    },
  });

  if (!existingUser) {
    await sendWelcomeEmail(email, fullName);
    return true;
  }

  return false;
}

export async function getDbUser(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId },
  });
}
