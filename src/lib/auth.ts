import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { syncClerkUserToDb } from "@/lib/user";

export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

export async function getDbUser() {
  const clerkId = await getClerkUserId();

  if (!clerkId) {
    return null;
  }

  let user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (user) {
    return user;
  }

  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkId);
    await syncClerkUserToDb(clerkUser);

    user = await prisma.user.findUnique({
      where: { clerkId },
    });

    return user;
  } catch (error) {
    console.error("Failed to sync Clerk user to database:", error);
    return null;
  }
}

export async function getDbUserId(): Promise<string | null> {
  const user = await getDbUser();
  return user?.id ?? null;
}

export async function requireDbUser() {
  const user = await getDbUser();

  if (!user) {
    throw new Error("User not found in database");
  }

  return user;
}

export async function requireDbUserId(): Promise<string> {
  const user = await requireDbUser();
  return user.id;
}

export async function isUserPremium(): Promise<boolean> {
  const user = await getDbUser();
  return user?.isPremium ?? false;
}

export async function requirePremium(): Promise<void> {
  const isPremium = await isUserPremium();

  if (!isPremium) {
    throw new Error("PREMIUM_REQUIRED");
  }
}
