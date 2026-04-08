const features = [
  {
    title: "Know your fit",
    description:
      "Upload your CV and get an honest breakdown of how well you match any role before you apply.",
    icon: TargetIcon,
    color: "cyan",
  },
  {
    title: "Fix your gaps",
    description:
      "Get specific recommendations on what skills you need and how to improve your CV for each role.",
    icon: SparkleIcon,
    color: "purple",
  },
  {
    title: "Apply with confidence",
    description:
      "Generate tailored cover letters and prepare for interviews with questions based on the actual role.",
    icon: RocketIcon,
    color: "amber",
  },
];

const colorClasses = {
  cyan: {
    bg: "bg-cyan-400/10",
    border: "group-hover:border-cyan-400/30",
    icon: "text-cyan-400",
    glow: "group-hover:shadow-cyan-400/10",
  },
  purple: {
    bg: "bg-purple-400/10",
    border: "group-hover:border-purple-400/30",
    icon: "text-purple-400",
    glow: "group-hover:shadow-purple-400/10",
  },
  amber: {
    bg: "bg-amber-400/10",
    border: "group-hover:border-amber-400/30",
    icon: "text-amber-400",
    glow: "group-hover:shadow-amber-400/10",
  },
};

export default function Features() {
  return (
    <section className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Everything you need to{" "}
            <span className="text-gradient">stand out</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            Stop guessing. Get clear, actionable guidance at every stage of your
            job search.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, index) => {
            const colors = colorClasses[feature.color as keyof typeof colorClasses];
            return (
              <div
                key={feature.title}
                className={`group card-hover glass-strong rounded-3xl border border-white/5 p-8 ${colors.border} ${colors.glow}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${colors.bg}`}
                >
                  <feature.icon className={`h-7 w-7 ${colors.icon}`} />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="leading-relaxed text-slate-400">
                  {feature.description}
                </p>

                <div className="mt-6 flex items-center gap-2 text-sm text-slate-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span>Learn more</span>
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-8 md:p-12">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <h3 className="text-2xl font-bold text-white sm:text-3xl">
                Your career,{" "}
                <span className="text-gradient-warm">demystified</span>
              </h3>
              <p className="mt-4 text-slate-400">
                Most job platforms show you listings. CareerOS shows you the
                path. Understand exactly where you stand, what you need to work
                on, and how to get there.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "Honest fit scores, not vanity metrics",
                  "Role-specific CV improvements",
                  "Skill gap analysis with learning paths",
                  "Interview questions based on real job requirements",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-slate-300"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                      <svg
                        className="h-3.5 w-3.5 text-green-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-transparent to-transparent z-10" />
              <div className="glass rounded-2xl border border-white/10 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">fit_score:</span>
                    <span className="text-cyan-400">87%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-green-400"
                      style={{ width: "87%" }}
                    />
                  </div>
                  <div className="pt-4 space-y-2">
                    <div className="text-green-400">✓ 5 years React</div>
                    <div className="text-green-400">✓ TypeScript expert</div>
                    <div className="text-yellow-400">~ Node.js basics</div>
                    <div className="text-red-400">✗ AWS certification</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
      />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
      />
    </svg>
  );
}

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
      />
    </svg>
  );
}
