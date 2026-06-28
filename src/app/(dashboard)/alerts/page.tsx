"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import Link from "next/link";

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

export default function AlertsPage() {
  const { userId, isLoaded } = useAuth();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    searchQuery: "",
    location: "",
    workMode: "",
    seniority: "",
    alertEnabled: true,
    alertFrequency: "daily",
  });

  useEffect(() => {
    if (userId) {
      fetchSearches();
    }
  }, [userId]);

  const fetchSearches = async () => {
    try {
      const response = await fetch("/api/searches");
      if (response.ok) {
        const data = await response.json();
        setSearches(data.searches || []);
      }
    } catch (error) {
      console.error("Error fetching searches:", error);
    } finally {
      setLoading(false);
    }
  };

  const createSearch = async () => {
    if (!formData.name || !formData.searchQuery) {
      toast.error("Name and search query required");
      return;
    }

    try {
      const response = await fetch("/api/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Alert created!");
        setShowCreate(false);
        setFormData({
          name: "",
          searchQuery: "",
          location: "",
          workMode: "",
          seniority: "",
          alertEnabled: true,
          alertFrequency: "daily",
        });
        fetchSearches();
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
        setSearches(searches.map(s =>
          s.id === id ? { ...s, alertEnabled: enabled } : s
        ));
        toast.success(enabled ? "Alert enabled" : "Alert disabled");
      }
    } catch {
      toast.error("Failed to update alert");
    }
  };

  const deleteSearch = async (id: string) => {
    if (!confirm("Delete this alert?")) return;

    try {
      const response = await fetch(`/api/searches/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSearches(searches.filter(s => s.id !== id));
        toast.success("Alert deleted");
      }
    } catch {
      toast.error("Failed to delete alert");
    }
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
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Page header */}
      <div className="animate-fade-up flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Job Alerts</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{searches.length} alert{searches.length !== 1 ? "s" : ""} configured</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="agent-button-primary press-scale">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {showCreate ? "Cancel" : "New Alert"}
        </button>
      </div>

      {/* Create form */}
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
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="agent-input"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">Search Query *</label>
                <input
                  type="text"
                  placeholder="e.g., Software Engineer"
                  value={formData.searchQuery}
                  onChange={(e) => setFormData({ ...formData, searchQuery: e.target.value })}
                  className="agent-input"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">Location</label>
                <input
                  type="text"
                  placeholder="e.g., Lagos, Nigeria"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="agent-input"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">Frequency</label>
                <select
                  value={formData.alertFrequency}
                  onChange={(e) => setFormData({ ...formData, alertFrequency: e.target.value })}
                  className="agent-input cursor-pointer"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">Work Mode</label>
                <select
                  value={formData.workMode}
                  onChange={(e) => setFormData({ ...formData, workMode: e.target.value })}
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
                  value={formData.seniority}
                  onChange={(e) => setFormData({ ...formData, seniority: e.target.value })}
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
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
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
        <div className="animate-fade-up rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-12 text-center">
          <div className="empty-state-icon">
            <svg className="h-7 w-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">No alerts yet</h3>
          <p className="mono text-xs text-zinc-500 mt-2 mb-4">Get notified when matching jobs are posted.</p>
          <button onClick={() => setShowCreate(true)} className="agent-button-primary press-scale">
            Create your first alert
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2.5">
            {searches.map((search, idx) => (
              <div
                key={search.id}
                className={`animate-fade-up rounded-2xl border border-white/[0.08] bg-[#0d0d18] overflow-hidden transition-all duration-300 hover:border-cyan-500/20 accent-bar-cyan delay-${Math.min(idx * 100, 300)}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{search.name}</span>
                        <span className={`mono text-[10px] px-2 py-0.5 rounded border ${search.alertEnabled ? "bg-green-500/15 border-green-500/25 text-green-400" : "bg-zinc-800 border-zinc-700 text-zinc-500"}`}>
                          {search.alertEnabled ? "active" : "paused"}
                        </span>
                      </div>
                      <p className="mono text-xs text-zinc-400 mt-1">
                        {search.searchQuery}{search.location ? ` @ ${search.location}` : ""}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {search.workMode && (
                          <span className="mono text-[10px] text-zinc-500 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06]">{search.workMode}</span>
                        )}
                        {search.seniority && (
                          <span className="mono text-[10px] text-zinc-500 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06]">{search.seniority}</span>
                        )}
                        <span className="mono text-[10px] text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">{search.alertFrequency}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Toggle switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={search.alertEnabled}
                          onChange={(e) => toggleAlert(search.id, e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="peer h-5 w-9 rounded-full bg-zinc-800 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:border after:border-zinc-600 after:bg-zinc-500 after:transition-all peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                      </label>
                      <Link
                        href={`/jobs?search=${encodeURIComponent(search.searchQuery)}`}
                        className="agent-button text-xs px-2 py-1.5"
                      >
                        Search
                      </Link>
                      <button
                        onClick={() => deleteSearch(search.id)}
                        className="mono text-xs px-2 py-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:border-red-500/40 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* How alerts work */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
            <p className="section-label">How Alerts Work</p>
            <ul className="space-y-2">
              {[
                "Daily or weekly checks for matching jobs",
                "Email notification when matching jobs are found",
                "Toggle alerts on/off without losing your search",
              ].map((item, i) => (
                <li key={i} className="text-xs text-zinc-500 flex items-center gap-2">
                  <span className="text-cyan-400 flex-shrink-0">→</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
