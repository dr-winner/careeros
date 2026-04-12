export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Upload your CV",
      description: "Agent parses your skills, experience, and education automatically.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Find a job",
      description: "Browse roles or paste a link. Agent analyzes fit instantly.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Get analysis",
      description: "Agent shows match score, gaps, and optimization tips.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="relative py-32 px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0f18] to-[#0a0a0f]" />
      <div className="absolute inset-0 grid-pattern opacity-50" />

      <div className="relative mx-auto max-w-5xl">
        <div className="mb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/20 px-4 py-2 mb-6">
            <span className="mono text-xs text-purple-300">{"//"} How it works</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Three steps to <span className="gradient-text">confidence</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-zinc-400">
            Stop guessing. Let your career agent show you exactly where you stand.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="agent-card p-6 group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                  {step.icon}
                </div>
                <span className="mono text-3xl font-bold text-white/5 group-hover:text-purple-500/20 transition-colors">
                  {step.number}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="mono text-sm text-zinc-500 leading-relaxed">
                {step.description}
              </p>

              {index < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <svg className="h-5 w-5 text-purple-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Agent Analysis Preview */}
        <div className="mt-20 agent-card p-8">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 mb-4">
                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="mono text-xs text-cyan-300">Agent Analysis Preview</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                See what the agent sees
              </h3>
              <p className="text-zinc-400 leading-relaxed mb-6">
                Your career agent analyzes every job against your profile and gives you
                honest, specific feedback — not generic advice.
              </p>
              <ul className="space-y-3">
                {[
                  { text: "Match score calculated from your skills", color: "green" },
                  { text: "Specific gaps identified", color: "amber" },
                  { text: "CV optimization tips", color: "purple" },
                  { text: "Interview questions matched to role", color: "cyan" },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded-full bg-${item.color}-500/20 flex items-center justify-center`}>
                      <svg className={`h-3 w-3 text-${item.color}-400`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-zinc-300 text-sm">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Analysis Card */}
            <div className="rounded-xl bg-black/40 border border-white/5 p-5 font-mono">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-400" />
                  <span className="text-xs text-zinc-500">fit_analysis.json</span>
                </div>
                <span className="text-xs text-green-400">completed</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">match_score</span>
                  <span className="text-sm font-bold text-green-400">87%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-purple-500 to-cyan-500" />
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-400">+</span>
                    <span className="text-zinc-400">React, TypeScript, Node.js</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-amber-400">~</span>
                    <span className="text-zinc-400">AWS: learning</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-red-400">-</span>
                    <span className="text-zinc-400">No fintech exp.</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <div className="text-xs text-purple-400 mb-1">$ recommendation</div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Apply. Add AWS cert. Highlight TypeScript depth in cover letter.
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
