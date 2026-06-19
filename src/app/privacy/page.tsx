import Link from "next/link";

export const metadata = { title: "Privacy Policy – CareerOS" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-300 px-6 py-16 max-w-3xl mx-auto">
      <Link href="/" className="text-purple-400 text-sm hover:text-purple-300 mb-8 inline-block">← Back</Link>
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-zinc-500 text-sm mb-10">Last updated: June 2026</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-white font-semibold text-base mb-3">What we collect</h2>
          <p>We collect your email address and name when you create an account via Clerk. We also store CVs you upload, job applications you track, and saved jobs — solely to power your CareerOS dashboard.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">How we use it</h2>
          <p>Your data is used exclusively to provide the CareerOS service: CV analysis, job fit scoring, interview prep, and application tracking. We do not sell your data. We do not share it with third parties except the service providers that run the platform (Vercel, Neon, Upstash, Clerk).</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">CV data</h2>
          <p>CVs you upload are stored securely in Vercel Blob storage. CV text is passed to Groq&apos;s AI API for analysis. Groq does not retain your data beyond the API call. You can delete your CV from the Resumes page at any time.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Cookies</h2>
          <p>We use cookies set by Clerk for authentication only. No advertising or tracking cookies are used.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Your rights</h2>
          <p>You can delete your account and all associated data at any time by contacting <a href="mailto:support@careeros.live" className="text-purple-400 hover:underline">support@careeros.live</a>. We will process deletion requests within 30 days.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-3">Contact</h2>
          <p>Questions? Email <a href="mailto:support@careeros.live" className="text-purple-400 hover:underline">support@careeros.live</a>.</p>
        </section>
      </div>
    </div>
  );
}
