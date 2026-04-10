import type { Metadata } from "next";
import "./globals.css";
import Nav from "./components/nav";
import Hero from "./components/hero";
import HowItWorks from "./components/how-it-works";
import WhyItMatters from "./components/why-it-matters";
import Audience from "./components/audience";
import CTA from "./components/cta";
import Logo from "./components/logo";
import SocialLinks from "./components/social-links";
import AuthCheck from "./components/auth-check";

export const metadata: Metadata = {
  title: "CareerOS - Know Before You Apply",
  description:
    "Stop applying to jobs you have no chance at. CareerOS shows you how well you fit before you spend time on applications.",
  keywords: ["career", "job search", "CV", "interview prep", "job fit", "Africa"],
  authors: [{ name: "CareerOS" }],
  openGraph: {
    title: "CareerOS - Know Before You Apply",
    description: "Stop applying to jobs you have no chance at.",
    url: "https://careeros.live",
    siteName: "CareerOS",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CareerOS - Know Before You Apply",
    description: "Stop applying to jobs you have no chance at.",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Nav />

      <AuthCheck>
        <main>
          <Hero />
          <HowItWorks />
          <WhyItMatters />
          <Audience />
          <CTA />
        </main>
      </AuthCheck>

      <footer className="relative border-t border-slate-800 bg-slate-950 py-16">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
        
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <Logo size="sm" variant="icon-only" />
              <span className="text-lg font-semibold text-white">CareerOS</span>
            </div>
            
            <SocialLinks className="text-slate-400 hover:text-white" />
            
            <div className="flex items-center gap-8 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-800/50 text-center">
            <p className="text-sm text-slate-500">
              Built for African job seekers. Launching 2026.
            </p>
            <p className="mt-2 text-xs text-slate-600">
              &copy; {new Date().getFullYear()} CareerOS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
