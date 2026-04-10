"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import CVUpload from "@/app/components/cv-upload";

export default function DashboardPage() {
  const { isLoaded } = useAuth();
  const { user } = useUser();
  const [showUpload, setShowUpload] = useState(false);
  const [stats, setStats] = useState({ applications: 0, savedJobs: 0, interviews: 0 });

  useEffect(() => {
    fetch("/api/applications")
      .then((res) => res.json())
      .then((data) => {
        if (data.applications) {
          setStats((prev) => ({ ...prev, applications: data.applications.length }));
        }
      })
      .catch(console.error);
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-emerald-400">Loading...</div>
      </div>
    );
  }

  const firstName = user?.firstName || "there";

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Welcome back, {firstName}</h1>
        <p className="mt-2 text-slate-400">
          Track your job applications and improve your career profile.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          { label: "Applications", value: stats.applications, icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color: "emerald" },
          { label: "Saved Jobs", value: stats.savedJobs, icon: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z", color: "amber" },
          { label: "Interviews", value: stats.interviews, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "blue" },
          { label: "Profile Views", value: 0, icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z", color: "purple" },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-400">{stat.label}</span>
              <div className={`h-10 w-10 rounded-lg bg-${stat.color}-500/20 flex items-center justify-center`}>
                <svg className={`h-5 w-5 text-${stat.color}-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {showUpload && (
        <div className="mb-8 rounded-xl glass-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Upload Your CV</h2>
            <button
              onClick={() => setShowUpload(false)}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
          <CVUpload />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl glass-card p-6 card-hover">
          <div className={`h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4`}>
            <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">Your CV</h3>
          <p className="mt-2 text-sm text-slate-400">
            Upload and manage your CV for job fit analysis.
          </p>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="mt-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all"
          >
            {showUpload ? "Cancel" : "Upload CV"}
          </button>
        </div>

        <div className="rounded-xl glass-card p-6 card-hover">
          <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">Find Jobs</h3>
          <p className="mt-2 text-sm text-slate-400">
            Discover roles that match your skills and experience.
          </p>
          <Link href="/jobs" className="mt-4 inline-block rounded-lg border border-emerald-500/50 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition-all">
            Browse Jobs
          </Link>
        </div>

        <div className="rounded-xl glass-card p-6 card-hover">
          <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">Interview Prep</h3>
          <p className="mt-2 text-sm text-slate-400">
            Practice with questions tailored to your target roles.
          </p>
          <Link href="/interview" className="mt-4 inline-block rounded-lg border border-purple-500/50 px-4 py-2 text-sm font-medium text-purple-400 hover:bg-purple-500/10 transition-all">
            Start Practice
          </Link>
        </div>
      </div>

      <div className="mt-8 rounded-xl glass-card p-6">
        <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/jobs", label: "Search Jobs", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" },
            { href: "/resumes", label: "Manage Resumes", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
            { href: "/cover-letter", label: "Write Cover Letter", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
            { href: "/analytics", label: "View Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
          ].map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 text-slate-300 hover:border-emerald-500/50 hover:bg-slate-800 transition-all"
            >
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
              </svg>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
