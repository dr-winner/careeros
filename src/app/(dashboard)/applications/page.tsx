"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

interface Application {
  id: string;
  jobId: string;
  status: string;
  appliedAt: string | null;
  notes: string | null;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  Applied: { color: "text-blue-700", bg: "bg-blue-100" },
  Screening: { color: "text-amber-700", bg: "bg-amber-100" },
  Interview: { color: "text-purple-700", bg: "bg-purple-100" },
  Offer: { color: "text-emerald-700", bg: "bg-emerald-100" },
  Rejected: { color: "text-red-700", bg: "bg-red-100" },
  Withdrawn: { color: "text-stone-700", bg: "bg-stone-100" },
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
        <div className="text-emerald-800">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-emerald-950">My Applications</h1>
          <p className="mt-2 text-emerald-700/70">
            Track your job applications and their status.
          </p>
        </div>
        <Link
          href="/jobs"
          className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Find More Jobs
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            filter === "all"
              ? "bg-emerald-800 text-white"
              : "bg-white text-emerald-700 hover:bg-emerald-50"
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
                  ? "bg-emerald-800 text-white"
                  : "bg-white text-emerald-700 hover:bg-emerald-50"
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
            <div key={i} className="animate-pulse rounded-xl border border-emerald-100 bg-white p-6">
              <div className="h-6 w-1/3 rounded bg-emerald-100"></div>
              <div className="mt-2 h-4 w-1/4 rounded bg-emerald-100"></div>
            </div>
          ))}
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-xl border border-emerald-100 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-emerald-950">No applications yet</h3>
          <p className="mt-2 text-emerald-600">
            {filter === "all"
              ? "Start applying to jobs to track your progress here."
              : `No applications with status "${filter}".`}
          </p>
          <Link
            href="/jobs"
            className="mt-4 inline-block text-emerald-600 hover:text-emerald-800"
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
                className="rounded-xl border border-emerald-100 bg-white p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-emerald-950">
                        Job #{application.jobId.replace("sample-", "")}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${config.bg} ${config.color}`}
                      >
                        {application.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-emerald-600">
                      Applied: {formatDate(application.appliedAt)}
                    </p>
                    {application.notes && (
                      <p className="mt-2 text-sm text-emerald-700/80">
                        {application.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={application.status}
                      onChange={(e) => updateStatus(application.id, e.target.value)}
                      className="rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-700 focus:border-emerald-500 focus:outline-none"
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
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
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
