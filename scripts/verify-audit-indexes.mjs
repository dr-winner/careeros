import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: "DATABASE_URL is not set in the environment",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString,
  }),
});

async function main() {
  const indexes = await prisma.$queryRawUnsafe(`
    SELECT
      schemaname::text AS schemaname,
      tablename::text AS tablename,
      indexname::text AS indexname,
      indexdef::text AS indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('SavedJob', 'Referral')
    ORDER BY tablename ASC, indexname ASC
  `);

  const duplicateReferralPairs = await prisma.$queryRawUnsafe(`
    SELECT
      "referrerId",
      "refereeEmail",
      COUNT(*)::int AS "count"
    FROM "Referral"
    GROUP BY "referrerId", "refereeEmail"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, "referrerId" ASC, "refereeEmail" ASC
  `);

  const savedJobDuplicateGlobalIds = await prisma.$queryRawUnsafe(`
    SELECT
      "externalJobId",
      COUNT(*)::int AS "count"
    FROM "SavedJob"
    GROUP BY "externalJobId"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, "externalJobId" ASC
  `);

  const findIndex = (tableName, indexName) =>
    indexes.find(
      (row) => row.tablename === tableName && row.indexname === indexName,
    );

  const hasSavedJobCompositeUnique = !!findIndex(
    "SavedJob",
    "SavedJob_userId_externalJobId_key",
  );
  const hasSavedJobGlobalUnique = !!findIndex(
    "SavedJob",
    "SavedJob_externalJobId_key",
  );

  const hasReferralLookupIndex = !!findIndex(
    "Referral",
    "Referral_referralCode_idx",
  );
  const hasReferralGlobalUnique = !!findIndex(
    "Referral",
    "Referral_referralCode_key",
  );
  const hasReferralCompositeUnique = !!findIndex(
    "Referral",
    "Referral_referrerId_refereeEmail_key",
  );

  const verification = {
    ok:
      hasSavedJobCompositeUnique &&
      !hasSavedJobGlobalUnique &&
      hasReferralLookupIndex &&
      !hasReferralGlobalUnique &&
      hasReferralCompositeUnique &&
      duplicateReferralPairs.length === 0,
    checks: {
      savedJob: {
        hasCompositeUniqueIndex: hasSavedJobCompositeUnique,
        hasRemovedGlobalUniqueIndex: !hasSavedJobGlobalUnique,
        duplicateExternalJobIdsAcrossUsers: savedJobDuplicateGlobalIds.length,
      },
      referral: {
        hasLookupIndexOnReferralCode: hasReferralLookupIndex,
        hasRemovedGlobalUniqueIndexOnReferralCode: !hasReferralGlobalUnique,
        hasCompositeUniqueIndex: hasReferralCompositeUnique,
        duplicateReferrerEmailPairs: duplicateReferralPairs.length,
      },
    },
    indexes,
    duplicateReferralPairs,
    duplicateExternalJobIdsAcrossUsers: savedJobDuplicateGlobalIds,
  };

  console.log(JSON.stringify(verification, null, 2));

  if (!verification.ok) {
    process.exitCode = 2;
  }
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
