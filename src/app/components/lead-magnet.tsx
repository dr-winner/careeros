"use client";

import { useState } from "react";
import Link from "next/link";

const COMMON_KEYWORDS = [
  "React", "TypeScript", "Node.js", "Python", "Java", "SQL", "Docker", "AWS", "Figma",
  "HTML", "CSS", "Javascript", "Kubernetes", "Git", "PostgreSQL", "MongoDB", "Redis",
  "Product Management", "Project Management", "Agile", "Scrum", "UI/UX", "Excel",
  "Sales", "Marketing", "SEO", "Customer Service", "Finance", "Communication", "Data Analysis"
];

export default function LeadMagnet() {
  const [jobText, setJobText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [extractedKeywords, setExtractedKeywords] = useState<string[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [inputError, setInputError] = useState("");

  const handleScan = () => {
    // A real job description is at least a few sentences — anything
    // shorter can't be honestly "scanned", so don't pretend.
    if (jobText.trim().length < 60) {
      setInputError("Paste the full job advert — at least a few sentences — so there's something real to scan.");
      return;
    }
    setInputError("");
    setScanning(true);

    setTimeout(() => {
      const text = jobText.toLowerCase();
      const found = COMMON_KEYWORDS.filter(kw =>
        text.includes(kw.toLowerCase())
      );

      // Never fabricate results: if nothing matched, show the honest
      // empty state instead of inventing generic skills.
      setExtractedKeywords(found.slice(0, 5));
      setScanning(false);
      setHasScanned(true);
    }, 1200);
  };

  return (
    <section className="relative py-20 px-6">
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-4 py-1.5 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs text-cyan-400 font-medium mono">Free Interactive Tool</span>
        </div>
        
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
          Scan any job description in <span className="gradient-text">seconds</span>
        </h2>
        
        <p className="text-sm text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed">
          Paste a job description below. We will extract the core skills required, so you know exactly what is needed.
        </p>

        <div className="agent-card p-6 text-left border-cyan-500/20 max-w-xl mx-auto">
          {!hasScanned ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 mb-2 block">
                  Paste Job Description
                </label>
                <textarea
                  value={jobText}
                  onChange={(e) => { setJobText(e.target.value); if (inputError) setInputError(""); }}
                  placeholder="Paste the job advertisement text here (e.g., We are looking for a React Developer who knows TypeScript and AWS...)"
                  className="w-full h-32 bg-black/40 border border-white/[0.06] rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-colors resize-none"
                />
                {inputError && (
                  <p className="text-xs text-amber-400 mt-2">{inputError}</p>
                )}
              </div>
              <button
                onClick={handleScan}
                disabled={scanning || !jobText.trim()}
                className="w-full agent-button-primary justify-center py-3 text-xs font-bold disabled:opacity-50 press-scale"
              >
                {scanning ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Extracting skills…
                  </>
                ) : (
                  "Scan Key Requirements"
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6 text-center py-2 animate-fade-up">
              {extractedKeywords.length > 0 ? (
                <div>
                  <span className="mono text-[10px] text-zinc-500 uppercase tracking-wider">Identified key requirements:</span>
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    {extractedKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <span className="mono text-[10px] text-zinc-500 uppercase tracking-wider">Quick scan found no clear matches</span>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-3 leading-relaxed">
                    This free scanner only spots common keywords. The full AI analysis inside
                    reads the entire advert against your actual CV — that&apos;s where the real
                    answers are.
                  </p>
                </div>
              )}

              <div className="h-px w-full bg-white/[0.06]" />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Does your CV match this?</h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                  Sign up for a free account, upload your CV, and see your exact match percentage, skill gaps, and custom CV improvement points.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setJobText("");
                      setHasScanned(false);
                    }}
                    className="agent-button py-2.5 text-xs font-medium"
                  >
                    Scan Another
                  </button>
                  <Link
                    href="/sign-up"
                    className="agent-button-primary py-2.5 text-xs font-bold group press-scale"
                  >
                    Score My CV Fit
                    <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
