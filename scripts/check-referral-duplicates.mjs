import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  const duplicates = await prisma.$queryRawUnsafe(`
    SELECT
      "referrerId",
      "refereeEmail",
      COUNT(*)::int AS "count"
    FROM "Referral"
    GROUP BY "referrerId", "refereeEmail"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, "referrerId" ASC, "refereeEmail" ASC
  `);

  const total = await prisma.referral.count();

  const result = {
    totalReferrals: total,
    duplicateGroupCount: duplicates.length,
    duplicates,
  };

  console.log(JSON.stringify(result, null, 2));

  if (duplicates.length > 0) {
    process.exitCode = 2;
  }
}

main()
  .catch((error) => {
    console.error("Failed to check referral duplicates:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
