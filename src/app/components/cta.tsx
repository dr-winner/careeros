import WaitlistForm from "./waitlist-form";

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
          Launching soon.
        </h2>
        
        <p className="mx-auto mt-6 max-w-xl text-xl text-slate-400 leading-relaxed">
          Join the waitlist and be first to know when CareerOS goes live.
          We&apos;ll send you one email when we&apos;re ready.
        </p>

        <div className="mt-12">
          <WaitlistForm />
        </div>

        <div className="mt-10 flex items-center justify-center gap-8 text-sm text-slate-500">
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Free to join
          </span>
          <span className="h-4 w-px bg-slate-700" />
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            One notification
          </span>
          <span className="h-4 w-px bg-slate-700" />
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            No spam
          </span>
        </div>

        <div className="mt-16 p-6 rounded-2xl glass inline-block">
          <p className="text-slate-400 text-sm">
            <span className="text-white font-medium">Expected launch:</span> Early 2026
            <span className="mx-3 text-slate-600">•</span>
            <span className="text-white font-medium">Limited early access</span> for waitlist members
          </p>
        </div>
      </div>
    </section>
  );
}
