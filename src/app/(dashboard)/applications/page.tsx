"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

interface Application {
  id: string;
  jobId: string;
  jobTitle: string | null;
  companyName: string | null;
  location: string | null;
  workMode: string | null;
  status: string;
  appliedAt: string | null;
  notes: string | null;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  Applied: { color: "text-cyan-400", bg: "bg-cyan-500/15", border: "border-cyan-500/30" },
  Screening: { color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30" },
  Interview: { color: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-500/30" },
  Offer: { color: "text-green-400", bg: "bg-green-500/15", border: "border-green-500/30" },
  Rejected: { color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/30" },
  Withdrawn: { color: "text-zinc-400", bg: "bg-zinc-500/15", border: "border-zinc-500/30" },
};

const STATUS_OPTIONS = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Withdrawn"];

export default function ApplicationsPage() {
  const { userId, isLoaded } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (userId) {
      fetchApplications();
    }
  }, [userId]);

  const fetchApplications = async () => {
    try {
      const response = await fetch("/api/applications");
      const data = await response.json();
      setApplications(data.applications || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setApplications(
          applications.map((app) =>
            app.id === id ? { ...app, status } : app
          )
        );
      }
    } catch (error) {
      console.error("Error updating application:", error);
    }
  };

  const deleteApplication = async (id: string) => {
    if (!confirm("Remove this application?")) return;

    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setApplications(applications.filter((app) => app.id !== id));
      }
    } catch (error) {
      console.error("Error deleting application:", error);
    }
  };

  const filteredApplications =
    filter === "all"
      ? applications
      : applications.filter((app) => app.status === filter);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
            <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Applications</h1>
              <p className="mono text-xs text-zinc-500">{applications.length} tracked</p>
            </div>
          </div>
          <Link href="/jobs" className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            Find Jobs
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`mono text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            filter === "all"
              ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
              : "border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-400"
          }`}
        >
          all({applications.length})
        </button>
        {STATUS_OPTIONS.map((status) => {
          const count = applications.filter((a) => a.status === status).length;
          const config = STATUS_CONFIG[status];
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`mono text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filter === status
                  ? `${config.bg} ${config.border} ${config.color}`
                  : "border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-400"
              }`}
            >
              {status}({count})
            </button>
          );
        })}
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
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#14141f] p-12 text-center">
          <div className="h-14 w-14 mx-auto rounded-xl bg-white/5 flex items-center justify-center mb-4">
            <svg className="h-7 w-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white">No applications</h3>
          <p className="mono text-xs text-zinc-500 mt-2">
            {filter === "all"
              ? "Start applying to jobs to track your progress."
              : `No ${filter.toLowerCase()} applications.`}
          </p>
          <Link href="/jobs" className="mono text-xs text-purple-400 hover:text-purple-300 mt-4 inline-block">
            Browse Jobs →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((application) => {
            const config = STATUS_CONFIG[application.status] || STATUS_CONFIG.Applied;
            return (
              <div key={application.id} className="rounded-2xl border border-white/10 bg-[#14141f] p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-medium text-white truncate">
                        {application.jobTitle || `Job #${application.jobId.slice(0, 8)}`}
                      </h3>
                      <span className={`mono text-xs px-2 py-0.5 rounded border ${config.bg} ${config.border} ${config.color}`}>
                        {application.status}
                      </span>
                    </div>
                    {application.companyName && (
                      <p className="mono text-xs text-cyan-400 mt-1">{application.companyName}</p>
                    )}
                    <div className="mono text-xs text-zinc-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {application.location && <span>@ {application.location}</span>}
                      {application.workMode && <span>• {application.workMode}</span>}
                      <span>• {formatDate(application.appliedAt)}</span>
                    </div>
                    {application.notes && (
                      <p className="mono text-xs text-zinc-500 mt-2 line-clamp-2">{application.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={application.status}
                      onChange={(e) => updateStatus(application.id, e.target.value)}
                      className="mono text-xs px-3 py-2 rounded-lg border border-white/10 bg-[#0d0d15] text-zinc-300 focus:border-purple-500/50 focus:outline-none cursor-pointer"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} className="bg-[#0d0d15]">{opt}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => deleteApplication(application.id)}
                      className="mono text-xs px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      rm
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
