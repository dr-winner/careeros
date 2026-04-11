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

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  Applied: { color: "text-blue-400", bg: "bg-blue-500/20" },
  Screening: { color: "text-amber-400", bg: "bg-amber-500/20" },
  Interview: { color: "text-purple-400", bg: "bg-purple-500/20" },
  Offer: { color: "text-emerald-400", bg: "bg-emerald-500/20" },
  Rejected: { color: "text-red-400", bg: "bg-red-500/20" },
  Withdrawn: { color: "text-slate-400", bg: "bg-slate-500/20" },
};

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
    if (!confirm("Remove this application from your tracker?")) return;

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
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Applications</h1>
          <p className="mt-2 text-slate-400">
            Track your job applications and their status.
          </p>
        </div>
        <Link
          href="/jobs"
          className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Find More Jobs
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            filter === "all"
              ? "bg-gradient-to-r from-emerald-500 to-emerald-400 text-white"
              : "border border-slate-700 text-slate-400 hover:bg-slate-800"
          }`}
        >
          All ({applications.length})
        </button>
        {["Applied", "Screening", "Interview", "Offer", "Rejected"].map((status) => {
          const count = applications.filter((a) => a.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === status
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400 text-white"
                  : "border border-slate-700 text-slate-400 hover:bg-slate-800"
              }`}
            >
              {status} ({count})
            </button>
          );
        })}
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
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-xl glass-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">No applications yet</h3>
          <p className="mt-2 text-slate-400">
            {filter === "all"
              ? "Start applying to jobs to track your progress here."
              : `No applications with status "${filter}".`}
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
          {filteredApplications.map((application) => {
            const config = STATUS_CONFIG[application.status] || STATUS_CONFIG.Applied;
            return (
              <div
                key={application.id}
                className="rounded-xl glass-card p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">
                        {application.jobTitle || `Job #${application.jobId.replace("sample-", "")}`}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${config.bg} ${config.color}`}
                      >
                        {application.status}
                      </span>
                    </div>
                    {application.companyName && (
                      <p className="mt-1 text-sm text-emerald-400">
                        {application.companyName}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {application.location && <span>{application.location}</span>}
                      {application.workMode && <span>• {application.workMode}</span>}
                      <span>• Applied: {formatDate(application.appliedAt)}</span>
                    </div>
                    {application.notes && (
                      <p className="mt-2 text-sm text-slate-400">
                        {application.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={application.status}
                      onChange={(e) => updateStatus(application.id, e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-emerald-500/20"
                    >
                      <option value="Applied">Applied</option>
                      <option value="Screening">Screening</option>
                      <option value="Interview">Interview</option>
                      <option value="Offer">Offer</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Withdrawn">Withdrawn</option>
                    </select>
                    <button
                      onClick={() => deleteApplication(application.id)}
                      className="rounded-lg border border-red-500/50 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                    >
                      Remove
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
