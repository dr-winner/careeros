import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950" />
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-amber-500/10 blur-[100px] animate-pulse-glow delay-200" />
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[80px]" />
      </div>

      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />

      <div className="absolute top-20 left-20 w-72 h-72 border border-emerald-500/10 rounded-full animate-float" />
      <div className="absolute bottom-32 right-20 w-48 h-48 border border-amber-500/10 rounded-full animate-float delay-300" />
      <div className="absolute top-40 right-1/3 w-32 h-32 border border-cyan-500/10 rounded-full animate-spin-slow" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        <div className="animate-fade-up mb-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-2 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-sm font-medium text-emerald-300">
              Live now — Start your free trial
            </span>
          </div>
        </div>

        <h1 className="animate-fade-up delay-100 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
          <span className="text-slate-100">Stop applying</span>
          <br />
          <span className="text-gradient">blindly.</span>
        </h1>

        <p className="animate-fade-up delay-200 mx-auto mt-8 max-w-2xl text-lg text-slate-400 sm:text-xl md:text-2xl leading-relaxed">
          Know which jobs fit you, what is holding you back, and how to
          improve — before you waste time applying.
        </p>

        <div className="animate-fade-up delay-300 mt-12 flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-105"
          >
            Get Started Free
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-lg font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10"
          >
            Sign In
          </Link>
        </div>

        <p className="animate-fade-up delay-400 mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <span>Free to start. No credit card required.</span>
        </p>

        <div className="animate-fade-up delay-500 mt-20">
          <div className="glass inline-flex items-center gap-8 rounded-2xl px-10 py-5">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">79+</div>
              <div className="text-xs text-slate-400 mt-1">Jobs aggregated</div>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-white">100%</div>
              <div className="text-xs text-slate-400 mt-1">Honest feedback</div>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-white">10x</div>
              <div className="text-xs text-slate-400 mt-1">Faster matching</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
    </section>
  );
}
