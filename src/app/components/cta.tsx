import Link from "next/link";

export default function CTA() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-950" />
      
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.015) 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/10 blur-[150px] rounded-full" />
      
      <div className="relative mx-auto max-w-3xl text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-2xl shadow-amber-500/30 mb-8">
          <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">
          Ready to get started?
        </h2>
        
        <p className="mx-auto mt-6 max-w-xl text-xl text-slate-400 leading-relaxed">
          Create your free account and start finding jobs that actually fit you.
          No more wasting time on positions you have no chance at.
        </p>

        <div className="mt-12">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-105"
          >
            Create Free Account
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        <div className="mt-10 flex items-center justify-center gap-8 text-sm text-slate-500">
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Free to start
          </span>
          <span className="h-4 w-px bg-slate-700" />
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            AI-powered insights
          </span>
          <span className="h-4 w-px bg-slate-700" />
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Cancel anytime
          </span>
        </div>

        <div className="mt-16 p-6 rounded-2xl glass inline-block">
          <p className="text-slate-400 text-sm">
            <span className="text-white font-medium">Built for African job seekers.</span>
            <span className="mx-3 text-slate-600">•</span>
            <span className="text-white font-medium">5+ job sources</span>
            <span className="mx-3 text-slate-600">•</span>
            <span className="text-white font-medium">AI cover letters</span>
          </p>
        </div>
      </div>
    </section>
  );
}
