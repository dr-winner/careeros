const audiences = [
  {
    emoji: "🎓",
    title: "Students & Graduates",
    description:
      "Turn limited experience into credible applications. Find internship and entry-level roles that actually fit your skills.",
    gradient: "from-cyan-500/10 to-blue-500/10",
    border: "hover:border-cyan-400/30",
  },
  {
    emoji: "💼",
    title: "Early-career Professionals",
    description:
      "Move up faster. Understand what each role needs and how to position yourself for the next level.",
    gradient: "from-blue-500/10 to-purple-500/10",
    border: "hover:border-blue-400/30",
  },
  {
    emoji: "🔄",
    title: "Career Switchers",
    description:
      "Understand if your shift is realistic. Find the bridge between where you are and where you want to be.",
    gradient: "from-purple-500/10 to-pink-500/10",
    border: "hover:border-purple-400/30",
  },
  {
    emoji: "🚀",
    title: "The Ambitious",
    description:
      "Apply to roles that match your actual potential. Stop wasting time on jobs you will never get.",
    gradient: "from-amber-500/10 to-orange-500/10",
    border: "hover:border-amber-400/30",
  },
];

export default function Audience() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Built for{" "}
            <span className="text-gradient">every career stage</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            Whether you are just starting out or looking to level up, CareerOS
            meets you where you are.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {audiences.map((audience, index) => (
            <div
              key={audience.title}
              className={`group card-hover glass-strong relative overflow-hidden rounded-3xl border border-white/5 ${audience.border} bg-gradient-to-br ${audience.gradient} p-8`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative z-10 flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl backdrop-blur-sm">
                  {audience.emoji}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {audience.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-slate-400">
                    {audience.description}
                  </p>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-2xl transition-transform duration-500 group-hover:scale-150" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
