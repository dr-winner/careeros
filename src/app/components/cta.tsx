import Link from "next/link";
import Logo from "@/app/components/logo";

export default function CTA() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d18] to-[#0a0a0f]" />

      {/* Ambient glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-purple-500/8 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.018) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto max-w-3xl text-center animate-fade-up">
        {/* Icon */}
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/10 shadow-2xl mb-8">
          <Logo variant="mark" size="lg" />
        </div>

        <h2 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl leading-tight">
          Ready to optimize <br />
          <span className="gradient-text">your job search?</span>
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400 leading-relaxed">
          Create a free account in seconds. Get an instant match analysis of your CV against any job requirements, identify skill gaps, and apply with confidence.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="agent-button agent-button-primary !px-8 !py-4 !text-base press-scale group"
          >
            Launch for free
            <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            href="/sign-in"
            className="mono text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Already have an account? Sign in →
          </Link>
        </div>

        {/* Trust row */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
          {[
            { icon: "M4.5 12.75l6 6 9-13.5", label: "Free to start" },
            { icon: "M4.5 12.75l6 6 9-13.5", label: "Detailed fit analysis" },
            { icon: "M4.5 12.75l6 6 9-13.5", label: "Local MoMo & Card payments" },
            { icon: "M4.5 12.75l6 6 9-13.5", label: "Earn GHS 5 per referral, paid to MoMo" },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-2 mono text-sm text-zinc-500">
              <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </span>
          ))}
        </div>

        {/* Social proof strip */}
        <div className="mt-14 inline-flex items-center gap-4 px-6 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <span className="mono text-xs text-zinc-500">Built for African job seekers</span>
          <span className="h-3 w-px bg-white/10" />
          <span className="mono text-xs text-zinc-500">9+ live job sources</span>
          <span className="h-3 w-px bg-white/10" />
          <span className="mono text-xs text-zinc-500">AI cover letters</span>
        </div>
      </div>
    </section>
  );
}
