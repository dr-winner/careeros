"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import CVUpload from "@/app/components/cv-upload";

export default function DashboardPage() {
  const { userId, isLoaded } = useAuth();
  const [showUpload, setShowUpload] = useState(false);

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="text-emerald-800">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-950">Welcome back</h1>
        <p className="mt-2 text-emerald-700/70">
          Track your job applications and improve your career profile.
        </p>
      </div>

      {showUpload && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-emerald-950">Upload Your CV</h2>
            <button
              onClick={() => setShowUpload(false)}
              className="text-sm text-emerald-600 hover:text-emerald-800"
            >
              Close
            </button>
          </div>
          <CVUpload />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-white p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-emerald-950">Your CV</h3>
          <p className="mt-1 text-sm text-emerald-700/70">
            Upload and manage your CV for job fit analysis.
          </p>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="mt-4 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {showUpload ? "Cancel" : "Upload CV"}
          </button>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-emerald-950">Find Jobs</h3>
          <p className="mt-1 text-sm text-emerald-700/70">
            Discover roles that match your skills and experience.
          </p>
          <button className="mt-4 rounded-lg border border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">
            Browse Jobs
          </button>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
            <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 8.25m0 0a9 9 0 10-10.5 9" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-emerald-950">Interview Prep</h3>
          <p className="mt-1 text-sm text-emerald-700/70">
            Practice with questions tailored to your target roles.
          </p>
          <button className="mt-4 rounded-lg border border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">
            Start Practice
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-emerald-100 bg-white p-6">
        <h2 className="text-xl font-semibold text-emerald-950">Recent Activity</h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-4 rounded-lg border border-stone-100 p-4">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-emerald-950">Profile Created</p>
              <p className="text-sm text-emerald-700/60">Welcome to CareerOS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
