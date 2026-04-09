import { prisma } from "./db";
import type { User } from "@clerk/backend";

export async function syncClerkUserToDb(clerkUser: User): Promise<void> {
  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  );

  if (!primaryEmail) return;

  await prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    update: {
      email: primaryEmail.emailAddress,
      fullName: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
    },
    create: {
      clerkId: clerkUser.id,
      email: primaryEmail.emailAddress,
      fullName: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
    },
  });
}

export async function getDbUser(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId },
  });
}
