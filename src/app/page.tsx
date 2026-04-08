import type { Metadata } from "next";
import "./globals.css";
import WaitlistForm from "./components/waitlist-form";

export const metadata: Metadata = {
  title: "CareerOS - Your AI Career Operating System",
  description:
    "Stop applying blindly. CareerOS helps you discover opportunities, assess your job fit, fix your CV, prepare for interviews, and apply with confidence.",
  keywords: [
    "career",
    "job search",
    "AI career",
    "CV optimization",
    "interview prep",
    "job fit",
    "Ghana jobs",
    "Africa jobs",
  ],
  authors: [{ name: "CareerOS" }],
  openGraph: {
    title: "CareerOS - Your AI Career Operating System",
    description:
      "Stop applying blindly. Know which jobs fit you, what is holding you back, and how to improve before you apply.",
    url: "https://careeros.ai",
    siteName: "CareerOS",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CareerOS - Your AI Career Operating System",
    description:
      "Stop applying blindly. Know which jobs fit you, what is holding you back, and how to improve before you apply.",
    creator: "@careeros",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-sm font-medium text-cyan-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400"></span>
            </span>
            Coming soon
          </div>

          <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            <span className="text-white">Stop applying</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              blindly.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl">
            CareerOS helps you discover opportunities, assess your job fit, fix
            your CV, and prepare for interviews — with clarity, not guesswork.
          </p>

          <div className="mt-10">
            <WaitlistForm />
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Join early. Be first to know when we launch.
          </p>
        </div>

        <section className="mt-24 grid gap-8 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-cyan-400/30 hover:bg-white/10"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/20">
                <feature.icon className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-24 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Know where you stand
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Get honest fit analysis before you spend time on applications. See
            exactly where you match, where you fall short, and what to do about
            it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-cyan-400">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
            Built for the ambitious
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {audiences.map((audience) => (
              <div
                key={audience.title}
                className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <div className="shrink-0 text-2xl">{audience.emoji}</div>
                <div>
                  <h3 className="font-semibold text-white">{audience.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {audience.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24 rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/10 to-transparent p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to apply smarter?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-slate-300">
            Join the waitlist and be among the first to experience CareerOS when
            we launch.
          </p>
          <div className="mt-8">
            <WaitlistForm variant="secondary" />
          </div>
        </section>

        <footer className="mt-24 border-t border-white/10 pt-8 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} CareerOS. Built for ambitious careers.</p>
        </footer>
      </main>
    </div>
  );
}

const features = [
  {
    title: "Know your fit",
    description:
      "Upload your CV and understand how well you match the roles you want before you apply.",
    icon: CheckIcon,
  },
  {
    title: "Fix your gaps",
    description:
      "Get clear CV improvements, missing-skill guidance, and tailored recommendations that actually move you forward.",
    icon: SparkleIcon,
  },
  {
    title: "Apply with confidence",
    description:
      "Generate stronger application materials and prepare for interviews with role-specific guidance.",
    icon: RocketIcon,
  },
];

const stats = [
  { value: "10x", label: "Faster job matching" },
  { value: "80%", label: "Less application time" },
  { value: "100%", label: "Honest feedback" },
];

const audiences = [
  {
    emoji: "🎓",
    title: "Students & Graduates",
    description:
      "Turn limited experience into credible applications. Find internship and entry-level roles that actually fit.",
  },
  {
    emoji: "💼",
    title: "Early-career professionals",
    description:
      "Move up faster. Understand what each role needs and how to position yourself for the next level.",
  },
  {
    emoji: "🔄",
    title: "Career switchers",
    description:
      "Understand if your shift is realistic. Find the bridge between where you are and where you want to be.",
  },
  {
    emoji: "🚀",
    title: "The ambitious",
    description:
      "Apply to roles that match your actual potential. Stop wasting time on jobs you&apos;ll never get.",
  },
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
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
      strokeWidth={2}
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
      strokeWidth={2}
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
