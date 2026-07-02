<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CareerOS - Agent Instructions

## Design System

### Agentic/ZO.Style Theme
The app uses a deep dark theme with purple/cyan accents inspired by zo.computer:
- Background: `#0a0a0f`
- Primary: `#8b5cf6` (purple)
- Accent: `#06b6d4` (cyan)
- Success: `#22c55e` (green)

### CSS Classes
- `.agent-card` - Glass card with gradient border
- `.agent-button` - Base button styling
- `.agent-button-primary` - Purple gradient button
- `.agent-input` - Input field with glass effect
- `.agent-status` - Status indicator with dot
- `.status-dot` - Animated status dot
- `.glass-dark` - Dark glass effect
- `.gradient-text` - Purple gradient text
- `.mono` - Monospace font class

### Animations
- `.animate-fade-up` - Fade up entrance animation
- `.animate-glow-pulse` - Glow pulse effect
- `.animate-cursor-blink` - Blinking cursor

## CV Analysis Flow
1. CV upload → PDF extracted using `unpdf` library
2. Skills extracted from CV
3. When viewing job, skills compared against requirements
4. Match score + optimization tips displayed

## API Notes
- PDF extraction: Use `unpdf` (not `pdfjs-dist` - doesn't work in Next.js server context)
- API: `getDocumentProxy(buffer)` → `numPages`, `getPage()` → `extractText(page)`

## Moolre Integrations (docs: https://docs.moolre.com/llms-full.txt)
- Shared client: `src/lib/moolre.ts` (SMS, disbursements, direct MoMo collection, name validation, tx status)
- Collections: hosted payment link (`/api/payment/create-link`) + direct MoMo USSD prompt (`/api/payment/momo-charge`); both use `co-{userId}-{planCode}-{ts}` externalref so the webhook (`/api/webhooks/moolre`) and `/api/payment/verify` activate either flow
- Disbursements: GHS 5 referral reward to referrer's MoMo when referee goes Premium — `src/lib/referral-reward.ts`, triggered from `activateSubscription`; retries when a wallet is added via profile PATCH
- SMS: daily job alerts channel in `/api/cron/alerts` (opt-in via `User.smsAlerts` + phone); requires `MOOLRE_API_VASKEY` + approved `MOOLRE_SMS_SENDER_ID`
- Channels: transfers/validate use MTN=1, Telecel=6, AT=7; direct collections map MTN to 13 (handled in `initiateMomoPayment`)

## Quality Checks
Run `npm run check` before every push (includes typecheck, lint, tests, build)

## Completed Pages (Redesigned)
- ✅ Landing page components (hero, nav, how-it-works)
- ✅ Dashboard layout with agentic sidebar
- ✅ Dashboard home page
- ✅ Jobs listing page
- ✅ Job detail page [id]
- ✅ Applications page
- ✅ Saved jobs page
- ✅ Resumes page
- ✅ Analytics page
- ✅ Alerts page
- ✅ Profile page
- ✅ Referrals page
- ✅ Interview prep page
- ✅ Cover letter generator
- ✅ Mobile quick search page
