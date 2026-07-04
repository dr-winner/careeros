# CareerOS — Moolre Startup Cup 2026 Campaign Kit

Deadline: submissions close **July 13**. Public votes decide the Top 10.
Vote link: https://startup.moolre.com/leaderboard

**One-liner:** CareerOS tells you your CV's match score BEFORE you apply — then pays you cash to your MoMo for bringing friends.

---

## 1. One-Minute Explainer Video — Shot-by-Shot Script

Total: 60 seconds. Record screen at 1080p, voiceover over screen capture.
Phone shots: film the actual phone for the USSD prompt and SMS — real hardware reads as real product.

| # | Time | Screen | Voiceover |
|---|------|--------|-----------|
| 1 | 0–6s | Phone: real SMS notification — "CareerOS: 3 new jobs for 'social media'. Top match: SMM at Acme +2 more" | "Every morning, CareerOS texts me jobs that match my CV. No app open needed — this is Moolre SMS." |
| 2 | 6–14s | Dashboard → job detail, fit score animating to 78% | "Before I apply, I see my exact match score and what skills I'm missing. No more applying blind." |
| 3 | 14–22s | CV analysis screen: skills, experience, education extracted | "It read my CV, pulled out 24 skills, and tells me how to fix the gaps for each job." |
| 4 | 22–34s | Pricing page → "Pay with MoMo" → enter number → cut to phone: USSD approval prompt appears → approve → "You're Premium!" confetti | "Upgrading costs GHS 25 — I type my MoMo number, approve right on my phone, done. No card, no redirect. That's Moolre Collections over USSD." |
| 5 | 34–46s | Referrals page → copy link → cut to second phone: friend signs up → back to referrals page: "Went Premium: 1 · Earned: GHS 5" → phone: MoMo credit alert | "Here's the best part: I shared my link, my friend upgraded — and GHS 5 landed in my MoMo instantly. Moolre Disbursements pays my users to grow the platform." |
| 6 | 46–56s | Quick montage: cover letter generating, interview prep, applications tracker | "Cover letters, interview prep, application tracking — a full career agent, built for Ghana." |
| 7 | 56–60s | Logo + "careeros.live" + "Vote CareerOS — Moolre Startup Cup" | "CareerOS. Stop guessing. Start landing. Vote for us in the Moolre Startup Cup." |

**Production notes:**
- Shot 5 is the money shot — a real MoMo credit alert on camera is unbeatable proof. Do a real GHS 5 payout to a second SIM.
- Keep cursor movements slow; trim dead time in editing.
- Add captions — most viewers watch muted.
- If Sender ID approval hasn't landed by film day, shoot Shot 1 last or use the sandbox.

---

## 2. Submission Form Answers (draft — adjust word limits to fit)

**Product name:** CareerOS

**One-line description:**
AI career agent for African job seekers — know your CV's match score before you apply, upgrade with MoMo, earn cash referrals via Moolre.

**The problem:**
Ghanaian job seekers send dozens of applications and hear nothing back — because they apply blind to roles they don't match. Each application costs data, time, and hope. Meanwhile employers drown in unqualified CVs. Youth unemployment isn't just a jobs shortage; it's a matching failure.

**The solution:**
CareerOS reads your CV, extracts your skills with AI, and scores your fit against any job before you apply — with a breakdown of exactly which skills to add. It aggregates 9+ job sources, generates tailored cover letters, preps you for interviews, and tracks every application. Free to start, GHS 25/month for unlimited analysis.

**How we leverage Moolre (3 API families, 5 endpoints):**
1. **Collections — hosted payment links** for premium checkout (MTN, Telecel, AirtelTigo, card), with server-side transaction verification on every webhook.
2. **Collections — direct USSD prompt** (`/open/transact/payment`): users type their MoMo number and approve on their phone. No redirect, no card, works the way Ghana actually pays.
3. **Disbursements** (`/open/transact/transfer`): GHS 5 referral rewards paid instantly to the referrer's wallet when their friend goes premium — Moolre powers our growth loop itself.
4. **Name validation** (`/open/transact/validate`): every payout wallet is name-verified before saving, so rewards can't go to mistyped numbers.
5. **SMS** (`/open/sms/send`): daily job alerts by text — reaching the many job seekers who don't live in email.

**Market potential:**
1.7M+ unemployed or underemployed young Ghanaians; every one of them applies for jobs. Freemium converts at the moment of highest motivation (an active job hunt). The referral engine makes every premium user a paid distributor via Moolre rails. Expansion path: Nigeria and Kenya (job sources already integrated), plus an employer side — pre-scored candidate pools from GHS 500/listing.

**Traction:**
Live at careeros.live. Full production stack (Next.js, Clerk auth, Neon Postgres, Sentry, PostHog), 35 API endpoints, automated quality gate on every push. [Add current user/CV/analysis numbers before submitting.]

**Team:**
Richard Winner Duvor — solo full-stack founder. Built the entire product end-to-end.

---

## 3. Email to Moolre Support — Sender ID Approval

**To:** support@moolre.com
**Subject:** Startup Cup entrant — Sender ID approval request ("CareerOS", VAS ID 9414)

Hi Moolre team,

I'm building CareerOS (careeros.live), an entry in the Moolre Startup Cup 2026, and I need my SMS Sender ID approved to complete our integration before the July 13 submission deadline.

- Account: Durabel Technologies (COS)
- VAS ID: 9414
- Sender ID: **CareerOS** (currently showing "Pending")
- Use case: opt-in daily job alerts to registered users of our career platform

Our integration already uses your Collections (hosted links + direct USSD payment), Disbursements, and account validation APIs in production; SMS is the final piece. Given the competition timeline, I'd be grateful for an expedited review.

Happy to provide any verification documents you need.

Thank you,
Richard Winner Duvor
CareerOS · careeros.live · duvorrichardwinner@gmail.com

---

## 4. Vote Campaign Copy

### X/Twitter launch thread (pin tweet 1)

**1/** Ghanaian job seekers apply to 30+ jobs and hear back from none.

Not because they're unqualified. Because they're applying blind.

I built CareerOS to fix that — and it's live in the Moolre Startup Cup. 🧵

**2/** Upload your CV. Pick any job. CareerOS tells you your match score BEFORE you apply — plus the exact skills you're missing.

Stop wasting data and hope on roles you had no shot at.

**3/** Built for how Ghana actually works:
📱 Job alerts by SMS — no email needed
💳 Upgrade by approving a MoMo prompt on your phone — no card, no redirect
💸 Refer a friend who upgrades → GHS 5 straight to your MoMo

All running on @moolre rails.

**4/** Free to start. 3 full analyses every month, forever.

Try it: careeros.live

**5/** We're competing for the Moolre Startup Cup — public votes decide the finalists.

If you believe African job seekers deserve better tools, vote CareerOS: startup.moolre.com/leaderboard

30 seconds. It genuinely matters. 🙏

### WhatsApp — personal blast (contacts)

> Chale, I built something 🚀 CareerOS checks your CV against any job and tells you your match score BEFORE you apply — free to try at careeros.live. I'm in the Moolre Startup Cup and public votes pick the finalists. Please vote for CareerOS here (takes 30 secs): startup.moolre.com/leaderboard 🙏 And share with anyone job hunting!

### WhatsApp — groups/communities version

> If you or anyone you know is job hunting in Ghana 👇
> CareerOS = upload your CV, see your match score for any job before you apply, get job alerts by SMS, and earn GHS 5 to your MoMo for referrals.
> Free to start: careeros.live
> We're a Ghanaian entry in the Moolre Startup Cup — vote for us: startup.moolre.com/leaderboard

### LinkedIn post

> After watching talented friends send 30+ applications into the void, I built CareerOS — an AI career agent for African job seekers.
>
> It reads your CV, scores your fit against any job *before* you apply, and shows exactly which skills to add. Job alerts arrive by SMS. Premium costs GHS 25 and you pay by approving a MoMo prompt on your phone. Refer a friend and GHS 5 lands in your mobile wallet — instantly, via Moolre's disbursement API.
>
> We're live at careeros.live and competing in the Moolre Startup Cup 2026, where public votes decide the finalists.
>
> If you believe the African job market deserves better infrastructure, a vote takes 30 seconds: startup.moolre.com/leaderboard
>
> #Ghana #Fintech #CareerTech #MoolreStartupCup

### Vote reminder (reusable, days 5–10)

> ⏰ [X] days left! CareerOS is Ghana's AI career agent — match scores before you apply, SMS job alerts, MoMo everything. Vote: startup.moolre.com/leaderboard

---

## 5. 10-Day Campaign Calendar (Jul 3 → Jul 13)

| Day | Action |
|-----|--------|
| Jul 3 (today) | Send Moolre support email. Post X thread + LinkedIn post. Personal WhatsApp blast to 30 closest contacts. |
| Jul 4 | WhatsApp groups push (tech, university, church, alumni). Ask 5 friends to repost the thread. |
| Jul 5 | Film the explainer video (payout shot needs wallet funded + second SIM). |
| Jul 6 | Edit video, add captions. Post a 15-sec teaser clip on X/IG/TikTok. |
| Jul 7 | **Submit the entry** — form answers above + video + demo link. Do not wait for the 13th. |
| Jul 8 | Post full video everywhere. "We've officially submitted" post — momentum framing. |
| Jul 9 | Testimonial push: screenshot a real user's match score (permission!), quote-post it. |
| Jul 10 | Vote reminder round 1. DM every group again with the reminder copy. |
| Jul 11 | Behind-the-scenes post: "solo founder, X days, 3 Moolre APIs" builder story — builders vote for builders. |
| Jul 12 | Vote reminder round 2 + thank-you post tagging supporters. |
| Jul 13 | Final push: "last day" story/status everywhere, morning and evening. |

**Multipliers:**
- Every referral share is also a product signup — your GHS 5 loop and your vote campaign are the same motion. Push the referral link and the vote link together.
- Ghana tech communities: Devcongress, GDG Accra, MEST network, Kumasi Hive — post in all of them once, value-first (the product), vote ask second.
- Ask Moolre to feature you — entrants who make their APIs look good are marketing for *them*.
