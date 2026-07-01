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

interface SavedSearch {
  id: string;
  name: string;
  searchQuery: string;
  location: string | null;
  workMode: string | null;
  seniority: string | null;
  alertEnabled: boolean;
  alertFrequency: string;
  lastNotified: string | null;
  createdAt: string;
}

function getWorkModeAccentBar(workMode: string | null): string {
  switch (workMode) {
    case "Remote": return "accent-bar-cyan";
    case "Contract": return "accent-bar-amber";
    case "Hybrid": return "accent-bar-green";
    case "Full-time": return "accent-bar-purple";
    case "On-site": return "accent-bar-zinc";
    default: return "accent-bar-zinc";
  }
}

export default function SavedPage() {
  const { userId, isLoaded } = useAuth();
  const [activeTab, setActiveTab] = useState<"bookmarks" | "alerts">("bookmarks");

  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [alertForm, setAlertForm] = useState({
    name: "",
    searchQuery: "",
    location: "",
    workMode: "",
    seniority: "",
    alertEnabled: true,
    alertFrequency: "daily",
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchAll();
    }
  }, [userId]);

  const fetchAll = async () => {
    try {
      const [savedRes, alertsRes] = await Promise.all([
        fetch("/api/saved-jobs"),
        fetch("/api/searches"),
      ]);
      const savedData = await savedRes.json();
      const alertsData = await alertsRes.json();
      setSavedJobs(savedData.savedJobs || []);
      setSearches(alertsData.searches || []);
    } catch (error) {
      console.error("Error fetching saved data:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeSavedJob = async (jobId: string) => {
    if (!confirm("Remove this job?")) return;
    setDeleting(jobId);
    try {
      const response = await fetch(`/api/saved-jobs?jobId=${encodeURIComponent(jobId)}`, { method: "DELETE" });
      if (response.ok) {
        setSavedJobs(savedJobs.filter((job) => job.externalJobId !== jobId));
        toast.success("Job removed");
      }
    } catch {
      toast.error("Failed to remove job");
    } finally {
      setDeleting(null);
    }
  };

  const createSearch = async () => {
    if (!alertForm.name || !alertForm.searchQuery) {
      toast.error("Name and search query required");
      return;
    }
    try {
      const response = await fetch("/api/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alertForm),
      });
      if (response.ok) {
        toast.success("Alert created!");
        setShowCreate(false);
        setAlertForm({ name: "", searchQuery: "", location: "", workMode: "", seniority: "", alertEnabled: true, alertFrequency: "daily" });
        const alertsRes = await fetch("/api/searches");
        const alertsData = await alertsRes.json();
        setSearches(alertsData.searches || []);
      } else {
        toast.error("Failed to create alert");
      }
    } catch {
      toast.error("Failed to create alert");
    }
  };

  const toggleAlert = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/searches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertEnabled: enabled }),
      });
      if (response.ok) {
        setSearches(searches.map(s => s.id === id ? { ...s, alertEnabled: enabled } : s));
        toast.success(enabled ? "Alert enabled" : "Alert disabled");
      }
    } catch {
      toast.error("Failed to update alert");
    }
  };

  const deleteSearch = async (id: string) => {
    if (!confirm("Delete this alert?")) return;
    try {
      const response = await fetch(`/api/searches/${id}`, { method: "DELETE" });
      if (response.ok) {
        setSearches(searches.filter(s => s.id !== id));
        toast.success("Alert deleted");
      }
    } catch {
      toast.error("Failed to delete alert");
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
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Page header */}
      <div className="animate-fade-up flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Saved</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {!loading && `${savedJobs.length} bookmarked · ${searches.length} alerts`}
          </p>
        </div>
        {activeTab === "bookmarks" ? (
          <Link href="/jobs" className="agent-button-primary press-scale">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            Find Jobs
          </Link>
        ) : (
          <button onClick={() => setShowCreate(!showCreate)} className="agent-button-primary press-scale">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showCreate ? "Cancel" : "New Alert"}
          </button>
        )}
      </div>

      {/* Tab pills */}
      <div className="animate-fade-up delay-100">
        <div className="tab-pill-container w-fit">
          {([
            { key: "bookmarks" as const, label: "Bookmarked", count: savedJobs.length },
            { key: "alerts" as const, label: "Alerts", count: searches.length },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`tab-pill ${activeTab === t.key ? "tab-pill-active" : ""}`}
            >
              {t.label}
              {!loading && t.count > 0 && (
                <span className="ml-1.5 opacity-60">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bookmarks tab */}
      {activeTab === "bookmarks" && (
        <>
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
          ) : savedJobs.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-12 text-center">
              <div className="empty-state-icon">
                <svg className="h-7 w-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">No saved jobs</h3>
              <p className="mono text-xs text-zinc-500 mt-2 mb-4">Save jobs you&apos;re interested in to review later.</p>
              <Link href="/jobs" className="agent-button-primary press-scale">
                Browse Jobs
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {savedJobs.map((job) => (
                <div
                  key={job.id}
                  className={`rounded-2xl border border-white/[0.08] bg-[#0d0d18] overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-500/20 ${getWorkModeAccentBar(job.workMode)}`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-sm font-bold text-white truncate">{job.title}</h3>
                          <span className="mono text-[10px] px-2 py-0.5 rounded border bg-cyan-500/10 border-cyan-500/20 text-cyan-400 flex-shrink-0">
                            saved
                          </span>
                        </div>
                        <p className="mono text-xs text-cyan-400 mt-0.5 font-medium">{job.companyName || "Unknown Company"}</p>
                        <div className="mono text-xs text-zinc-500 mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
                          {job.location && <span>@ {job.location}</span>}
                          {job.workMode && (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] border ${
                              job.workMode === "Remote" ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" :
                              job.workMode === "Hybrid" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                              job.workMode === "Contract" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                              "bg-purple-500/10 border-purple-500/20 text-purple-400"
                            }`}>{job.workMode}</span>
                          )}
                          <span>· {formatDate(job.savedAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {job.applicationUrl && (
                          <a
                            href={
                              job.applicationUrl.startsWith("http://") || job.applicationUrl.startsWith("https://") || job.applicationUrl.startsWith("mailto:")
                                ? job.applicationUrl
                                : `https://${job.applicationUrl}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="agent-button-primary text-xs px-3 py-1.5 press-scale"
                          >
                            Apply
                          </a>
                        )}
                        <button
                          onClick={() => removeSavedJob(job.externalJobId)}
                          disabled={deleting === job.externalJobId}
                          className="mono text-xs px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:border-red-500/40 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          {deleting === job.externalJobId ? "..." : "Remove"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Alerts tab */}
      {activeTab === "alerts" && (
        <>
          {showCreate && (
            <div className="animate-fade-up agent-card p-5">
              <p className="section-label">Create New Alert</p>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block">Alert Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., Software Jobs"
                      value={alertForm.name}
                      onChange={(e) => setAlertForm({ ...alertForm, name: e.target.value })}
                      className="agent-input"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block">Search Query *</label>
                    <input
                      type="text"
                      placeholder="e.g., Software Engineer"
                      value={alertForm.searchQuery}
                      onChange={(e) => setAlertForm({ ...alertForm, searchQuery: e.target.value })}
                      className="agent-input"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block">Location</label>
                    <input
                      type="text"
                      placeholder="e.g., Accra, Ghana"
                      value={alertForm.location}
                      onChange={(e) => setAlertForm({ ...alertForm, location: e.target.value })}
                      className="agent-input"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block">Frequency</label>
                    <select
                      value={alertForm.alertFrequency}
                      onChange={(e) => setAlertForm({ ...alertForm, alertFrequency: e.target.value })}
                      className="agent-input cursor-pointer"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block">Work Mode</label>
                    <select
                      value={alertForm.workMode}
                      onChange={(e) => setAlertForm({ ...alertForm, workMode: e.target.value })}
                      className="agent-input cursor-pointer"
                    >
                      <option value="">Any</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1.5 block">Seniority</label>
                    <select
                      value={alertForm.seniority}
                      onChange={(e) => setAlertForm({ ...alertForm, seniority: e.target.value })}
                      className="agent-input cursor-pointer"
                    >
                      <option value="">Any</option>
                      <option value="Entry-Level">Entry Level</option>
                      <option value="Mid-Level">Mid Level</option>
                      <option value="Senior">Senior</option>
                    </select>
                  </div>
                </div>
                <button onClick={createSearch} className="agent-button-primary w-full justify-center press-scale">
                  Create Alert
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
                  <div className="animate-pulse space-y-2">
                    <div className="h-5 w-1/3 rounded bg-white/5" />
                    <div className="h-4 w-1/4 rounded bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : searches.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-12 text-center">
              <div className="empty-state-icon">
                <svg className="h-7 w-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">No alerts yet</h3>
              <p className="text-xs text-zinc-500 mt-2 mb-4">Get notified when matching jobs are posted.</p>
              <button onClick={() => setShowCreate(true)} className="agent-button-primary press-scale">
                + Create Alert
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                {searches.map((search) => (
                  <div key={search.id} className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] overflow-hidden transition-all hover:border-amber-500/20 accent-bar-amber">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white">{search.name}</span>
                            <span className={`mono text-[10px] px-2 py-0.5 rounded border ${search.alertEnabled ? "bg-green-500/15 border-green-500/25 text-green-400" : "bg-zinc-800 border-zinc-700 text-zinc-500"}`}>
                              {search.alertEnabled ? "active" : "paused"}
                            </span>
                          </div>
                          <p className="mono text-xs text-zinc-500 mt-1">
                            {search.searchQuery}{search.location ? ` @ ${search.location}` : ""}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {search.workMode && <span className="mono text-[10px] text-zinc-600 px-2 py-0.5 rounded bg-zinc-900/50">{search.workMode}</span>}
                            {search.seniority && <span className="mono text-[10px] text-zinc-600 px-2 py-0.5 rounded bg-zinc-900/50">{search.seniority}</span>}
                            <span className="mono text-[10px] text-amber-400 px-2 py-0.5 rounded bg-amber-500/10">{search.alertFrequency}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={search.alertEnabled}
                              onChange={(e) => toggleAlert(search.id, e.target.checked)}
                              className="peer sr-only"
                            />
                            <div className="peer h-5 w-9 rounded-full bg-zinc-800 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:border after:border-zinc-600 after:bg-zinc-500 after:transition-all peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                          </label>
                          <Link href={`/jobs?search=${encodeURIComponent(search.searchQuery)}`} className="agent-button text-xs px-2 py-1.5">
                            Search
                          </Link>
                          <button
                            onClick={() => deleteSearch(search.id)}
                            className="mono text-xs px-2 py-1.5 rounded-lg border border-white/[0.08] bg-white/5 text-zinc-400 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
                <p className="section-label">How Alerts Work</p>
                <ul className="space-y-2">
                  {[
                    "Daily checks for matching jobs",
                    "Email notification when found",
                    "Toggle on/off without losing search",
                  ].map((item, i) => (
                    <li key={i} className="text-xs text-zinc-500 flex items-center gap-2">
                      <span className="text-purple-400">→</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
