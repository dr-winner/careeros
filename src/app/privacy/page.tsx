import Link from "next/link";

export const metadata = { title: "Privacy Policy – CareerOS" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-300 px-6 py-16 max-w-3xl mx-auto">
      <Link href="/" className="text-purple-400 text-sm hover:text-purple-300 mb-8 inline-block">← Back</Link>
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-zinc-500 text-sm mb-10">Last updated: September 2026</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-white font-semibold text-base mb-3">What we collect</h2>
          <p>When you create an account through Clerk we receive your name and email address. Inside CareerOS you may add a professional headline, experience summary, target role, country and phone number; upload CVs; save jobs; track applications; set up job alerts; and, if you use referrals, a mobile money number for payouts. We also record which features you use (for example that an analysis was run) so we can operate quotas and improve the product.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">How we use it</h2>
          <p>Your data is used to provide CareerOS: extracting skills from your CV, scoring your fit against jobs, generating cover letters and interview practice, sending the alerts you asked for, processing payments and referral payouts, and supporting you. We do not sell your personal data and we do not share it with advertisers.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Service providers we rely on</h2>
          <p>We share only the data each provider needs to do its job:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-zinc-400">
            <li><span className="text-zinc-300">Clerk</span> — authentication and account management.</li>
            <li><span className="text-zinc-300">Vercel</span> (hosting) and <span className="text-zinc-300">Neon</span> (database) — running the app and storing your account data. Uploaded CV files are stored in Vercel Blob.</li>
            <li><span className="text-zinc-300">Upstash</span> — rate limiting and short-lived caching of public job listings.</li>
            <li><span className="text-zinc-300">AI providers</span> (OpenAI, Groq and, for some Premium features, Anthropic) — CV text, your profile fields and the job advert are sent to generate analyses, cover letters and interview feedback. Requests are processed under the providers&apos; API terms, which do not permit training on your data.</li>
            <li><span className="text-zinc-300">Moolre</span> — payments and mobile-money payouts. Moolre receives your email, the amount and, for payouts, the wallet number you provide.</li>
            <li><span className="text-zinc-300">Resend</span> — transactional email and job alerts.</li>
            <li><span className="text-zinc-300">PostHog</span> — product analytics (see below).</li>
            <li><span className="text-zinc-300">Sentry</span> — error monitoring so we can fix crashes (see below).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Analytics and error monitoring</h2>
          <p>We use PostHog to understand how the product is used — for example which pages are visited, whether an analysis was completed and whether a paywall was shown. When you are signed in these events are linked to your account (user ID, name and email) so we can see the journey of real users and fix drop-off points. We use Sentry to capture errors; Sentry may record the page state around an error, including session replays, to help us reproduce bugs. We do not use this data for advertising. If you would like your analytics data deleted, email us and we will remove it.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Cookies and local storage</h2>
          <p>Clerk sets cookies to keep you signed in. PostHog sets a first-party cookie to recognise repeat visits. If you arrive through a referral link we store a short-lived cookie so the person who referred you gets credit when you sign up. We use browser local storage to remember onboarding progress and a job-fit preview you ran before signing up. We do not use advertising cookies.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Job listings</h2>
          <p>Jobs you see are fetched from public job boards and company career pages. Searching does not send your personal data to those sources. When you click Apply you leave CareerOS and the destination site&apos;s privacy policy applies.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Retention and deletion</h2>
          <p>We keep your data while your account is active. You can delete individual CVs from the Resumes page at any time. To delete your whole account and all associated data, email <a href="mailto:support@careeros.live" className="text-purple-400 hover:underline">support@careeros.live</a> from your account address; we complete deletion requests within 30 days, subject to records we must keep for payment reconciliation.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Your rights</h2>
          <p>You can ask us for a copy of the personal data we hold about you, ask us to correct it, or ask us to delete it. We respond within 30 days. Ghana&apos;s Data Protection Act, 2012 (Act 843) applies to our processing.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Contact</h2>
          <p>Questions? Email <a href="mailto:support@careeros.live" className="text-purple-400 hover:underline">support@careeros.live</a>.</p>
        </section>
      </div>
    </div>
  );
}
