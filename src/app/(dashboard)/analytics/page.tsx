"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

interface FitAnalysis {
  id: string;
  fitScore: number;
  createdAt: string;
  job: { title: string; companyName: string | null; location: string | null };
}

interface Resume {
  id: string;
  skills: { skillName: string }[];
}

interface Application {
  id: string;
  status: string;
  appliedAt: string | null;
  jobTitle: string | null;
  companyName: string | null;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? "#22c55e" : score >= 50 ? "#8b5cf6" : "#f59e0b";
  return (
    <svg width="72" height="72" className="rotate-[-90deg]">
      <circle cx="36" cy="36" r={radius} fill="none" stroke="#27272a" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={radius} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={circ}
        strokeDashoffset={circ - fill}
        strokeLinecap="round"
      />
      <text
        x="36" y="36"
        textAnchor="middle" dominantBaseline="central"
        fill="#fafafa" fontSize="14" fontWeight="700"
        style={{ transform: "rotate(90deg)", transformOrigin: "36px 36px" }}
      >
        {score}%
      </text>
    </svg>
  );
}

const STATUS_COLOR: Record<string, string> = {
  Applied: "bg-cyan-500",
  Screening: "bg-amber-500",
  Interview: "bg-purple-500",
  Offer: "bg-green-500",
  Rejected: "bg-red-500",
  Withdrawn: "bg-zinc-500",
};

export default function AnalyticsPage() {
  const { userId, isLoaded } = useAuth();
  const [analyses, setAnalyses] = useState<FitAnalysis[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    Promise.all([
      fetch("/api/fit-analysis").then((r) => r.ok ? r.json() : { analyses: [] }),
      fetch("/api/user/resumes").then((r) => r.ok ? r.json() : { resumes: [] }),
      fetch("/api/applications").then((r) => r.ok ? r.json() : { applications: [] }),
    ])
      .then(([aData, rData, appData]) => {
        setAnalyses(aData.analyses || []);
        const allSkills: string[] = (rData.resumes as Resume[] || []).flatMap(
          (r) => r.skills.map((s) => s.skillName)
        );
        const unique = [...new Set(allSkills)];
        setSkills(unique);
        setApplications(appData.applications || []);
      })
      .finally(() => setLoading(false));
  }, [isLoaded, userId]);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          <span className="mono text-sm text-zinc-400">Loading insights...</span>
        </div>
      </div>
    );
  }

  // ── Derived stats ──────────────────────────────────────────────────────────

  const avgScore = analyses.length
    ? Math.round(analyses.reduce((s, a) => s + a.fitScore, 0) / analyses.length)
    : null;

  const bestMatch = analyses.length
    ? analyses.reduce((best, a) => a.fitScore > best.fitScore ? a : best)
    : null;

  const scoreDistribution = [
    { label: "80–100%", min: 80, max: 100, color: "bg-green-500" },
    { label: "60–79%",  min: 60, max: 79,  color: "bg-purple-500" },
    { label: "40–59%",  min: 40, max: 59,  color: "bg-amber-500" },
    { label: "0–39%",   min: 0,  max: 39,  color: "bg-red-500" },
  ].map((bucket) => ({
    ...bucket,
    count: analyses.filter((a) => a.fitScore >= bucket.min && a.fitScore <= bucket.max).length,
  }));
  const maxBucket = Math.max(...scoreDistribution.map((b) => b.count), 1);

  const statusCounts: Record<string, number> = {};
  applications.forEach((a) => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });
  const responseRate = applications.length
    ? Math.round(
        (applications.filter((a) => ["Screening", "Interview", "Offer"].includes(a.status)).length /
          applications.length) * 100
      )
    : 0;

  const isEmpty = analyses.length === 0 && applications.length === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text font-display">Career Analytics</h1>
        <p className="text-sm text-zinc-500 mt-1">Your job search performance at a glance</p>
      </div>

      {isEmpty ? (
        <div className="agent-card p-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="h-7 w-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-white font-semibold mb-2">No data yet</p>
          <p className="text-sm text-zinc-500 mb-6">Analyse a few jobs and track some applications to see your insights here.</p>
          <Link href="/jobs" className="agent-button-primary inline-flex">Browse Jobs</Link>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="agent-card p-5">
              <p className="text-xs text-zinc-500 mono uppercase tracking-widest mb-2">Analyses Run</p>
              <p className="text-3xl font-bold text-purple-400 font-display">{analyses.length}</p>
            </div>
            <div className="agent-card p-5">
              <p className="text-xs text-zinc-500 mono uppercase tracking-widest mb-2">Avg Fit Score</p>
              <p className="text-3xl font-bold text-white font-display">{avgScore ?? "—"}%</p>
            </div>
            <div className="agent-card p-5">
              <p className="text-xs text-zinc-500 mono uppercase tracking-widest mb-2">Applications</p>
              <p className="text-3xl font-bold text-cyan-400 font-display">{applications.length}</p>
            </div>
            <div className="agent-card p-5">
              <p className="text-xs text-zinc-500 mono uppercase tracking-widest mb-2">Response Rate</p>
              <p className="text-3xl font-bold text-green-400 font-display">{responseRate}%</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Score distribution */}
            {analyses.length > 0 && (
              <div className="agent-card p-5">
                <p className="text-xs text-zinc-500 mono uppercase tracking-widest mb-4">Score Distribution</p>
                <div className="space-y-3">
                  {scoreDistribution.map((b) => (
                    <div key={b.label} className="flex items-center gap-3">
                      <span className="mono text-xs text-zinc-400 w-16 flex-shrink-0">{b.label}</span>
                      <div className="flex-1 h-5 rounded bg-white/[0.04] overflow-hidden">
                        <div
                          className={`h-full rounded transition-all ${b.color} opacity-70`}
                          style={{ width: `${(b.count / maxBucket) * 100}%` }}
                        />
                      </div>
                      <span className="mono text-xs text-zinc-500 w-4 text-right">{b.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Application pipeline */}
            {applications.length > 0 && (
              <div className="agent-card p-5">
                <p className="text-xs text-zinc-500 mono uppercase tracking-widest mb-4">Application Pipeline</p>
                <div className="space-y-2">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400 w-20 flex-shrink-0">{status}</span>
                      <div className="flex-1 h-4 rounded bg-white/[0.04] overflow-hidden">
                        <div
                          className={`h-full rounded ${STATUS_COLOR[status] || "bg-zinc-500"} opacity-70`}
                          style={{ width: `${(count / applications.length) * 100}%` }}
                        />
                      </div>
                      <span className="mono text-xs text-zinc-500 w-4 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Best match + recent analyses */}
          {analyses.length > 0 && (
            <div className="agent-card p-5">
              <p className="text-xs text-zinc-500 mono uppercase tracking-widest mb-4">Recent Job Analyses</p>
              <div className="space-y-3">
                {analyses.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-center gap-4 py-2 border-b border-white/[0.04] last:border-0">
                    <ScoreRing score={Math.round(a.fitScore)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{a.job.title}</p>
                      <p className="text-xs text-zinc-500 truncate mono">
                        {a.job.companyName || "—"}{a.job.location ? ` · ${a.job.location}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-600 mono flex-shrink-0">
                      {new Date(a.createdAt).toLocaleDateString("en-GH", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
              {bestMatch && (
                <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <span className="text-xs text-zinc-400">
                    Best match: <span className="text-white font-medium">{bestMatch.job.title}</span>
                    {" "}at <span className="text-green-400 font-medium">{Math.round(bestMatch.fitScore)}%</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Skills snapshot */}
          {skills.length > 0 && (
            <div className="agent-card p-5">
              <p className="text-xs text-zinc-500 mono uppercase tracking-widest mb-3">Your Skills ({skills.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {skills.slice(0, 30).map((s) => (
                  <span key={s} className="px-2 py-1 rounded text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    {s}
                  </span>
                ))}
                {skills.length > 30 && (
                  <span className="px-2 py-1 rounded text-xs text-zinc-500 border border-white/[0.06]">
                    +{skills.length - 30} more
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
