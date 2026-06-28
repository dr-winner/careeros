export default function FeaturesSection() {
  const features = [
    {
      title: "Know your fit",
      description:
        "Upload your CV and get an honest AI breakdown of how well you match any role — before you spend a minute applying.",
      color: "cyan",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      title: "Fix your gaps",
      description:
        "Get specific recommendations on what skills you're missing and how to improve your CV for each role you target.",
      color: "purple",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      ),
    },
    {
      title: "Apply with confidence",
      description:
        "Generate tailored cover letters and prepare for interviews with questions matched to the actual job requirements.",
      color: "amber",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      ),
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    cyan:   { bg: "bg-cyan-500/10",   text: "text-cyan-400",   border: "border-cyan-500/20" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
    amber:  { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/20" },
  };

  return (
    <section className="relative py-24 px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d18] to-[#0a0a0f]" />

      <div className="relative mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/20 px-4 py-2 mb-6">
            <span className="mono text-xs text-purple-300">What CareerOS does</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything you need to <span className="gradient-text">stand out</span>
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Stop guessing. Get clear, actionable guidance at every stage of your job search.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => {
            const c = colorMap[f.color];
            return (
              <div key={f.title} className={`agent-card p-6 border ${c.border}`}>
                <div className={`h-12 w-12 rounded-xl ${c.bg} flex items-center justify-center ${c.text} mb-5`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 agent-card p-8 border border-purple-500/10">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">Your career, demystified</h3>
              <p className="text-zinc-400 mb-6 leading-relaxed">
                Most platforms show you job listings. CareerOS shows you where you stand,
                what&apos;s missing, and how to close the gap — before you apply.
              </p>
              <ul className="space-y-3">
                {[
                  "Honest fit scores, not vanity metrics",
                  "Role-specific CV improvements",
                  "Skills gap analysis",
                  "Interview questions matched to real requirements",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="h-3 w-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-black/40 border border-white/5 p-5 font-mono text-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-400" />
                  <span className="text-xs text-zinc-500">fit_analysis</span>
                </div>
                <span className="text-xs text-green-400">done</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Match Score</span>
                  <span className="text-sm font-bold text-green-400">87%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-purple-500 to-cyan-500" />
                </div>
                <div className="pt-2 space-y-2 text-xs">
                  <div className="flex items-center gap-2"><span className="text-green-400">✓</span><span className="text-zinc-400">React, TypeScript, Node.js</span></div>
                  <div className="flex items-center gap-2"><span className="text-amber-400">~</span><span className="text-zinc-400">AWS: learning curve</span></div>
                  <div className="flex items-center gap-2"><span className="text-red-400">✗</span><span className="text-zinc-400">No fintech experience</span></div>
                </div>
                <div className="pt-3 border-t border-white/5">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Apply. Highlight TypeScript depth in cover letter. Add AWS cert.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
