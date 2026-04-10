export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Upload your CV",
      description: "Takes 30 seconds. We extract your skills, experience, and education automatically.",
      icon: (
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Pick a job",
      description: "Browse roles or paste a job link. We compare it against your profile instantly.",
      icon: (
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "See your fit score",
      description: "Get an honest breakdown of matches, gaps, and specific things to improve.",
      icon: (
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="relative py-32 px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      
      <div className="relative mx-auto max-w-5xl">
        <div className="mb-20 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-slate-400">
            Three steps to stop guessing and start applying with confidence.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="group relative glass-card rounded-2xl p-8 card-hover overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl group-hover:from-emerald-500/20 transition-all duration-500" />
              
              <div className="relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    {step.icon}
                  </div>
                  <div className="text-5xl font-bold text-slate-700/50 group-hover:text-emerald-500/30 transition-colors">
                    {step.number}
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {index < steps.length - 1 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-20 rounded-3xl glass-card p-10 md:p-14 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-3xl" />
          
          <div className="grid gap-10 md:grid-cols-2 md:items-center relative">
            <div>
              <h3 className="text-3xl font-bold text-white">
                No more applying blind.
              </h3>
              <p className="mt-5 text-slate-400 leading-relaxed text-lg">
                Most people send CVs to jobs they have no business applying to.
                CareerOS shows you exactly where you stand so you can focus your
                energy on roles where you actually have a shot.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  { text: "Honest assessment, not false hope", color: "emerald" },
                  { text: "Specific gaps, not generic advice", color: "emerald" },
                  { text: "CV suggestions tied to each role", color: "amber" },
                  { text: "Interview questions that match the job", color: "cyan" },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-3">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-${item.color}-500/20`}>
                      <svg className={`h-4 w-4 text-${item.color}-400`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <span className="text-slate-300">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/50">
                <div className="text-sm text-slate-400">Fit Analysis</div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                  Recommended
                </div>
              </div>
              
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-bold text-white">72%</span>
                <span className="text-slate-400">match</span>
              </div>
              
              <div className="space-y-3">
                {[
                  { text: "5 years React experience", color: "emerald" },
                  { text: "TypeScript, Node.js", color: "emerald" },
                  { text: "AWS skills: learning", color: "amber" },
                  { text: "No fintech background", color: "red" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full bg-${item.color}-500`} />
                    <span className="text-slate-300 text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 rounded-xl bg-slate-900/50 p-4 border border-slate-700/50">
                <div className="text-sm font-medium text-emerald-400 mb-2">Recommendation</div>
                <p className="text-sm text-slate-400">
                  Apply, but get AWS basics. Highlight your TypeScript depth in cover letter.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
