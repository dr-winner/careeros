"use client";

import { useState } from "react";
import Link from "next/link";
import { usePostHog } from "posthog-js/react";

interface PreviewResult {
  fitScore: number;
  verdict: string;
  matchedSkills: string[];
  missingCount: number;
  teaser: string;
}

function ScoreRing({ score }: { score: number }) {
  const dash = (score / 100) * 264;
  const color = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="120" height="120" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="7" />
      <circle
        cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${dash} 264`} transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text x="50" y="54" textAnchor="middle" fill="#fafafa" fontSize="24" fontWeight="700">{score}%</text>
    </svg>
  );
}

export default function LeadMagnet() {
  const posthog = usePostHog();
  const [step, setStep] = useState<"job" | "cv" | "result">("job");
  const [jobText, setJobText] = useState("");
  const [cvText, setCvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PreviewResult | null>(null);

  const runPreview = async () => {
    if (cvText.trim().length < 150) {
      setError("Paste more of your CV — at least your skills and recent experience.");
      return;
    }
    setError("");
    setLoading(true);
    posthog?.capture("fit_preview_started");
    try {
      const res = await fetch("/api/fit-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobText, cvText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Preview failed — please try again.");
        return;
      }
      setResult(data);
      setStep("result");
      posthog?.capture("fit_preview_completed", { fit_score: data.fitScore, missing_count: data.missingCount });
      // Carry the moment through signup: the dashboard greets them with
      // this score, and the CV they pasted prefills their account.
      try {
        localStorage.setItem(
          "careeros_preview",
          JSON.stringify({
            fitScore: data.fitScore,
            verdict: data.verdict,
            missingCount: data.missingCount,
            cvText,
            jobText: jobText.slice(0, 4000),
            ts: Date.now(),
          }),
        );
      } catch {}
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="fit-check" className="relative py-20 px-6">
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-4 py-1.5 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs text-cyan-400 font-medium mono">Try it right now — no account needed</span>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
          Get your real fit score in <span className="gradient-text">30 seconds</span>
        </h2>

        <p className="text-sm text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed">
          Paste a job advert, paste your CV, and our AI scores your actual fit — the same engine premium users pay for.
        </p>

        <div className="agent-card p-6 text-left border-cyan-500/20 max-w-xl mx-auto">
          {step === "job" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="mono text-[10px] font-bold text-cyan-400">STEP 1 OF 2</span>
                <span className="mono text-[10px] text-zinc-600">· the job</span>
              </div>
              <textarea
                value={jobText}
                onChange={(e) => { setJobText(e.target.value); if (error) setError(""); }}
                placeholder="Paste the job advert here — title, requirements, everything…"
                className="w-full h-32 bg-black/40 border border-white/[0.06] rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-colors resize-none"
              />
              {error && <p className="text-xs text-amber-400">{error}</p>}
              <button
                onClick={() => {
                  if (jobText.trim().length < 100) {
                    setError("Paste the full job advert — at least a few sentences.");
                    return;
                  }
                  setError("");
                  setStep("cv");
                }}
                className="w-full agent-button-primary justify-center py-3 text-xs font-bold press-scale"
              >
                Next: Add Your CV →
              </button>
            </div>
          )}

          {step === "cv" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="mono text-[10px] font-bold text-cyan-400">STEP 2 OF 2</span>
                <span className="mono text-[10px] text-zinc-600">· your CV (just paste the text)</span>
              </div>
              <textarea
                value={cvText}
                onChange={(e) => { setCvText(e.target.value); if (error) setError(""); }}
                placeholder="Paste your CV text — skills, experience, education. Copy it straight from your document or LinkedIn…"
                className="w-full h-32 bg-black/40 border border-white/[0.06] rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-colors resize-none"
              />
              {error && <p className="text-xs text-amber-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setStep("job"); setError(""); }}
                  className="agent-button py-3 px-4 text-xs"
                >
                  ← Back
                </button>
                <button
                  onClick={runPreview}
                  disabled={loading}
                  className="flex-1 agent-button-primary justify-center py-3 text-xs font-bold press-scale disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      AI is scoring your fit…
                    </>
                  ) : (
                    "Score My Fit — Free"
                  )}
                </button>
              </div>
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-5 text-center py-2 animate-fade-up">
              <div className="flex flex-col items-center">
                <ScoreRing score={result.fitScore} />
                <h3 className="text-lg font-bold text-white mt-3">{result.verdict}</h3>
              </div>

              {result.matchedSkills.length > 0 && (
                <div>
                  <span className="mono text-[10px] text-zinc-500 uppercase tracking-wider">You already match:</span>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {result.matchedSkills.map((kw) => (
                      <span key={kw} className="text-xs font-medium px-3 py-1.5 rounded-lg border bg-green-500/10 border-green-500/20 text-green-400">
                        ✓ {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.missingCount > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 text-left">
                  <p className="text-sm text-amber-300 font-semibold mb-1.5">
                    🔒 {result.missingCount} requirement{result.missingCount !== 1 ? "s" : ""} you&apos;re missing
                  </p>
                  {result.teaser && (
                    <p className="text-xs text-zinc-400 leading-relaxed mb-3">{result.teaser}</p>
                  )}
                  <div className="space-y-1.5 select-none" aria-hidden="true">
                    {Array.from({ length: Math.min(3, result.missingCount) }).map((_, i) => (
                      <div key={i} className="h-3.5 rounded bg-white/[0.05] blur-[3px]" style={{ width: `${85 - i * 18}%` }} />
                    ))}
                  </div>
                </div>
              )}

              <div className="h-px w-full bg-white/[0.06]" />

              <div className="space-y-3">
                <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                  Your free account shows every gap, exactly how to fix your CV for this job, and 3 full analyses a month — free forever.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => { setStep("job"); setResult(null); setJobText(""); setCvText(""); }}
                    className="agent-button py-2.5 text-xs font-medium"
                  >
                    Try Another
                  </button>
                  <Link
                    href="/sign-up"
                    onClick={() => posthog?.capture("fit_preview_signup_clicked", { fit_score: result.fitScore })}
                    className="agent-button-primary py-2.5 text-xs font-bold group press-scale"
                  >
                    Unlock My Full Analysis
                    <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `I just scored ${result.fitScore}% for a job on CareerOS 🎯 Check your real fit score free — no account needed: https://www.careeros.live/#fit-check`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => posthog?.capture("fit_preview_shared", { fit_score: result.fitScore })}
                  className="inline-flex items-center gap-1.5 mono text-[11px] text-green-400/80 hover:text-green-300 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  </svg>
                  Share your score on WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
