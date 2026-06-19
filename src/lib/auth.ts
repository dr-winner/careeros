import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { syncClerkUserToDb } from "@/lib/user";

export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

export async function getDbUser() {
  const { userId: clerkId } = await auth();

  console.log(`[getDbUser] Checking for clerkId: ${clerkId}`);

  if (!clerkId) {
    console.log("[getDbUser] No clerkId found in session");
    return null;
  }

  let user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (user) {
    console.log(`[getDbUser] Found user in DB: ${user.id}`);
    return user;
  }

  console.log(`[getDbUser] User not found for clerkId ${clerkId}, attempting sync...`);

  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkId);

    if (!clerkUser) {
      console.error(`[getDbUser] Clerk user not found even with valid session ID: ${clerkId}`);
      return null;
    }

    console.log(`[getDbUser] Syncing Clerk user: ${clerkUser.id}`);
    const syncedUser = await syncClerkUserToDb(clerkUser);

    if (syncedUser) {
      console.log(`[getDbUser] Sync successful, user created/updated: ${syncedUser.id}`);
      return syncedUser;
    }

    console.log(`[getDbUser] Sync returned null, trying final re-query...`);
    user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (user) {
      console.log(`[getDbUser] Final re-query successful: ${user.id}`);
    } else {
      console.error(`[getDbUser] User still not found in DB after sync for clerkId: ${clerkId}`);
    }

    return user;
  } catch (error) {
    console.error(`[getDbUser] Critical error during sync/retrieval for ${clerkId}:`, error);
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
