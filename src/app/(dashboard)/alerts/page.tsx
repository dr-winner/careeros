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
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="text-emerald-800">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-emerald-950">Job Alerts</h1>
          <p className="mt-2 text-emerald-700/70">
            Get notified when new jobs match your criteria.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-emerald-800 px-4 py-2 text-white hover:bg-emerald-700"
        >
          {showCreate ? "Cancel" : "Create Alert"}
        </button>
      </div>

      {showCreate && (
        <div className="mb-8 rounded-xl border border-emerald-100 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-emerald-950">New Job Alert</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-700">Alert Name *</label>
              <input
                type="text"
                placeholder="e.g., Software Jobs in Lagos"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-emerald-200 px-4 py-2 text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-700">Job Search *</label>
              <input
                type="text"
                placeholder="e.g., Software Engineer"
                value={formData.searchQuery}
                onChange={(e) => setFormData({ ...formData, searchQuery: e.target.value })}
                className="w-full rounded-lg border border-emerald-200 px-4 py-2 text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-700">Location</label>
              <input
                type="text"
                placeholder="e.g., Lagos, Nigeria"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full rounded-lg border border-emerald-200 px-4 py-2 text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-700">Work Mode</label>
              <select
                value={formData.workMode}
                onChange={(e) => setFormData({ ...formData, workMode: e.target.value })}
                className="w-full rounded-lg border border-emerald-200 px-4 py-2 text-emerald-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Any</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-700">Seniority</label>
              <select
                value={formData.seniority}
                onChange={(e) => setFormData({ ...formData, seniority: e.target.value })}
                className="w-full rounded-lg border border-emerald-200 px-4 py-2 text-emerald-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Any</option>
                <option value="Entry-Level">Entry-Level</option>
                <option value="Mid-Level">Mid-Level</option>
                <option value="Senior">Senior</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-700">Frequency</label>
              <select
                value={formData.alertFrequency}
                onChange={(e) => setFormData({ ...formData, alertFrequency: e.target.value })}
                className="w-full rounded-lg border border-emerald-200 px-4 py-2 text-emerald-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
          <button
            onClick={createSearch}
            className="mt-4 w-full rounded-lg bg-emerald-800 py-2 text-white hover:bg-emerald-700"
          >
            Create Alert
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-emerald-100 bg-white p-6">
              <div className="h-6 w-1/3 rounded bg-emerald-100"></div>
            </div>
          ))}
        </div>
      ) : searches.length === 0 ? (
        <div className="rounded-xl border border-emerald-100 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-emerald-950">No Job Alerts</h3>
          <p className="mt-2 text-emerald-600">Create an alert to get notified about new jobs.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 text-emerald-600 hover:text-emerald-800"
          >
            Create your first alert
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {searches.map((search) => (
            <div key={search.id} className="rounded-xl border border-emerald-100 bg-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-emerald-950">{search.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      search.alertEnabled ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-600"
                    }`}>
                      {search.alertEnabled ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-emerald-600">
                    <span className="font-medium">{search.searchQuery}</span>
                    {search.location && ` in ${search.location}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-emerald-500">
                    {search.workMode && <span className="rounded bg-emerald-50 px-2 py-0.5">{search.workMode}</span>}
                    {search.seniority && <span className="rounded bg-emerald-50 px-2 py-0.5">{search.seniority}</span>}
                    <span className="rounded bg-amber-50 px-2 py-0.5">{search.alertFrequency}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={search.alertEnabled}
                      onChange={(e) => toggleAlert(search.id, e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-stone-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-stone-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                  <Link
                    href={`/jobs?search=${encodeURIComponent(search.searchQuery)}${search.location ? `&location=${encodeURIComponent(search.location)}` : ""}`}
                    className="rounded-lg border border-emerald-200 px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-50"
                  >
                    Search
                  </Link>
                  <button
                    onClick={() => deleteSearch(search.id)}
                    className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-emerald-100 bg-amber-50 p-4">
        <h3 className="font-semibold text-amber-800">How Job Alerts Work</h3>
        <ul className="mt-2 space-y-1 text-sm text-amber-700">
          <li>• We check for new jobs matching your criteria daily</li>
          <li>• You&apos;ll receive an email when new matching jobs are found</li>
          <li>• Toggle alerts on/off without losing your saved search</li>
        </ul>
      </div>
    </div>
  );
}
