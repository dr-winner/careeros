-- Safe SQL migration for audit-driven index fixes
-- File: careeros/scripts/apply-audit-index-fixes.sql
--
-- Purpose:
-- 1. Remove the incorrect global uniqueness on SavedJob.externalJobId
-- 2. Replace Referral.referralCode global uniqueness with:
--    - a non-unique lookup index on referralCode
--    - a composite unique constraint on (referrerId, refereeEmail)
--
-- Notes:
-- - Run this against the same PostgreSQL database used by the app.
-- - This script is designed to be safe and non-destructive.
-- - It will fail intentionally if duplicate referral pairs already exist.
-- - Run inside a transaction where possible.
--
-- Recommended:
-- - Back up your database first.
-- - Review the duplicate-check query output before applying.
-- - After applying, keep prisma/schema.prisma as the source of truth.

BEGIN;

-- ---------------------------------------------------------------------------
-- Pre-flight: fail fast if duplicate referral pairs already exist
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Referral"
    GROUP BY "referrerId", "refereeEmail"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot create unique index on ("referrerId","refereeEmail"): duplicate referral pairs already exist.';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- SavedJob: remove incorrect global uniqueness on externalJobId
-- Current bad index:
--   "SavedJob_externalJobId_key"
-- Desired:
--   keep only the composite unique index on ("userId","externalJobId")
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS "SavedJob_externalJobId_key";

-- ---------------------------------------------------------------------------
-- Referral: replace global unique referralCode with better indexing
-- Current bad index:
--   "Referral_referralCode_key"
-- Desired:
--   - non-unique index on referralCode for lookup/filtering
--   - unique composite index on (referrerId, refereeEmail)
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS "Referral_referralCode_key";

CREATE INDEX IF NOT EXISTS "Referral_referralCode_idx"
  ON "Referral"("referralCode");

CREATE UNIQUE INDEX IF NOT EXISTS "Referral_referrerId_refereeEmail_key"
  ON "Referral"("referrerId", "refereeEmail");

COMMIT;

-- ---------------------------------------------------------------------------
-- Optional verification queries
-- ---------------------------------------------------------------------------
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('SavedJob', 'Referral')
-- ORDER BY tablename, indexname;
--
-- SELECT "referrerId", "refereeEmail", COUNT(*) AS count
-- FROM "Referral"
-- GROUP BY "referrerId", "refereeEmail"
-- HAVING COUNT(*) > 1;
