import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { readEnv } from "@/lib/env";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = readEnv("DATABASE_URL");

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const adapter = new PrismaNeon({
    connectionString: databaseUrl,
  });

  return new PrismaClient({
    adapter,
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
