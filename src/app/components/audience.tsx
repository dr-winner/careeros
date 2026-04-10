const audiences = [
  {
    emoji: "🎓",
    title: "Students & Graduates",
    description: "Turn limited experience into credible applications. Find internship and entry-level roles that actually fit your skills.",
    gradient: "from-emerald-500/20 to-cyan-500/20",
    icon: "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222",
  },
  {
    emoji: "💼",
    title: "Early-career Professionals",
    description: "Move up faster. Understand what each role needs and how to position yourself for the next level.",
    gradient: "from-blue-500/20 to-purple-500/20",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    emoji: "🔄",
    title: "Career Switchers",
    description: "Understand if your shift is realistic. Find the bridge between where you are and where you want to be.",
    gradient: "from-purple-500/20 to-pink-500/20",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  },
  {
    emoji: "🚀",
    title: "The Ambitious",
    description: "Apply to roles that match your actual potential. Stop wasting time on jobs you will never get.",
    gradient: "from-amber-500/20 to-orange-500/20",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
];

export default function Audience() {
  return (
    <section className="relative py-32 px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-emerald-950/50 to-slate-950" />
      
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full blur-3xl" />
      
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-20 text-center">
          <span className="inline-block px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-6">
            Who it's for
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            Built for{" "}
            <span className="text-gradient">every career stage</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-400">
            Whether you are just starting out or looking to level up, CareerOS
            meets you where you are.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {audiences.map((audience, index) => (
            <div
              key={audience.title}
              className="group relative overflow-hidden rounded-3xl glass-card p-8 card-hover"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${audience.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 flex items-center justify-center text-2xl shadow-lg">
                    {audience.emoji}
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-white mb-3">
                    {audience.title}
                  </h3>
                  <p className="leading-relaxed text-slate-400">
                    {audience.description}
                  </p>
                  
                  <div className="mt-6 flex items-center gap-2 text-emerald-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Learn more</span>
                    <svg className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-2xl transition-transform duration-500 group-hover:scale-150" />
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 text-slate-400">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>And many more career paths...</span>
          </div>
        </div>
      </div>
    </section>
  );
}
