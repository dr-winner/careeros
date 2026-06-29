"use client";

import Link from "next/link";
import { useState } from "react";

const FREE_FEATURES = [
  "3 job match analyses / month",
  "Basic match score (% only)",
  "Browse 9+ job sources",
  "CV upload and storage",
  "Application tracking",
];

const PREMIUM_FEATURES = [
  "Unlimited job analyses",
  "Full skill gap breakdown",
  "AI cover letters per job",
  "Interview prep questions",
  "CV optimization suggestions",
  "Priority job alerts",
  "Early access to new features",
];

const EMPLOYER_FEATURES = [
  "Post jobs directly on CareerOS",
  "Pre-scored candidate pool",
  "Filter by match % threshold",
  "Monthly recruiter dashboard",
  "Candidate contact details",
];

export default function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d18] to-[#0a0a0f]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/20 px-4 py-2 mb-6">
            <span className="mono text-xs text-purple-300">Pricing</span>
          </div>
          <h2 className="font-display text-4xl font-bold text-white sm:text-5xl mb-4">
            Start free. <span className="gradient-text">Scale when it works.</span>
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto mb-8">
            Free gets you in the door. Premium makes you competitive. Employers close the loop.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-lg mono text-xs font-medium transition-all ${
                !annual
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-lg mono text-xs font-medium transition-all flex items-center gap-2 ${
                annual
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Annual
              <span className="px-1.5 py-0.5 rounded-md bg-green-500/20 text-green-400 text-[10px]">
                −34%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid gap-5 lg:grid-cols-3">

          {/* Free */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] overflow-hidden flex flex-col">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-500/40 to-transparent" />
            <div className="p-7 flex flex-col flex-1">
              <p className="section-label">Free</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-display text-4xl font-bold text-white">GHS 0</span>
                <span className="text-zinc-500 text-sm">/forever</span>
              </div>
              <p className="mono text-xs text-zinc-600 mb-7">No card needed. No catches.</p>

              <ul className="space-y-3 mb-8 flex-1">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <div className="h-4 w-4 rounded-full bg-zinc-700/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="h-2.5 w-2.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-zinc-400">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-sm font-medium text-zinc-300 hover:text-white hover:border-white/20 transition-all press-scale"
              >
                Get started free
              </Link>
            </div>
          </div>

          {/* Premium — highlighted */}
          <div className="rounded-2xl border border-purple-500/30 bg-[#0d0d18] overflow-hidden flex flex-col relative">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 mono text-[10px] font-bold text-white uppercase tracking-wider">
                Most popular
              </span>
            </div>
            <div className="p-7 pt-9 flex flex-col flex-1">
              <p className="section-label">Premium</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-display text-4xl font-bold gradient-text">
                  GHS {annual ? "199" : "25"}
                </span>
                <span className="text-zinc-500 text-sm">/{annual ? "year" : "month"}</span>
              </div>
              {annual ? (
                <p className="mono text-xs text-green-400 mb-7">
                  GHS 16.58/month · save GHS 101/year
                </p>
              ) : (
                <p className="mono text-xs text-zinc-600 mb-7">
                  Cancel anytime · billed via Moolre
                </p>
              )}

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-3">
                  <div className="h-4 w-4 rounded-full bg-zinc-700/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="h-2.5 w-2.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-zinc-400">Everything in Free</span>
                </li>
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <div className="h-4 w-4 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="h-2.5 w-2.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-zinc-300">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/pricing"
                className="agent-button agent-button-primary w-full justify-center py-3 text-sm font-bold press-scale"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Get Premium
              </Link>

              <div className="flex items-center justify-center gap-1.5 mt-3">
                <svg className="h-3 w-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="mono text-[10px] text-zinc-600">MTN · Telecel · AirtelTigo · Card</span>
              </div>
            </div>
          </div>

          {/* Employer */}
          <div className="rounded-2xl border border-cyan-500/20 bg-[#0d0d18] overflow-hidden flex flex-col">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
            <div className="p-7 flex flex-col flex-1">
              <p className="section-label">Employer</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-display text-4xl font-bold text-white">GHS 500</span>
                <span className="text-zinc-500 text-sm">+/listing</span>
              </div>
              <p className="mono text-xs text-zinc-600 mb-7">Or monthly dashboard access</p>

              <ul className="space-y-3 mb-8 flex-1">
                {EMPLOYER_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <div className="h-4 w-4 rounded-full bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="h-2.5 w-2.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-zinc-300">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href="mailto:employers@careeros.live"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/5 py-3 text-sm font-medium text-cyan-300 hover:bg-cyan-500/10 transition-all press-scale"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact us
              </a>

              <p className="mono text-[10px] text-zinc-700 text-center mt-3">
                Hiring at scale? Ask about volume pricing.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center mono text-xs text-zinc-600 mt-10">
          Early users on the GHS 99 lifetime plan keep their access — always.
        </p>
      </div>
    </section>
  );
}
