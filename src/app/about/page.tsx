import Link from "next/link";

export const metadata = {
  title: "About — CareerOS",
  description: "CareerOS is an AI-powered job search platform built for African job seekers, starting with Ghana.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link href="/" className="gradient-text font-bold text-xl">
            CareerOS
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/sign-in" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link href="/sign-up" className="agent-button agent-button-primary text-sm py-2 px-4">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-20">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="mono text-xs text-purple-300">Moolre Startup Cup 2026 Entry</span>
          </div>
          <h1 className="text-4xl font-bold mb-6">
            Built for African job seekers.
            <br />
            <span className="gradient-text">Starting with Ghana.</span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            CareerOS is an AI-powered career platform that helps you find jobs, understand your fit,
            and prepare your application — before you spend a single minute applying.
          </p>
        </div>

        {/* What we do */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-6 text-white">What CareerOS does</h2>
          <div className="grid gap-4">
            {[
              {
                title: "Job aggregation",
                desc: "We pull live jobs from 9 sources — including Greenhouse, The Muse, Adzuna, Remotive, and more — filtered and presented for the African market.",
              },
              {
                title: "AI fit analysis",
                desc: "Upload your CV and we use GPT-4o-mini and Claude Sonnet to compare your skills against the job requirements. No fabricated scores — the analysis is based on what's actually in your profile.",
              },
              {
                title: "CV feedback",
                desc: "Get honest, specific feedback on your CV: what works, what's missing, and what to change. Premium users get a fully rewritten, ATS-optimised version.",
              },
              {
                title: "Interview prep",
                desc: "Practice with AI-generated questions tailored to the role. Available in text and voice formats.",
              },
              {
                title: "Application tracking",
                desc: "Track every application in one place — status, next steps, and follow-up reminders.",
              },
            ].map((item) => (
              <div key={item.title} className="agent-card p-5">
                <div className="font-medium text-white mb-1">{item.title}</div>
                <div className="text-sm text-zinc-400 leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Honest section */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4 text-white">What we don&apos;t claim</h2>
          <div className="agent-card p-6 border border-amber-500/20">
            <p className="text-zinc-300 leading-relaxed text-sm">
              We don&apos;t publish match accuracy statistics or interview rate improvements — we don&apos;t have
              the user volume or research to back those numbers honestly. What we do is use real AI
              (not keyword regex) to give you a genuine assessment of your fit for a role. The
              quality of that analysis depends on what you put in: the more complete your profile
              and CV, the better the output.
            </p>
          </div>
        </section>

        {/* Tech */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-6 text-white">Built with</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              "Next.js (App Router)",
              "Clerk Auth",
              "Neon PostgreSQL",
              "Prisma ORM",
              "GPT-4o-mini",
              "Claude Sonnet",
              "Groq (fallback AI)",
              "Vercel Edge",
              "Moolre Payments",
            ].map((tech) => (
              <div key={tech} className="mono text-xs text-zinc-400 bg-white/5 rounded-lg px-3 py-2">
                {tech}
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4 text-white">Contact</h2>
          <div className="space-y-2 text-sm text-zinc-400">
            <p>General: <a href="mailto:support@careeros.live" className="text-purple-400 hover:text-purple-300">support@careeros.live</a></p>
            <p>Security: <a href="mailto:security@careeros.live" className="text-purple-400 hover:text-purple-300">security@careeros.live</a></p>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pt-8 border-t border-white/5">
          <Link href="/sign-up" className="agent-button agent-button-primary">
            Get started — it&apos;s free
          </Link>
          <p className="mt-4 mono text-xs text-zinc-600">No credit card required</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="mx-auto max-w-4xl flex flex-wrap gap-6 justify-center text-xs text-zinc-600">
          <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
          <a href="mailto:support@careeros.live" className="hover:text-zinc-400 transition-colors">Contact</a>
        </div>
      </footer>
    </main>
  );
}
