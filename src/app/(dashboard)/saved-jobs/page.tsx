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
    if (!confirm("Remove this job?")) return;

    setDeleting(jobId);
    try {
      const response = await fetch(`/api/saved-jobs?jobId=${encodeURIComponent(jobId)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSavedJobs(savedJobs.filter((job) => job.externalJobId !== jobId));
        toast.success("Job removed");
      }
    } catch (error) {
      console.error("Error removing saved job:", error);
      toast.error("Failed to remove job");
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
    if (diff < 7) return `${diff}d ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          <span className="mono text-sm text-zinc-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#14141f] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Saved Jobs</h1>
              <p className="mono text-xs text-zinc-500">{savedJobs.length} bookmarked</p>
            </div>
          </div>
          <Link href="/jobs" className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            Find Jobs
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-[#14141f] p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-5 w-1/3 rounded bg-white/5" />
                <div className="h-4 w-1/4 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : savedJobs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#14141f] p-12 text-center">
          <div className="h-14 w-14 mx-auto rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
            <svg className="h-7 w-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white">No saved jobs</h3>
          <p className="mono text-xs text-zinc-500 mt-2">
            Save jobs you&apos;re interested in to review later.
          </p>
          <Link href="/jobs" className="mono text-xs text-purple-400 hover:text-purple-300 mt-4 inline-block">
            Browse Jobs →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {savedJobs.map((job) => (
            <div key={job.id} className="rounded-2xl border border-white/10 bg-[#14141f] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-medium text-white truncate">{job.title}</h3>
                    <span className="mono text-xs px-2 py-0.5 rounded border bg-cyan-500/15 border-cyan-500/30 text-cyan-400">
                      saved
                    </span>
                  </div>
                  <p className="mono text-xs text-cyan-400 mt-1">{job.companyName || "Unknown Company"}</p>
                  <div className="mono text-xs text-zinc-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {job.location && <span>@ {job.location}</span>}
                    {job.workMode && <span>• {job.workMode}</span>}
                    <span>• {formatDate(job.savedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {job.applicationUrl && (
                    <a
                      href={job.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                    >
                      Apply
                    </a>
                  )}
                  <button
                    onClick={() => removeSavedJob(job.externalJobId)}
                    disabled={deleting === job.externalJobId}
                    className="mono text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-500 hover:border-red-500/50 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {deleting === job.externalJobId ? "..." : "rm"}
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
