import { auth, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { syncClerkUserToDb } from "@/lib/user";
import { REFERRAL_COOKIE } from "@/lib/referral-code";

// Cookie set by middleware when a visitor lands via a ?ref= link.
// Only relevant on the first-login sync path; failures are ignored
// because cookies() is unavailable outside a request context.
export async function readReferralCookie(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(REFERRAL_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

const SYNC_MAX_ATTEMPTS = 3;
const SYNC_BACKOFF_MS = [0, 600, 1400]; // delays before attempt 1, 2, 3

export async function getDbUser() {
  const { userId: clerkId } = await auth();

  if (!clerkId) return null;

  // Fast path: user already exists
  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  // Slow path: first-login race — sync from Clerk with retries + backoff
  for (let attempt = 0; attempt < SYNC_MAX_ATTEMPTS; attempt++) {
    if (SYNC_BACKOFF_MS[attempt] > 0) {
      await new Promise((r) => setTimeout(r, SYNC_BACKOFF_MS[attempt]));
    }

    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(clerkId);

      if (!clerkUser) {
        console.error(`[getDbUser] Clerk user not found for clerkId: ${clerkId}`);
        return null;
      }

      const synced = await syncClerkUserToDb(clerkUser, await readReferralCookie());
      if (synced) return synced;

      // syncClerkUserToDb returned null — check if a concurrent request already created the user
      const raceUser = await prisma.user.findUnique({ where: { clerkId } });
      if (raceUser) return raceUser;

      console.warn(`[getDbUser] Attempt ${attempt + 1}/${SYNC_MAX_ATTEMPTS} — sync returned null, retrying...`);
    } catch (error) {
      console.error(`[getDbUser] Attempt ${attempt + 1}/${SYNC_MAX_ATTEMPTS} failed:`, error);
    }
  }

  console.error(`[getDbUser] All sync attempts exhausted for clerkId: ${clerkId}`);
  return null;
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
