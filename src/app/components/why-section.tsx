export default function WhySection() {
  const stats = [
    { value: "Most", label: "applications never get a response — yours don't have to be blind" },
    { value: "9+", label: "live job sources aggregated" },
    { value: "Free", label: "to get started" },
  ];

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-8">
          <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="text-sm text-amber-300 font-medium">The reality</span>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
          The African job market is tough.
          <br />
          <span className="gradient-text">We&apos;re changing that.</span>
        </h2>

        <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed mb-16">
          Too many qualified people apply to the wrong roles, get ignored, and lose
          confidence. CareerOS gives you the clarity to focus your energy where it counts.
        </p>

        <div className="grid gap-6 sm:grid-cols-3 mb-16">
          {stats.map((stat) => (
            <div key={stat.value} className="agent-card p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-3">{stat.value}</div>
              <div className="text-sm text-zinc-400 leading-relaxed">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="agent-card p-8 border border-purple-500/20 text-left">
          <div className="flex items-start gap-5">
            <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Why CareerOS exists</h3>
              <p className="text-zinc-400 leading-relaxed">
                We believe every qualified African professional deserves a fair shot.
                No more shotgun applications, no more rejection after rejection.
                Just clarity, confidence, and a clear path forward — powered by real AI,
                built for the African market.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
