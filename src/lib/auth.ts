import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function getDbUserId(): Promise<string | null> {
  const { userId: clerkId } = await auth();
  
  if (!clerkId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
  });

  return user?.id || null;
}

export async function requireDbUserId(): Promise<string> {
  const userId = await getDbUserId();
  
  if (!userId) {
    throw new Error("User not found in database");
  }

  return userId;
}
