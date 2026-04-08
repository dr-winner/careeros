import WaitlistForm from "./waitlist-form";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="animate-fade-in mb-8 inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-5 py-2 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
          </span>
          <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-sm font-medium text-transparent">
            Launching 2026 — Join the movement
          </span>
        </div>

        <h1 className="animate-slide-up text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
          <span className="text-slate-100">Stop applying</span>
          <br />
          <span className="text-gradient animate-gradient bg-[length:200%_200%]">
            blindly.
          </span>
        </h1>

        <p className="animate-slide-up delay-100 mx-auto mt-8 max-w-2xl text-lg text-slate-400 sm:text-xl md:text-2xl">
          Know which jobs fit you, what is holding you back, and how to
          improve — before you waste time applying.
        </p>

        <div className="animate-slide-up delay-200 mt-12">
          <WaitlistForm />
        </div>

        <p className="animate-slide-up delay-300 mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
          <svg
            className="h-4 w-4 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
          <span>Free to join. No credit card required.</span>
        </p>

        <div className="animate-slide-up delay-400 mt-16">
          <div className="glass-strong inline-flex items-center gap-8 rounded-2xl px-8 py-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">2,847+</div>
              <div className="text-xs text-slate-400">On the waitlist</div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">100%</div>
              <div className="text-xs text-slate-400">Honest feedback</div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">10x</div>
              <div className="text-xs text-slate-400">Faster matching</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg
          className="h-6 w-6 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </div>
    </section>
  );
}
