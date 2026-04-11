# CareerOS

CareerOS is an AI-powered career operating system designed to help users discover opportunities, assess job fit, improve applications, and prepare for interviews.

## Current Status

Active MVP with `Next.js`, `React 19`, `Clerk`, `Prisma`, and Neon-backed PostgreSQL.

## Database Baseline and Migration Status

This project uses a live PostgreSQL schema that now has a committed Prisma baseline.

### Current state

- `prisma/schema.prisma` reflects the intended application schema.
- The live database is working with the app.
- Prisma migration history is now initialized in `prisma/migrations/`.
- `prisma migrate status` reports the database schema is up to date.

### Important implication

Do **not** run a destructive reset on the shared database unless you explicitly intend to wipe all data.

### Audit-related database changes

A safe, non-destructive SQL migration script is included for the audit-driven index and constraint fixes:

- `scripts/apply-audit-index-fixes.sql`

This script applies these changes:

1. removes the incorrect global uniqueness on `SavedJob.externalJobId`
2. replaces global uniqueness on `Referral.referralCode`
3. adds a composite unique index on `Referral(referrerId, refereeEmail)`
4. keeps a lookup index on `Referral.referralCode`

### Verification scripts

The repository includes helper scripts for DB verification:

- `scripts/check-referral-duplicates.mjs`
- `scripts/verify-audit-indexes.mjs`

These were used to confirm:

- no duplicate referral pairs block the composite unique index
- saved jobs now use per-user uniqueness only
- the live DB indexes match the intended schema changes

### Baseline status after audit work

During audit remediation work:

1. the non-destructive index fix script was applied successfully
2. referral duplicate checks passed before and after the change
3. live index verification passed after the change
4. a Prisma baseline migration was created in `prisma/migrations/20260411000100_baseline/`
5. the baseline migration was marked as applied on the live database

Current verified result:

- `SavedJob_userId_externalJobId_key` exists
- `SavedJob_externalJobId_key` has been removed
- `Referral_referralCode_idx` exists
- `Referral_referralCode_key` has been removed
- `Referral_referrerId_refereeEmail_key` exists
- baseline migration `20260411000100_baseline` is recorded as applied

### Prisma baseline files

- `prisma/migrations/migration_lock.toml`
- `prisma/migrations/20260411000100_baseline/migration.sql`

### What this means

- the live database already existed before migration history was introduced
- the baseline migration now represents the current schema
- Prisma Migrate has been initialized against the existing live database without replaying destructive schema creation
- future schema changes can now be managed through normal Prisma migration workflow

## Deployment

### Platform notes

This app is configured for Vercel deployment.

Current scheduled job config in `vercel.json`:

- `GET /api/cron/alerts`
- schedule: `0 8 * * *`

That schedule should be treated as UTC unless your hosting platform documents otherwise.

### Required deployment considerations

#### 1. Durable file storage
Resume uploads currently pass through the app runtime, but production deployments should use durable object storage for uploaded files.

If you deploy to a serverless platform, do **not** rely on local disk as a permanent storage layer.

Recommended options:
- Vercel Blob
- Amazon S3
- Cloudinary
- another durable object store

#### 2. Database migrations
Because Prisma Migrate is now baselined, future deployments should include:

- `prisma migrate deploy`

A typical production flow is:

1. install dependencies
2. run `prisma migrate deploy`
3. run `next build`
4. start the app

#### 3. Cron authentication
`/api/cron/alerts` requires a valid cron secret.

Set:

- `CRON_SECRET`

Your scheduler must send that secret so the route can authenticate the request.

#### 4. Canonical app URL
Server-generated links for emails and referrals depend on the application URL.

Recommended:
- set `APP_URL` for server-side absolute URLs
- optionally keep `NEXT_PUBLIC_APP_URL` for client-side/public usage

#### 5. Email sender identity
Email sender values should be verified and consistent across environments.

Recommended:
- set `EMAIL_FROM`
- verify the sending domain in Resend

#### 6. Clerk environment
Because the app uses Clerk for authentication, your deployment must include the appropriate Clerk environment variables for both public and server-side auth flows.

## Environment Variables

### Core required variables

#### Database
- `DATABASE_URL`  
  Required by the app runtime for Prisma + Neon connections.

- `DIRECT_URL`  
  Recommended for Prisma CLI and migration operations.

#### Auth
- Clerk publishable key
- Clerk secret key

Use the standard Clerk environment variables required for your Clerk project.

### Required for scheduled alerts
- `CRON_SECRET`
- `RESEND_API_KEY`

### Recommended for links and branding
- `APP_URL`
- `NEXT_PUBLIC_APP_URL`
- `EMAIL_FROM`
- `ADMIN_EMAIL`

### Required for waitlist/contact syncing
- `RESEND_AUDIENCE_ID`

### Optional AI provider variables
At least one of these is needed for AI features:

- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`

### Optional job source integrations
- `ADZUNA_APP_ID`
- `ADZUNA_APP_KEY`
- `JOOBLE_API_KEY`

## Local Development

### Install

```bash
npm install
```

### Start the app

```bash
npm run dev
```

### Generate Prisma client

```bash
npx prisma generate
```

### Check Prisma migration status

```bash
npx prisma migrate status
```

## Testing and Quality Workflow

### Available scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run check`

### What each script does

- `npm run lint`  
  Runs ESLint across the project.

- `npm run typecheck`  
  Runs TypeScript in no-emit mode.

- `npm run test`  
  Runs the automated test suite with Vitest.

- `npm run build`  
  Produces a production build with Next.js.

- `npm run check`  
  Runs the full local quality gate:
  1. typecheck
  2. lint
  3. tests
  4. production build

### Recommended local workflow

Before opening a PR or deploying:

```bash
npm run check
```

### Current test setup

The project includes Vitest for lightweight automated testing of pure utilities and shared logic.

Current test coverage focuses on:
- environment helpers
- jobs utility helpers
- in-memory job cache helpers

As the project grows, recommended next additions are:
- API route integration tests
- upload flow tests
- auth/ownership regression tests
- end-to-end dashboard flows

## Planned MVP Milestones

1. Onboarding and CV upload
2. CV parsing and profile extraction
3. Job discovery and fit analysis
4. CV optimization and cover letter generation
5. Interview prep and skill-gap recommendations