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
    ])
      .then(([appsData, savedData, resumesData, alertsData]) => {
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
        {/* Agent Header */}
        <div className="rounded-2xl border border-white/10 bg-[#14141f] p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <span className="text-xl font-bold text-white">
                  {firstName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-[#0a0a0f] shadow-sm shadow-green-500/50" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Hey, {firstName}
                </h1>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="mono text-[10px] uppercase tracking-wider text-green-400">Agent Active</span>
                </div>
              </div>
              <p className="mono text-xs text-zinc-500 mt-1">
                Your career agent is ready to help you find opportunities
              </p>
            </div>
          </div>
        </div>

        {/* AI Next Best Action Agent */}
        <div className="agent-card border-purple-500/30 bg-purple-500/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3">
            <div className="px-2 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-[8px] mono text-purple-400 uppercase tracking-widest">AI RECOMMENDATION</div>
          </div>

          <div className="p-5 flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 flex-shrink-0">
              {isLoadingAction ? (
                <div className="h-5 w-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              ) : (
                <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <div className="h-5 w-32 bg-zinc-800 animate-pulse rounded" />
                  <div className="h-4 w-64 bg-zinc-800 animate-pulse rounded" />
                </div>
              ) : nextAction ? (
                <div className="animate-fade-up">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {nextAction.action}
                    {nextAction.priority === "high" && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[8px] font-mono text-red-400 uppercase">Priority</span>
                    )}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1 max-w-xl">
                    {nextAction.description}
                  </p>
                  <div className="mt-4">
                    <Link
                      href={nextAction.link}
                      className="inline-flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors group"
                    >
                      Take Action Now
                      <svg className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 italic">Analyzing your career path...</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Applications",
              value: stats.applications,
              sublabel: "tracked",
              color: "purple",
              icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
            },
            {
              label: "Saved Jobs",
              value: stats.savedJobs,
              sublabel: "bookmarked",
              color: "cyan",
              icon: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z",
            },
            {
              label: "Interviews",
              value: stats.interviews,
              sublabel: "scheduled",
              color: "green",
              icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
            },
          ].map((stat, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-[#14141f] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="mono text-xs text-zinc-500 uppercase tracking-wider">
                  {stat.label}
                </span>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${stat.color === "purple" ? "bg-purple-500/20" :
                  stat.color === "cyan" ? "bg-cyan-500/20" :
                    "bg-green-500/20"
                  }`}>
                  <svg className={`h-4 w-4 ${stat.color === "purple" ? "text-purple-400" :
                    stat.color === "cyan" ? "text-cyan-400" :
                      "text-green-400"
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="mono text-xs text-zinc-600 mt-1">{stat.sublabel}</div>
            </div>
          ))}
        </div>

        {/* Empty state — new user onboarding checklist */}
        {!isLoadingAction && stats.applications === 0 && stats.savedJobs === 0 && stats.interviews === 0 && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-white text-base">Get started in 3 steps</h2>
                <p className="mono text-xs text-zinc-500 mt-0.5">Your agent is ready — here&apos;s what to do first</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { step: "1", label: "Upload your CV", desc: "Lets AI extract your skills for matching", href: "/resumes" },
                { step: "2", label: "Browse jobs", desc: "Find roles and see your fit score", href: "/jobs" },
                { step: "3", label: "Apply with confidence", desc: "Generate a cover letter, prep for interviews", href: "/resumes?tab=cover-letter" },
              ].map((item) => (
                <a
                  key={item.step}
                  href={item.href}
                  className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-4 hover:border-white/10 hover:bg-white/[0.06] transition-all group"
                >
                  <div className="h-8 w-8 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="mono text-xs font-bold text-amber-400">{item.step}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{item.label}</div>
                    <div className="mono text-xs text-zinc-500 mt-0.5">{item.desc}</div>
                  </div>
                  <svg className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 text-left transition-all hover:border-purple-500/40 hover:bg-purple-500/10"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-white text-lg">Upload CV</div>
                <div className="mono text-xs text-zinc-500 mt-1">Enable job matching</div>
              </div>
            </div>
          </button>
          <Link
            href="/jobs"
            className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <svg className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-white text-lg">Find Jobs</div>
                <div className="mono text-xs text-zinc-500 mt-1">AI-matched opportunities</div>
              </div>
            </div>
          </Link>
        </div>

        {/* CV Upload Panel */}
        {showUpload && (
          <div className="rounded-2xl border border-white/10 bg-[#14141f] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white">Upload Your CV</h2>
              </div>
              <button
                onClick={() => setShowUpload(false)}
                className="rounded-lg p-2 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <CVUpload onAnalysisStart={handleAnalysisStart} />
          </div>
        )}

        {/* Quick Links */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/interview",
              label: "Interview Prep",
              icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
              color: "purple",
            },
            {
              href: "/resumes?tab=cover-letter",
              label: "Cover Letter",
              icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
              color: "cyan",
            },
            {
              href: "/applications",
              label: "Applications",
              icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
              color: "amber",
            },
            {
              href: "/referrals",
              label: "Refer & Earn",
              icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
              color: "green",
            },
          ].map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className="rounded-2xl border border-white/10 bg-[#14141f] p-5 transition-all hover:border-white/20 hover:bg-[#1a1a28]"
            >
              <div className={`h-10 w-10 rounded-lg mb-3 flex items-center justify-center ${action.color === "purple" ? "bg-purple-500/20" :
                action.color === "cyan" ? "bg-cyan-500/20" :
                  action.color === "amber" ? "bg-amber-500/20" :
                    "bg-green-500/20"
                }`}>
                <svg
                  className={`h-5 w-5 ${action.color === "purple" ? "text-purple-400" :
                    action.color === "cyan" ? "text-cyan-400" :
                      action.color === "amber" ? "text-amber-400" :
                        "text-green-400"
                    }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
                </svg>
              </div>
              <div className="font-medium text-white">{action.label}</div>
              <div className="mono text-xs text-zinc-600 mt-1">→</div>
            </Link>
          ))}
        </div>
        {/* Analytics section — only shown once user has activity */}
        {stats.applications > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
              <span className="mono text-[10px] text-zinc-600 uppercase tracking-widest px-2">Progress</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Response Rate", value: `${analytics.responseRate}%`, color: "cyan" },
                { label: "CVs Uploaded", value: analytics.resumeCount, color: "purple" },
                { label: "Active Alerts", value: analytics.alertCount, color: "amber" },
              ].map((item, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-[#14141f] p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="mono text-[10px] text-zinc-500 uppercase tracking-wider">{item.label}</span>
                    <div className={`h-1.5 w-1.5 rounded-full ${item.color === "cyan" ? "bg-cyan-400" : item.color === "purple" ? "bg-purple-400" : "bg-amber-400"}`} />
                  </div>
                  <div className="text-2xl font-bold text-white">{item.value}</div>
                </div>
              ))}
            </div>

            {Object.keys(analytics.statusCounts).length > 0 && (
              <div className="rounded-xl border border-white/10 bg-[#14141f] p-5">
                <span className="text-xs font-medium text-zinc-400">Application Status</span>
                <div className="mt-3 space-y-2.5">
                  {Object.entries(analytics.statusCounts).map(([status, count]) => {
                    const total = stats.applications;
                    const pct = Math.round((count / total) * 100);
                    const colors: Record<string, string> = {
                      Applied: "bg-cyan-500",
                      Screening: "bg-amber-500",
                      Interview: "bg-purple-500",
                      Offer: "bg-green-500",
                      Rejected: "bg-red-500",
                      Withdrawn: "bg-zinc-500",
                    };
                    const textColors: Record<string, string> = {
                      Applied: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
                      Screening: "text-amber-400 border-amber-500/30 bg-amber-500/10",
                      Interview: "text-purple-400 border-purple-500/30 bg-purple-500/10",
                      Offer: "text-green-400 border-green-500/30 bg-green-500/10",
                      Rejected: "text-red-400 border-red-500/30 bg-red-500/10",
                      Withdrawn: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
                    };
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <span className={`mono text-xs px-2 py-0.5 rounded border flex-shrink-0 ${textColors[status] || textColors.Applied}`}>
                          {status}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${colors[status] || colors.Applied}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="mono text-xs text-zinc-500 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {analytics.recentApps.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-[#14141f] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-400">Recent Applications</span>
                  <a href="/applications" className="mono text-xs text-purple-400 hover:text-purple-300">View all →</a>
                </div>
                <div className="space-y-2">
                  {analytics.recentApps.map((app) => {
                    const textColors: Record<string, string> = {
                      Applied: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
                      Screening: "text-amber-400 border-amber-500/30 bg-amber-500/10",
                      Interview: "text-purple-400 border-purple-500/30 bg-purple-500/10",
                      Offer: "text-green-400 border-green-500/30 bg-green-500/10",
                      Rejected: "text-red-400 border-red-500/30 bg-red-500/10",
                      Withdrawn: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
                    };
                    return (
                      <div key={app.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-900/30">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-white truncate block">
                            {app.jobTitle || "Untitled Role"}
                          </span>
                          {app.companyName && <span className="mono text-xs text-zinc-500">{app.companyName}</span>}
                        </div>
                        <span className={`mono text-xs px-1.5 py-0.5 rounded border flex-shrink-0 ml-3 ${textColors[app.status] || textColors.Applied}`}>
                          {app.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
