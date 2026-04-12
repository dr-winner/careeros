import type { Metadata } from "next";
import "./globals.css";
import Nav from "./components/nav";
import Hero from "./components/hero";
import HowItWorks from "./components/how-it-works";
import CTA from "./components/cta";
import Logo from "./components/logo";
import SocialLinks from "./components/social-links";
import AuthCheck from "./components/auth-check";

export const metadata: Metadata = {
  title: "CareerOS - Your AI Career Agent",
  description:
    "Stop applying blind. Your AI career agent analyzes job fit, optimizes your CV, and prepares you for interviews.",
  keywords: ["career", "job search", "AI", "CV", "interview prep", "job fit", "Africa"],
  authors: [{ name: "CareerOS" }],
  openGraph: {
    title: "CareerOS - Your AI Career Agent",
    description: "Stop applying blind. Your AI career agent is ready.",
    url: "https://careeros.live",
    siteName: "CareerOS",
    locale: "en_US",
    type: "website",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Nav />

      <AuthCheck>
        <main>
          <Hero />
          <HowItWorks />
          <CTA />
        </main>
      </AuthCheck>

      {/* Noise overlay */}
      <div className="noise-overlay" />

      <footer className="relative border-t border-white/5 py-16">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />

        <div className="relative mx-auto max-w-5xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <Logo size="sm" variant="icon-only" />
              <span className="text-base font-semibold text-white">CareerOS</span>
              <div className="agent-status rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 ml-4">
                <div className="status-dot" />
                <span className="mono text-xs text-purple-300">Agent Online</span>
              </div>
            </div>

            <SocialLinks className="text-zinc-500 hover:text-white" />

            <div className="flex items-center gap-6 mono text-xs text-zinc-600">
              <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
              <a href="#" className="hover:text-zinc-400 transition-colors">Contact</a>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="mono text-xs text-zinc-600">
              Built for African job seekers. Powered by AI.
            </p>
            <p className="mono text-xs text-zinc-700 mt-2">
              &copy; {new Date().getFullYear()} CareerOS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
