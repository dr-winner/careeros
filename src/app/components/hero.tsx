"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Logo from "./logo";

const AGENT_LINES = [
  "parsing CV…",
  "extracting skills…",
  "scoring job fit…",
  "finding gaps…",
];

export default function Hero() {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = AGENT_LINES[lineIndex];
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (charIndex < currentText.length) {
            setCharIndex(charIndex + 1);
          } else {
            setTimeout(() => setIsDeleting(true), 2000);
          }
        } else {
          if (charIndex > 0) {
            setCharIndex(charIndex - 1);
          } else {
            setIsDeleting(false);
            setLineIndex((prev) => (prev + 1) % AGENT_LINES.length);
          }
        }
      },
      isDeleting ? 40 : 80
    );
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, lineIndex]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 grid-pattern" />

      {/* Gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-purple-500/8 blur-[180px] animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/6 blur-[140px]" />
      </div>

      {/* Scan line */}
      <div className="scan-line" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        {/* Agent status badge */}
        <div className="animate-fade-up mb-8">
          <div className="agent-status inline-flex items-center gap-3 rounded-full bg-purple-500/10 border border-purple-500/20 px-5 py-2.5">
            <div className="status-dot status-dot-active" />
            <span className="mono text-purple-300">Career Agent Online</span>
          </div>
        </div>

        {/* Main headline — Space Grotesk, leading with the value prop */}
        <h1 className="font-display animate-fade-up delay-100 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold">
          <span className="text-white">Know your fit</span>
          <br />
          <span className="gradient-text">before you apply.</span>
        </h1>

        {/* Agent activity indicator */}
        <div className="animate-fade-up delay-200 mt-8">
          <div className="inline-flex items-center gap-2.5 rounded-xl bg-black/40 border border-white/[0.06] px-5 py-2.5">
            <div className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="mono text-sm text-zinc-400">
              Agent is {AGENT_LINES[lineIndex].slice(0, charIndex)}
              <span className="animate-cursor-blink text-purple-400">|</span>
            </span>
          </div>
        </div>

        {/* Subheadline */}
        <p className="animate-fade-up delay-300 mx-auto mt-8 max-w-xl text-lg text-zinc-400 leading-relaxed">
          Upload your CV. CareerOS scores your fit against any job in Ghana,
          then tells you exactly what to fix — before you spend a minute applying.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-up delay-400 mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Link href="/sign-up" className="agent-button agent-button-primary press-scale group">
            Get started free
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            href="/sign-in"
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-zinc-400 border border-white/[0.08] bg-white/[0.03] hover:text-white hover:border-white/20 transition-all"
          >
            Sign in
          </Link>
        </div>

        <p className="animate-fade-up delay-500 mt-5 mono text-xs text-zinc-600">
          Free to start · No credit card required
        </p>

        {/* Agent analysis card */}
        <div className="animate-fade-up delay-600 mt-20">
          <div className="agent-card max-w-lg mx-auto p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-shrink-0">
                <Logo size="sm" variant="mark" />
                <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-white">CareerOS Agent</div>
                <div className="mono text-xs text-zinc-600">Processing: Software Engineer — Accra</div>
              </div>
              <span className="mono text-xs text-zinc-500 ml-auto">demo</span>
            </div>

            <div className="space-y-2.5">
              {[
                { label: "CV parsed", status: "done", time: "0.2s" },
                { label: "12 skills matched", status: "done", time: "0.5s" },
                { label: "Scoring job fit", status: "running", time: null },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3 text-sm">
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      row.status === "done"
                        ? "bg-green-500/20"
                        : "bg-purple-500/20"
                    }`}
                  >
                    {row.status === "done" ? (
                      <svg className="h-3 w-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                    )}
                  </div>
                  <span className="text-zinc-300">{row.label}</span>
                  <span className="mono text-xs text-zinc-600 ml-auto">
                    {row.time ?? "running"}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-zinc-500">Match score</span>
                <span className="font-display font-bold gradient-text text-lg">87%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 animate-gradient" />
              </div>
              <p className="mono text-xs text-zinc-600 mt-3 leading-relaxed">
                Action plan: Highlight TypeScript depth. Add AWS Cloud cert. Customize profile.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="animate-fade-up delay-700 mt-14 grid grid-cols-3 gap-4 max-w-sm mx-auto">
          {[
            { value: "9+", label: "live job sources" },
            { value: "Free", label: "to get started" },
            { value: "< 3 min", label: "to your first score" },
          ].map((stat) => (
            <div key={stat.value} className="text-center">
              <div className="font-display text-xl font-bold text-white">{stat.value}</div>
              <div className="mono text-[10px] text-zinc-600 mt-0.5 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex flex-col items-center gap-2 text-zinc-600">
          <span className="mono text-[10px]">scroll</span>
          <div className="h-10 w-px bg-gradient-to-b from-zinc-600 to-transparent" />
        </div>
      </div>
    </section>
  );
}
