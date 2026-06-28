"use client";

import { useState, useEffect, useMemo } from "react";
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

interface HistoryEntry {
  id: string;
  previousStatus: string | null;
  newStatus: string;
  notes: string | null;
  createdAt: string;
}

interface ApplicationWithHistory extends Application {
  history?: HistoryEntry[];
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string; accentBar: string }> = {
  Applied: {
    color: "text-cyan-400",
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/30",
    accentBar: "accent-bar-cyan",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
  },
  Screening: {
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    accentBar: "accent-bar-amber",
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
  },
  Interview: {
    color: "text-purple-400",
    bg: "bg-purple-500/15",
    border: "border-purple-500/30",
    accentBar: "accent-bar-purple",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
  },
  Offer: {
    color: "text-green-400",
    bg: "bg-green-500/15",
    border: "border-green-500/30",
    accentBar: "accent-bar-green",
    icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
  },
  Rejected: {
    color: "text-red-400",
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    accentBar: "accent-bar-red",
    icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
  },
  Withdrawn: {
    color: "text-zinc-400",
    bg: "bg-zinc-500/15",
    border: "border-zinc-500/30",
    accentBar: "accent-bar-zinc",
    icon: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
  },
};

const STATUS_OPTIONS = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Withdrawn"];

export default function ApplicationsPage() {
  const { userId, isLoaded } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (userId) {
      fetchApplications();
    } else {
      setLoading(false);
    }
  }, [isLoaded, userId]);

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

  const fetchApplicationHistory = async (id: string) => {
    try {
      const response = await fetch(`/api/applications/${id}`);
      const data = await response.json();
      if (data.application) {
        setApplications(prev => prev.map(app =>
          app.id === id ? { ...app, history: data.application.history || [] } : app
        ));
      }
    } catch (error) {
      console.error("Error fetching history:", error);
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
        const data = await response.json();
        setApplications(prev => prev.map(app => {
          if (app.id === id) {
            const newApp = { ...app, status };
            if (data.application?.history) {
              newApp.history = data.application.history;
            }
            return newApp;
          }
          return app;
        }));
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
        setApplications(prev => prev.filter((app) => app.id !== id));
      }
    } catch (error) {
      console.error("Error deleting application:", error);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      const app = applications.find(a => a.id === id);
      if (app && !app.history) {
        fetchApplicationHistory(id);
      }
    }
  };

  const stats = useMemo(() => {
    const total = applications.length;
    const active = applications.filter(a => !["Rejected", "Withdrawn"].includes(a.status)).length;
    const interviews = applications.filter(a => a.status === "Interview").length;
    const offers = applications.filter(a => a.status === "Offer").length;
    const responseRate = total > 0 ? Math.round(((applications.filter(a => !["Applied"].includes(a.status)).length) / total) * 100) : 0;
    return { total, active, interviews, offers, responseRate };
  }, [applications]);

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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
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
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Page header */}
      <div className="animate-fade-up flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Applications</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{applications.length} tracked applications</p>
        </div>
        <Link href="/jobs" className="agent-button-primary press-scale">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          Find Jobs
        </Link>
      </div>

      {/* Stat cards */}
      <div className="animate-fade-up delay-100 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card stat-card-zinc text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="section-label mb-0 mt-0.5">Total</div>
        </div>
        <div className="stat-card stat-card-cyan text-center">
          <div className="text-2xl font-bold text-white">{stats.active}</div>
          <div className="section-label mb-0 mt-0.5">Active</div>
        </div>
        <div className="stat-card stat-card-purple text-center">
          <div className="text-2xl font-bold text-white">{stats.interviews}</div>
          <div className="section-label mb-0 mt-0.5">Interviews</div>
        </div>
        <div className="stat-card stat-card-green text-center">
          <div className="text-2xl font-bold text-white">{stats.offers}</div>
          <div className="section-label mb-0 mt-0.5">Offers</div>
        </div>
      </div>

      {/* Filter tabs — pill style */}
      <div className="animate-fade-up delay-200">
        <div className="tab-pill-container flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`tab-pill ${filter === "all" ? "tab-pill-active" : ""}`}
          >
            All ({applications.length})
          </button>
          {STATUS_OPTIONS.map((status) => {
            const count = applications.filter((a) => a.status === status).length;
            const config = STATUS_CONFIG[status];
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`tab-pill ${filter === status ? "tab-pill-active" : ""}`}
                style={filter === status ? {
                  background: config.bg.replace("bg-", "").replace("/15", ""),
                  borderColor: config.border.replace("border-", ""),
                } : undefined}
              >
                {status} {count > 0 ? `(${count})` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
              <div className="animate-pulse space-y-3">
                <div className="h-5 w-1/3 rounded bg-white/5" />
                <div className="h-4 w-1/4 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-12 text-center">
          <div className="empty-state-icon">
            <svg className="h-7 w-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white">No applications</h3>
          <p className="mono text-xs text-zinc-500 mt-2">
            {filter === "all"
              ? "Start applying to jobs to track your progress."
              : `No ${filter.toLowerCase()} applications.`}
          </p>
          <Link href="/jobs" className="mono text-xs text-purple-400 hover:text-purple-300 mt-4 inline-block transition-colors">
            Browse Jobs →
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredApplications.map((application) => {
            const config = STATUS_CONFIG[application.status] || STATUS_CONFIG.Applied;
            const isExpanded = expandedId === application.id;
            return (
              <div
                key={application.id}
                className={`rounded-2xl border border-white/[0.08] bg-[#0d0d18] overflow-hidden transition-all duration-300 hover:border-white/[0.12] ${config.accentBar}`}
              >
                <div className="p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => toggleExpand(application.id)}
                          className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <svg className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <h3 className="text-sm font-semibold text-white truncate">
                          {application.jobTitle || `Job #${application.jobId.slice(0, 8)}`}
                        </h3>
                        <span className={`mono text-[10px] px-2 py-0.5 rounded border flex-shrink-0 ${config.bg} ${config.border} ${config.color}`}>
                          {application.status}
                        </span>
                      </div>
                      {application.companyName && (
                        <p className="mono text-xs text-cyan-400 mt-1 ml-6">{application.companyName}</p>
                      )}
                      <div className="mono text-xs text-zinc-500 mt-1.5 ml-6 flex flex-wrap gap-x-3 gap-y-0.5">
                        {application.location && <span>@ {application.location}</span>}
                        {application.workMode && <span>· {application.workMode}</span>}
                        <span>· {formatDate(application.appliedAt)}</span>
                      </div>
                      {application.notes && (
                        <p className="mono text-xs text-zinc-500 mt-1.5 ml-6 line-clamp-1">{application.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-6 md:ml-0">
                      <select
                        value={application.status}
                        onChange={(e) => updateStatus(application.id, e.target.value)}
                        className="mono text-xs px-3 py-2 rounded-lg border border-white/[0.08] bg-[#131320] text-zinc-300 focus:border-purple-500/50 focus:outline-none cursor-pointer"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt} className="bg-[#0d0d18]">{opt}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => deleteApplication(application.id)}
                        className="mono text-xs px-3 py-2 rounded-lg border border-red-500/20 text-red-400/60 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/[0.05] px-5 py-4 bg-[#131320]/60">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="mono text-[10px] text-zinc-500 uppercase tracking-widest">Timeline</span>
                    </div>

                    <div className="relative pl-6 space-y-4">
                      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-800" />

                      <div className="relative">
                        <div className={`absolute left-0 -translate-x-1/2 w-3 h-3 rounded-full ${config.bg} border-2 ${config.border}`} />
                        <div className="mono text-xs text-zinc-400">
                          Applied — {formatDateTime(application.appliedAt || new Date().toISOString())}
                        </div>
                      </div>

                      {application.history?.map((entry) => {
                        const entryConfig = STATUS_CONFIG[entry.newStatus] || STATUS_CONFIG.Applied;
                        return (
                          <div key={entry.id} className="relative">
                            <div className={`absolute left-0 -translate-x-1/2 w-3 h-3 rounded-full ${entryConfig.bg} border-2 ${entryConfig.border}`} />
                            <div className="mono text-xs text-zinc-400">
                              <span className={entryConfig.color}>{entry.newStatus}</span>
                              {entry.previousStatus && (
                                <span className="text-zinc-600"> from {entry.previousStatus}</span>
                              )}
                              <span className="text-zinc-600 ml-2">— {formatDateTime(entry.createdAt)}</span>
                            </div>
                            {entry.notes && (
                              <p className="mono text-xs text-zinc-500 mt-1">{entry.notes}</p>
                            )}
                          </div>
                        );
                      })}

                      {!application.history && (
                        <div className="mono text-xs text-zinc-600">Loading history...</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
