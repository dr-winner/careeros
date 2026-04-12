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
    <div className="max-w-3xl mx-auto">
      <div className="agent-card p-6 mb-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Job Alerts</h1>
              <p className="mono text-xs text-zinc-500">{searches.length} configured</p>
            </div>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="agent-button-primary inline-flex">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showCreate ? "Cancel" : "New Alert"}
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="agent-card p-5 mb-6 animate-fade-up">
          <div className="text-sm font-medium text-zinc-400 mb-4">Create New Alert</div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                 <label className="text-sm text-zinc-400 mb-1 block">Alert Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Software Jobs"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="agent-input w-full"
                />
              </div>
              <div>
                 <label className="text-sm text-zinc-400 mb-1 block">Search Query *</label>
                <input
                  type="text"
                  placeholder="e.g., Software Engineer"
                  value={formData.searchQuery}
                  onChange={(e) => setFormData({ ...formData, searchQuery: e.target.value })}
                  className="agent-input w-full"
                />
              </div>
              <div>
                 <label className="text-sm text-zinc-400 mb-1 block">Location</label>
                <input
                  type="text"
                  placeholder="e.g., Lagos, Nigeria"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="agent-input w-full"
                />
              </div>
              <div>
                 <label className="text-sm text-zinc-400 mb-1 block">Frequency</label>
                <select
                  value={formData.alertFrequency}
                  onChange={(e) => setFormData({ ...formData, alertFrequency: e.target.value })}
                  className="agent-input w-full"
                >
                  <option value="daily">daily</option>
                  <option value="weekly">weekly</option>
                </select>
              </div>
              <div>
                 <label className="text-sm text-zinc-400 mb-1 block">Work Mode</label>
                <select
                  value={formData.workMode}
                  onChange={(e) => setFormData({ ...formData, workMode: e.target.value })}
                  className="agent-input w-full"
                >
                  <option value="">any</option>
                  <option value="Remote">remote</option>
                  <option value="Hybrid">hybrid</option>
                  <option value="On-site">on-site</option>
                </select>
              </div>
              <div>
                 <label className="text-sm text-zinc-400 mb-1 block">Seniority</label>
                <select
                  value={formData.seniority}
                  onChange={(e) => setFormData({ ...formData, seniority: e.target.value })}
                  className="agent-input w-full"
                >
                  <option value="">any</option>
                  <option value="Entry-Level">entry-level</option>
                  <option value="Mid-Level">mid-level</option>
                  <option value="Senior">senior</option>
                </select>
              </div>
            </div>
            <button onClick={createSearch} className="agent-button-primary w-full justify-center">
              Create Alert
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="agent-card p-5">
              <div className="animate-pulse space-y-2">
                <div className="h-5 w-1/3 rounded bg-zinc-800" />
                <div className="h-4 w-1/4 rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : searches.length === 0 ? (
        <div className="agent-card p-12 text-center">
          <div className="h-14 w-14 mx-auto rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
            <svg className="h-7 w-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white">No alerts</h3>
          <p className="mono text-xs text-zinc-500 mt-2">Create an alert to get notified.</p>
          <button onClick={() => setShowCreate(true)} className="mono text-xs text-purple-400 hover:text-purple-300 mt-4">
            + create_alert
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {searches.map((search) => (
            <div key={search.id} className="agent-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{search.name}</span>
                    <span className={`mono text-xs px-2 py-0.5 rounded border ${search.alertEnabled ? "bg-green-500/20 border-green-500/30 text-green-400" : "bg-zinc-800 border-zinc-700 text-zinc-500"}`}>
                      {search.alertEnabled ? "active" : "paused"}
                    </span>
                  </div>
                  <p className="mono text-xs text-zinc-500 mt-1">
                    {search.searchQuery}{search.location ? ` @ ${search.location}` : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {search.workMode && <span className="mono text-xs text-zinc-600 px-2 py-0.5 rounded bg-zinc-900/50">{search.workMode}</span>}
                    {search.seniority && <span className="mono text-xs text-zinc-600 px-2 py-0.5 rounded bg-zinc-900/50">{search.seniority}</span>}
                    <span className="mono text-xs text-amber-400 px-2 py-0.5 rounded bg-amber-500/10">{search.alertFrequency}</span>
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
                  <Link href={`/jobs?search=${encodeURIComponent(search.searchQuery)}`} className="agent-button text-xs px-2 py-1">
                    search
                  </Link>
                  <button onClick={() => deleteSearch(search.id)} className="mono text-xs px-2 py-1 rounded border border-zinc-800 text-zinc-500 hover:border-red-500/50 hover:text-red-400 transition-colors">
                    rm
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="agent-card p-5 mt-6">
        <span className="text-sm font-medium text-zinc-400">How Alerts Work</span>
        <ul className="mt-3 space-y-1.5">
          {[
            "Daily checks for matching jobs",
            "Email notification when found",
            "Toggle on/off without losing search",
          ].map((item, i) => (
            <li key={i} className="mono text-xs text-zinc-500 flex items-center gap-2">
              <span className="text-purple-400">→</span> {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
