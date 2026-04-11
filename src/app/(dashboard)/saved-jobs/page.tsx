"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { toast } from "sonner";

interface SavedJob {
  id: string;
  externalJobId: string;
  title: string;
  companyName: string | null;
  location: string | null;
  country: string | null;
  workMode: string | null;
  applicationUrl: string | null;
  savedAt: string;
}

export default function SavedJobsPage() {
  const { userId, isLoaded } = useAuth();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchSavedJobs();
    }
  }, [userId]);

  const fetchSavedJobs = async () => {
    try {
      const response = await fetch("/api/saved-jobs");
      if (response.ok) {
        const data = await response.json();
        setSavedJobs(data.savedJobs || []);
      }
    } catch (error) {
      console.error("Error fetching saved jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeSavedJob = async (jobId: string) => {
    if (!confirm("Remove this job from saved?")) return;

    setDeleting(jobId);
    try {
      const response = await fetch(`/api/saved-jobs?jobId=${encodeURIComponent(jobId)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSavedJobs(savedJobs.filter((job) => job.externalJobId !== jobId));
        toast.success("Job removed from saved");
      }
    } catch (error) {
      console.error("Error removing saved job:", error);
      toast.error("Failed to remove saved job");
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Saved Jobs</h1>
          <p className="mt-2 text-slate-400">
            Jobs you&apos;ve saved for later. {savedJobs.length > 0 && `(${savedJobs.length} jobs)`}
          </p>
        </div>
        <Link
          href="/jobs"
          className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Find More Jobs
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl glass-card p-6">
              <div className="h-6 w-1/3 rounded bg-slate-700"></div>
              <div className="mt-2 h-4 w-1/4 rounded bg-slate-700"></div>
            </div>
          ))}
        </div>
      ) : savedJobs.length === 0 ? (
        <div className="rounded-xl glass-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
            <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">No Saved Jobs</h3>
          <p className="mt-2 text-slate-400">
            Save jobs you&apos;re interested in to review them later.
          </p>
          <Link
            href="/jobs"
            className="mt-4 inline-block text-emerald-400 hover:text-emerald-300"
          >
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {savedJobs.map((job) => (
            <div
              key={job.id}
              className="rounded-xl glass-card p-6 transition hover:border-emerald-500/30"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                      Saved
                    </span>
                  </div>
                  <p className="mt-1 font-medium text-emerald-400">{job.companyName || "Unknown Company"}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                    {job.location && (
                      <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {job.location}
                      </span>
                    )}
                    {job.workMode && (
                      <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {job.workMode}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Saved {formatDate(job.savedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {job.applicationUrl && (
                    <a
                      href={job.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                      Apply
                    </a>
                  )}
                  <button
                    onClick={() => removeSavedJob(job.externalJobId)}
                    disabled={deleting === job.externalJobId}
                    className="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deleting === job.externalJobId ? "..." : "Remove"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
