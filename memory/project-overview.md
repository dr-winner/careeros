---
name: project-overview
description: CareerOS — AI-powered job-search platform targeting African job seekers (Ghana, Nigeria, Kenya, South Africa), built solo by the founder
metadata:
  type: project
---

CareerOS is a Next.js 16 full-stack app. Core stack: Clerk (auth), Neon Postgres + Prisma ORM, Supabase Storage (CV files), Upstash Redis (rate limiting/cache), Resend (email), Sentry (monitoring).

**Why:** Built by the founder to solve painful job search for African professionals. Focus markets: SA, Nigeria, Kenya, Ghana. Differentiator: AI match scores, CV analysis, multi-provider fallback AI.

**AI layer:** Multi-provider fallback — Groq (llama-3.3-70b), DeepSeek, Gemini 2.0 Flash, OpenAI gpt-4o-mini. Preference for free/cheap tiers. Falls back automatically on 402/rate-limit errors.

**Job sources:** Adzuna (SA), Remotive (remote), Arbeitnow, Rise, Jooble (African countries). All aggregated and deduplicated in `/api/jobs`.

**Key features built:**
- Full dashboard with sidebar layout (all pages listed in CLAUDE.md as completed)
- CV upload → PDF parse (unpdf) → skill extraction → AI analysis
- Job fit scoring (FitAnalysis model)
- Application tracking (Kanban-style status flow with history)
- Cover letter AI generator
- Mock interview AI (Groq/DeepSeek)
- AI "Next Best Action" card on dashboard
- Guided onboarding (5-step wizard)
- Job alerts (saved searches, cron email)
- Referral system
- Premium/paywall (isPremium flag, PaywallModal)
- Analytics page
- Resumes management (multiple versions, isPrimary)

**DB models:** User, Resume, ResumeExperience, ResumeEducation, ResumeSkill, Job, JobSkill, FitAnalysis, CoverLetter, SavedJob, Application, ApplicationHistory, SavedSearch, Referral, WaitlistReferral.

**In-progress / untracked files at pause:**
- `src/app/api/ai/interview/` — AI interview route (new)
- `src/app/api/ai/next-action/` — AI next action route (new)
- `src/app/api/user/onboarding/` — onboarding route (new)
- `src/lib/user-profile-options.ts` — profile options constants (new)
- Several scratch/test files at root (check-users.ts, test-*.*)

**How to apply:** When suggesting next steps, prioritize shipping/polishing over adding new features. Africa-focused means local job sources and country targeting matter.
