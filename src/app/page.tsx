import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";
import Nav from "./components/nav";
import Hero from "./components/hero";
import HowItWorks from "./components/how-it-works";
import WhyItMatters from "./components/why-it-matters";
import Audience from "./components/audience";
import CTA from "./components/cta";

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
    <div className="min-h-screen bg-amber-50">
      <Nav />

      <main>
        <Hero />
        <HowItWorks />
        <WhyItMatters />
        <Audience />
        <CTA />
      </main>

      <footer className="border-t border-amber-200 bg-emerald-900 py-12">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Image src="/cs_logo.png" alt="CareerOS" width={64} height={64} className="rounded-lg" />
            <span className="font-semibold text-white">CareerOS</span>
          </div>
          <p className="text-sm text-emerald-300">
            Built for African job seekers. Launching 2026.
          </p>
          <p className="mt-4 text-xs text-emerald-400">
            &copy; {new Date().getFullYear()} CareerOS
          </p>
        </div>
      </footer>
    </div>
  );
}
