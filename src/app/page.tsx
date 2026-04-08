import type { Metadata } from "next";
import "./globals.css";
import AnimatedBackground from "./components/animated-background";
import Hero from "./components/hero";
import Features from "./components/features";
import Stats from "./components/stats";
import Audience from "./components/audience";
import FinalCTA from "./components/final-cta";

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
    url: "https://careeros.live",
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
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />

      <main className="relative z-10">
        <Hero />
        <Features />
        <Stats />
        <Audience />
        <FinalCTA />

        <footer className="border-t border-white/5 py-12">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="text-sm text-slate-400">Launching 2026</span>
            </div>
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} CareerOS. Built for ambitious
              careers.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
