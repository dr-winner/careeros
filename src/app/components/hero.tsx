"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const TYPING_TEXTS = [
  "analyzing job fit...",
  "parsing your CV...",
  "matching skills...",
  "optimizing applications...",
];

export default function Hero() {
  const [typingIndex, setTypingIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = TYPING_TEXTS[typingIndex];

    const timeout = setTimeout(() => {
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
          setTypingIndex((prev) => (prev + 1) % TYPING_TEXTS.length);
        }
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, typingIndex]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 grid-pattern" />
      
      {/* Gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[150px] animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[100px]" />
      </div>

      {/* Scan line effect */}
      <div className="scan-line" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        {/* Agent status badge */}
        <div className="animate-fade-up mb-8">
          <div className="agent-status inline-flex items-center gap-3 rounded-full bg-purple-500/10 border border-purple-500/20 px-5 py-2.5">
            <div className="relative">
              <div className="status-dot status-dot-active" />
            </div>
            <span className="mono text-purple-300">Career Agent Online</span>
          </div>
        </div>

        {/* Main headline */}
        <h1 className="animate-fade-up delay-100 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
          <span className="text-white">Your AI Career</span>
          <br />
          <span className="gradient-text">Agent</span>
        </h1>

        {/* Agent typing indicator */}
        <div className="animate-fade-up delay-200 mt-8">
          <div className="inline-flex items-center gap-2 rounded-xl bg-black/40 border border-white/5 px-5 py-3">
            <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="mono text-sm text-zinc-400">
              Agent is {TYPING_TEXTS[typingIndex].slice(0, charIndex)}
              <span className="animate-cursor-blink text-purple-400">|</span>
            </span>
          </div>
        </div>

        {/* Subheadline */}
        <p className="animate-fade-up delay-300 mx-auto mt-10 max-w-2xl text-lg text-zinc-400 leading-relaxed">
          Stop applying blind. Let AI analyze your fit, optimize your CV, and
          prepare you for interviews — before you spend a single minute.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-up delay-400 mt-12 flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="agent-button agent-button-primary"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Launch Career Agent
          </Link>
          <Link
            href="/sign-in"
            className="agent-button agent-button-secondary"
          >
            Access Agent
          </Link>
        </div>

        {/* Trust indicators */}
        <p className="animate-fade-up delay-500 mt-8 mono text-xs text-zinc-500">
          Free to start · No credit card required
        </p>

        {/* Agent visualization */}
        <div className="animate-fade-up delay-600 mt-20">
          <div className="agent-card max-w-xl mx-auto p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-[#0a0a0f]" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-white">CareerOS Agent</div>
                <div className="mono text-xs text-zinc-500">v2.4 • Processing your profile</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="h-3 w-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-zinc-300">CV parsed successfully</span>
                <span className="mono text-xs text-zinc-600 ml-auto">0.2s</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="h-3 w-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-zinc-300">Skills extracted: 12 matched</span>
                <span className="mono text-xs text-zinc-600 ml-auto">0.5s</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-5 w-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                </div>
                <span className="text-zinc-300">Analyzing job fit...</span>
                <span className="mono text-xs text-zinc-600 ml-auto">running</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Match Score</span>
                <span className="gradient-text font-semibold">87%</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 animate-gradient" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="animate-fade-up delay-700 mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[
            { value: "9", label: "Job sources" },
            { value: "AI", label: "Skills analysis" },
            { value: "Ghana", label: "Market focus" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="mono text-xs text-zinc-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex flex-col items-center gap-2 text-zinc-500">
          <span className="mono text-xs">scroll</span>
          <div className="h-12 w-px bg-gradient-to-b from-zinc-500 to-transparent" />
        </div>
      </div>
    </section>
  );
}
