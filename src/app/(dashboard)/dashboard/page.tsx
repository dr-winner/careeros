"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CVUpload from "@/app/components/cv-upload";
import CVAnalysisScreen from "@/components/cv-analysis-screen";

export default function DashboardPage() {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const [showUpload, setShowUpload] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisCvId, setAnalysisCvId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    applications: 0,
    savedJobs: 0,
    interviews: 0,
  });
  const [nextAction, setNextAction] = useState<{
    action: string;
    description: string;
    priority: string;
    link: string;
    icon: string;
  } | null>(null);
  const [isLoadingAction, setIsLoadingAction] = useState(true);
  const [analytics, setAnalytics] = useState<{
    responseRate: number;
    resumeCount: number;
    alertCount: number;
    statusCounts: Record<string, number>;
    recentApps: { id: string; jobTitle: string | null; companyName: string | null; status: string; appliedAt: string | null }[];
  }>({
    responseRate: 0,
    resumeCount: 0,
    alertCount: 0,
    statusCounts: {},
    recentApps: [],
  });
  const [profileCompletion, setProfileCompletion] = useState<{
    pct: number;
    missing: string[];
  } | null>(null);

  useEffect(() => {
    if (isLoaded && isUserLoaded && userId) {
      const localComplete = localStorage.getItem("onboardingComplete");
      const serverComplete = user?.publicMetadata?.onboardingComplete;

      if (!localComplete && !serverComplete) {
        router.push("/guided-onboarding");
      } else if (serverComplete && !localComplete) {
        localStorage.setItem("onboardingComplete", "true");
      } else if (localComplete && !serverComplete) {
        fetch("/api/user/onboarding", { method: "POST" }).catch(console.error);
      }
    }
  }, [isLoaded, isUserLoaded, userId, router, user?.publicMetadata?.onboardingComplete]);

  useEffect(() => {
    if (!isLoaded || !userId) return;

    fetch("/api/ai/next-action")
      .then(res => res.json())
      .then(data => {
        if (!data.error) setNextAction(data);
      })
      .catch(console.error)
      .finally(() => setIsLoadingAction(false));

    Promise.all([
      fetch("/api/applications").then((res) => res.ok ? res.json() : { applications: [] }),
      fetch("/api/saved-jobs").then((res) => res.json()),
      fetch("/api/user/resumes").then((res) => res.json()),
      fetch("/api/searches").then((res) => res.json()),
      fetch("/api/user/profile").then((res) => res.ok ? res.json() : null),
    ])
      .then(([appsData, savedData, resumesData, alertsData, profileData]) => {
        const applications: { status?: string; jobTitle?: string | null; companyName?: string | null; id: string; appliedAt?: string | null }[] = appsData.applications || [];
        const interviews = applications.filter(
          (application) => ["Screening", "Interview"].includes(application.status || ""),
        ).length;

        const statusCounts: Record<string, number> = {};
        applications.forEach((app) => {
          statusCounts[app.status || "Applied"] = (statusCounts[app.status || "Applied"] || 0) + 1;
        });

        const responses = applications.filter((a) =>
          ["Screening", "Interview", "Offer"].includes(a.status || ""),
        ).length;
        const responseRate = applications.length > 0 ? Math.round((responses / applications.length) * 100) : 0;

        setStats({
          applications: applications.length,
          savedJobs: savedData.savedJobs?.length || 0,
          interviews,
        });
        setAnalytics({
          responseRate,
          resumeCount: resumesData.resumes?.length || 0,
          alertCount: alertsData.searches?.length || 0,
          statusCounts,
          recentApps: applications.slice(0, 5).map((a) => ({
            id: a.id,
            jobTitle: a.jobTitle ?? null,
            companyName: a.companyName ?? null,
            status: a.status || "Applied",
            appliedAt: a.appliedAt ?? null,
          })),
        });

        // Profile completion
        const p = profileData?.user;
        const hasCV = (resumesData.resumes?.length || 0) > 0;
        const checks = [
          { label: "Upload a CV", done: hasCV },
          { label: "Add headline", done: !!p?.headline },
          { label: "Set experience level", done: !!p?.experience },
          { label: "Set desired role", done: !!p?.desiredRole },
        ];
        const done = checks.filter((c) => c.done).length;
        const missing = checks.filter((c) => !c.done).map((c) => c.label);
        setProfileCompletion({ pct: Math.round((done / checks.length) * 100), missing });
      })
      .catch(console.error);
  }, [isLoaded, userId]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          <span className="mono text-sm text-zinc-400">Loading agent...</span>
        </div>
      </div>
    );
  }

  const firstName = user?.firstName || "there";

  const handleAnalysisStart = (cvId: string) => {
    setShowUpload(false);
    setShowAnalysis(true);
    setAnalysisCvId(cvId);
  };

  const handleAnalysisComplete = () => {
    setShowAnalysis(false);
    setAnalysisCvId(null);
  };

  const handleCloseAnalysis = () => {
    setShowAnalysis(false);
    setAnalysisCvId(null);
  };

  const statusTextColors: Record<string, string> = {
    Applied: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    Screening: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    Interview: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    Offer: "text-green-400 border-green-500/30 bg-green-500/10",
    Rejected: "text-red-400 border-red-500/30 bg-red-500/10",
    Withdrawn: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
  };
  const statusBarColors: Record<string, string> = {
    Applied: "bg-cyan-500",
    Screening: "bg-amber-500",
    Interview: "bg-purple-500",
    Offer: "bg-green-500",
    Rejected: "bg-red-500",
    Withdrawn: "bg-zinc-500",
  };

  return (
    <>
      {showAnalysis && analysisCvId && (
        <CVAnalysisScreen
          cvId={analysisCvId}
          onComplete={handleAnalysisComplete}
          onClose={handleCloseAnalysis}
        />
      )}
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Page header */}
        <div className="animate-fade-up flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Dashboard</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              Hey {firstName} — your job search at a glance
            </p>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="agent-button-primary press-scale"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Upload CV
          </button>
        </div>

        {/* AI Next Best Action */}
        <div className="animate-fade-up delay-100 agent-card border-l-4 border-l-purple-500/60 bg-purple-500/5 p-5">
          <div className="absolute top-3 right-3">
            <div className="px-2 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-[8px] mono text-purple-400 uppercase tracking-widest">AI Recommendation</div>
          </div>
          <div className="flex items-start gap-4 mt-1">
            <div className="h-11 w-11 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 flex-shrink-0">
              {isLoadingAction ? (
                <div className="h-5 w-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              ) : (
                <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {nextAction?.icon === "resume" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  ) : nextAction?.icon === "practice" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  ) : nextAction?.icon === "track" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  )}
                </svg>
              )}
            </div>
            <div className="flex-1">
              {isLoadingAction ? (
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-white/5 animate-pulse rounded" />
                  <div className="h-4 w-72 bg-white/5 animate-pulse rounded" />
                  <div className="h-4 w-52 bg-white/5 animate-pulse rounded" />
                </div>
              ) : nextAction ? (
                <div className="animate-fade-in">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {nextAction.action}
                    {nextAction.priority === "high" && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[8px] mono text-red-400 uppercase">Priority</span>
                    )}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1 max-w-xl leading-relaxed">{nextAction.description}</p>
                  <Link
                    href={nextAction.link}
                    className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors group"
                  >
                    Take Action Now
                    <svg className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 italic">Analyzing your career path...</p>
              )}
            </div>
          </div>
        </div>

        {/* Profile completion nudge — shown only when incomplete and user has finished onboarding */}
        {profileCompletion && profileCompletion.pct < 100 && profileCompletion.missing.length > 0 && (
          <div className="animate-fade-up agent-card border-cyan-500/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium text-white">Profile {profileCompletion.pct}% complete</span>
              </div>
              <span className="mono text-xs text-cyan-400">Better profile = better scores</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-800 mb-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                style={{ width: `${profileCompletion.pct}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {profileCompletion.missing.map((item) => (
                <a
                  key={item}
                  href={item === "Upload a CV" ? "/resumes" : "/profile"}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400 hover:border-cyan-500/30 hover:text-cyan-400 transition-all"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {item}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="animate-fade-up delay-200 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Applications",
              value: stats.applications,
              sublabel: "tracked",
              cardClass: "stat-card stat-card-purple",
              iconPath: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
              iconClass: "text-purple-400",
              iconBg: "bg-purple-500/20",
            },
            {
              label: "Saved Jobs",
              value: stats.savedJobs,
              sublabel: "bookmarked",
              cardClass: "stat-card stat-card-cyan",
              iconPath: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z",
              iconClass: "text-cyan-400",
              iconBg: "bg-cyan-500/20",
            },
            {
              label: "Interviews",
              value: stats.interviews,
              sublabel: "scheduled",
              cardClass: "stat-card stat-card-green",
              iconPath: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
              iconClass: "text-green-400",
              iconBg: "bg-green-500/20",
            },
            {
              label: "Active Alerts",
              value: analytics.alertCount,
              sublabel: "monitoring",
              cardClass: "stat-card stat-card-amber",
              iconPath: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
              iconClass: "text-amber-400",
              iconBg: "bg-amber-500/20",
            },
          ].map((stat, i) => (
            <div key={i} className={stat.cardClass}>
              <div className="flex items-center justify-between mb-3">
                <span className="section-label mb-0">{stat.label}</span>
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${stat.iconBg}`}>
                  <svg className={`h-3.5 w-3.5 ${stat.iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.iconPath} />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="mono text-xs text-zinc-600 mt-0.5">{stat.sublabel}</div>
            </div>
          ))}
        </div>

        {/* Empty state for new users */}
        {!isLoadingAction && stats.applications === 0 && stats.savedJobs === 0 && stats.interviews === 0 && (
          <div className="animate-fade-up delay-300 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="empty-state-icon flex-shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)', margin: 0 }}>
                <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-white text-base">Get started in 3 steps</h2>
                <p className="mono text-xs text-zinc-500 mt-0.5">Your agent is ready — here&apos;s what to do first</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { step: "1", label: "Upload your CV", desc: "Lets AI extract your skills for matching", href: "/resumes" },
                { step: "2", label: "Browse jobs", desc: "Find roles and see your fit score", href: "/jobs" },
                { step: "3", label: "Apply with confidence", desc: "Generate a cover letter, prep for interviews", href: "/resumes?tab=cover-letter" },
              ].map((item) => (
                <a
                  key={item.step}
                  href={item.href}
                  className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 hover:border-amber-500/20 hover:bg-amber-500/5 transition-all group"
                >
                  <div className="h-8 w-8 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="mono text-xs font-bold text-amber-400">{item.step}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{item.label}</div>
                    <div className="mono text-xs text-zinc-500 mt-0.5">{item.desc}</div>
                  </div>
                  <svg className="h-4 w-4 text-zinc-600 group-hover:text-amber-400/60 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* CV Upload Panel */}
        {showUpload && (
          <div className="animate-fade-up agent-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-white">Upload Your CV</h2>
              </div>
              <button
                onClick={() => setShowUpload(false)}
                className="rounded-lg p-2 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <CVUpload onAnalysisStart={handleAnalysisStart} />
          </div>
        )}

        {/* Two-column bottom section */}
        <div className="animate-fade-up delay-300 grid gap-4 lg:grid-cols-[1fr_220px]">
          {/* Recent Applications */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
            <p className="section-label">Recent Applications</p>
            {analytics.recentApps.length > 0 ? (
              <div className="space-y-2">
                {analytics.recentApps.map((app) => (
                  <div key={app.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:border-white/10 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{app.jobTitle || "Untitled Role"}</div>
                      {app.companyName && <div className="mono text-xs text-zinc-500 mt-0.5 truncate">{app.companyName}</div>}
                    </div>
                    <span className={`mono text-[10px] px-2 py-0.5 rounded border flex-shrink-0 ${statusTextColors[app.status] || statusTextColors.Applied}`}>
                      {app.status}
                    </span>
                  </div>
                ))}
                <Link href="/applications" className="mono text-xs text-purple-400 hover:text-purple-300 transition-colors block mt-3">
                  View all applications →
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="empty-state-icon mx-auto" style={{ width: 48, height: 48, borderRadius: 14 }}>
                  <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm text-zinc-500 mb-3">No applications yet</p>
                <Link href="/jobs" className="mono text-xs text-purple-400 hover:text-purple-300">Browse jobs →</Link>
              </div>
            )}

            {/* Status breakdown if data exists */}
            {Object.keys(analytics.statusCounts).length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-2">
                {Object.entries(analytics.statusCounts).map(([status, count]) => {
                  const total = stats.applications;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className={`mono text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 w-20 text-center ${statusTextColors[status] || statusTextColors.Applied}`}>
                        {status}
                      </span>
                      <div className="flex-1 h-1 rounded-full bg-zinc-900 overflow-hidden">
                        <div className={`h-full rounded-full ${statusBarColors[status] || statusBarColors.Applied}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="mono text-[10px] text-zinc-600 w-5 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
            <p className="section-label">Quick Links</p>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              {[
                { href: "/interview", label: "Interview Prep", icon: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z", color: "purple" },
                { href: "/resumes?tab=cover-letter", label: "Cover Letter", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", color: "cyan" },
                { href: "/applications", label: "Applications", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", color: "amber" },
                { href: "/referrals", label: "Refer & Earn", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", color: "green" },
              ].map((action, i) => (
                <Link
                  key={i}
                  href={action.href}
                  className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:border-purple-500/20 hover:bg-purple-500/5 transition-all group press-scale"
                >
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    action.color === "purple" ? "bg-purple-500/20" :
                    action.color === "cyan" ? "bg-cyan-500/20" :
                    action.color === "amber" ? "bg-amber-500/20" : "bg-green-500/20"
                  }`}>
                    <svg className={`h-3.5 w-3.5 ${
                      action.color === "purple" ? "text-purple-400" :
                      action.color === "cyan" ? "text-cyan-400" :
                      action.color === "amber" ? "text-amber-400" : "text-green-400"
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Referral Promo Box */}
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 text-5xl opacity-10 select-none group-hover:scale-110 transition-transform duration-300 pointer-events-none">🎁</div>
            <h4 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Earn Free Analyses
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Invite friends to CareerOS. When they join and run a fit check, you instantly get 1 bonus match check added to your quota!
            </p>
            <Link
              href="/referrals"
              className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-medium transition-colors"
            >
              Get invite link
              <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Progress analytics — only shown once user has activity */}
        {stats.applications > 0 && (
          <div className="animate-fade-up delay-400 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
              <span className="section-label px-2 mb-0">Progress</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Response Rate", value: `${analytics.responseRate}%`, cardClass: "stat-card stat-card-cyan" },
                { label: "CVs Uploaded", value: analytics.resumeCount, cardClass: "stat-card stat-card-purple" },
                { label: "Active Alerts", value: analytics.alertCount, cardClass: "stat-card stat-card-amber" },
              ].map((item, i) => (
                <div key={i} className={item.cardClass}>
                  <div className="mono text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{item.label}</div>
                  <div className="text-2xl font-bold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
