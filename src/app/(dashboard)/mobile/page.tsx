"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";

interface Job {
  id: string;
  title: string;
  companyName: string;
  location: string;
  workMode: string;
  description: string;
  isSaved: boolean;
}

const SEARCH_DEBOUNCE_MS = 400;

export default function MobileAppPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const trimmedSearchInput = useMemo(() => searchInput.trim(), [searchInput]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchQuery(trimmedSearchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [trimmedSearchInput]);

  useEffect(() => {
    const fetchJobs = async () => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (searchQuery) {
          params.set("search", searchQuery);
        }

        const response = await fetch(`/api/jobs?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch jobs");
        }

        const data = await response.json();

        if (!isMountedRef.current || controller.signal.aborted) {
          return;
        }

        setJobs(data.jobs?.slice(0, 5) || []);
      } catch (err) {
        if (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"))) {
          return;
        }
        if (!isMountedRef.current) return;
        console.error("Error fetching jobs:", err);
        setJobs([]);
        setError("Could not load jobs. Please try again.");
      } finally {
        if (isMountedRef.current && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchJobs();
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(trimmedSearchInput);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

  const isSearching = Boolean(searchQuery);

  return (
    <div className="max-w-xl mx-auto">
      <div className="agent-card p-6 mb-6 animate-fade-up">
        <div className="text-center">
          <div className="h-14 w-14 mx-auto rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center mb-4">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Quick Search</h1>
          <p className="mono text-xs text-zinc-500 mt-1">job_search_mobile</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            aria-label="Search jobs"
            placeholder="Search jobs, skills..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="agent-input flex-1"
          />
          <button type="submit" className="agent-button-primary px-4">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
        </div>
      </form>

      <div className="mono text-xs text-zinc-600 mb-4 flex items-center justify-between">
        <span>
          {loading ? "searching..." : isSearching ? `"${searchQuery}"` : "latest_opportunities"}
        </span>
        {isSearching && (
          <button onClick={clearSearch} className="text-purple-400 hover:text-purple-300">
            clear
          </button>
        )}
      </div>

      <div className="space-y-3 mb-6">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="agent-card p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-2/3 rounded bg-zinc-800" />
                <div className="h-3 w-1/3 rounded bg-zinc-800" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="agent-card p-6 text-center">
            <p className="mono text-xs text-red-400">{error}</p>
            <button onClick={() => setSearchQuery(trimmedSearchInput)} className="mono text-xs text-purple-400 hover:text-purple-300 mt-3">
              try_again
            </button>
          </div>
        ) : jobs.length > 0 ? (
          jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="agent-card p-4 block">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">{job.title}</h3>
                  <p className="mono text-xs text-cyan-400 mt-1">{job.companyName}</p>
                  <p className="mono text-xs text-zinc-600 mt-1">@ {job.location} • {job.workMode}</p>
                </div>
                <span className="mono text-xs text-purple-400 flex-shrink-0">→</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="agent-card p-6 text-center">
            <p className="mono text-xs text-zinc-500">
              {isSearching ? "no_results_found" : "no_jobs_available"}
            </p>
          </div>
        )}
      </div>

      <div className="agent-card p-4">
        <span className="mono text-xs text-zinc-600 uppercase tracking-wider">quick_actions</span>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {[
            { href: "/jobs", label: "Browse Jobs", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", color: "cyan" },
            { href: "/resumes", label: "My Resumes", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color: "purple" },
            { href: "/applications", label: "Applications", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", color: "amber" },
            { href: "/alerts", label: "Job Alerts", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", color: "green" },
          ].map((item, i) => (
            <Link key={i} href={item.href} className="flex items-center gap-2 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
              <svg className={`h-4 w-4 text-${item.color}-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              <span className="mono text-xs text-zinc-400">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="text-center mt-6">
        <Link href="/dashboard" className="mono text-xs text-zinc-600 hover:text-zinc-400">
          ← full_dashboard
        </Link>
      </div>
    </div>
  );
}
