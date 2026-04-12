"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import CVUpload from "@/app/components/cv-upload";

export default function DashboardPage() {
  const { isLoaded } = useAuth();
  const { user } = useUser();
  const [showUpload, setShowUpload] = useState(false);
  const [stats, setStats] = useState({
    applications: 0,
    savedJobs: 0,
    interviews: 0,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/applications").then((res) => res.json()),
      fetch("/api/saved-jobs").then((res) => res.json()),
    ])
      .then(([appsData, savedData]) => {
        const applications = appsData.applications || [];
        const interviews = applications.filter(
          (application: { status?: string }) =>
            ["Screening", "Interview"].includes(application.status || ""),
        ).length;

        setStats({
          applications: applications.length,
          savedJobs: savedData.savedJobs?.length || 0,
          interviews,
        });
      })
      .catch(console.error);
  }, []);

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

  return (
    <div className="max-w-5xl mx-auto">
      {/* Agent Header */}
      <div className="mb-8 animate-fade-up">
        <div className="agent-card p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {firstName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-[#0a0a0f]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white">
                  Hey, {firstName}
                </h1>
                <div className="agent-status rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1">
                  <div className="status-dot" />
                  <span className="mono text-xs text-purple-300">Agent Active</span>
                </div>
              </div>
              <p className="mono text-sm text-zinc-500 mt-1">
                Your career agent is ready to help you find opportunities
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8 animate-fade-up delay-100">
        {[
          {
            label: "Applications",
            value: stats.applications,
            sublabel: "tracked",
            color: "purple",
          },
          {
            label: "Saved Jobs",
            value: stats.savedJobs,
            sublabel: "bookmarked",
            color: "cyan",
          },
          {
            label: "Interviews",
            value: stats.interviews,
            sublabel: "scheduled",
            color: "green",
          },
        ].map((stat, i) => (
          <div key={i} className="agent-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="mono text-xs text-zinc-500 uppercase tracking-wider">
                {stat.label}
              </span>
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  stat.color === "purple"
                    ? "bg-purple-500/20"
                    : stat.color === "cyan"
                    ? "bg-cyan-500/20"
                    : "bg-green-500/20"
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    stat.color === "purple"
                      ? "bg-purple-400"
                      : stat.color === "cyan"
                      ? "bg-cyan-400"
                      : "bg-green-400"
                  }`}
                />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">{stat.value}</div>
            <div className="mono text-xs text-zinc-600 mt-1">{stat.sublabel}</div>
          </div>
        ))}
      </div>

      {/* Agent Actions */}
      <div className="mb-8 animate-fade-up delay-200">
        <div className="agent-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Career Agent</h2>
          </div>
          <p className="mono text-sm text-zinc-500 mb-4">
            What would you like to do today?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-left transition-all hover:border-purple-500/40 hover:bg-purple-500/10"
            >
              <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-white">Upload CV</div>
                <div className="mono text-xs text-zinc-500">Enable job matching</div>
              </div>
            </button>
            <Link
              href="/jobs"
              className="flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-left transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10"
            >
              <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-white">Find Jobs</div>
                <div className="mono text-xs text-zinc-500">AI-matched opportunities</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* CV Upload Panel */}
      {showUpload && (
        <div className="mb-8 animate-fade-up">
          <div className="agent-card p-6">
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
            <CVUpload />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-up delay-300">
        {[
          {
            href: "/interview",
            label: "Interview Prep",
            icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
            color: "purple",
          },
          {
            href: "/cover-letter",
            label: "Cover Letter",
            icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
            color: "cyan",
          },
          {
            href: "/analytics",
            label: "Analytics",
            icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
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
            className="agent-card p-5 glass-card-hover"
          >
            <div
              className={`h-10 w-10 rounded-lg mb-3 flex items-center justify-center ${
                action.color === "purple"
                  ? "bg-purple-500/20"
                  : action.color === "cyan"
                  ? "bg-cyan-500/20"
                  : action.color === "amber"
                  ? "bg-amber-500/20"
                  : "bg-green-500/20"
              }`}
            >
              <svg
                className={`h-5 w-5 ${
                  action.color === "purple"
                    ? "text-purple-400"
                    : action.color === "cyan"
                    ? "text-cyan-400"
                    : action.color === "amber"
                    ? "text-amber-400"
                    : "text-green-400"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
              </svg>
            </div>
            <div className="font-medium text-white">{action.label}</div>
            <div className="mono text-xs text-zinc-500 mt-1">
              →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
