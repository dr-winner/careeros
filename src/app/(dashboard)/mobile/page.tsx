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
        if (
          err instanceof Error &&
          (err.name === "AbortError" || err.message.includes("aborted"))
        ) {
          return;
        }

        if (!isMountedRef.current) {
          return;
        }

        console.error("Error fetching jobs:", err);
        setJobs([]);
        setError("We couldn't load jobs right now. Please try again.");
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
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600">
          <svg
            className="h-8 w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Quick Job Search</h1>
        <p className="mt-2 text-sm text-slate-400">
          Find opportunities across Africa on the go.
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-3">
        <div className="flex gap-2">
          <input
            type="text"
            aria-label="Search jobs and skills"
            placeholder="Search jobs, skills..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Search jobs"
            className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-3 text-white transition hover:opacity-90"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </button>
        </div>
      </form>

      <div className="mb-6 flex items-center justify-between text-xs text-slate-500">
        <span>
          {loading
            ? "Searching..."
            : isSearching
              ? `Showing results for "${searchQuery}"`
              : "Showing latest opportunities"}
        </span>

        {isSearching ? (
          <button
            type="button"
            onClick={clearSearch}
            className="text-emerald-400 transition hover:text-emerald-300"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="mb-6 space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl glass-card p-4">
              <div className="h-5 w-2/3 rounded bg-slate-700"></div>
              <div className="mt-2 h-4 w-1/3 rounded bg-slate-700"></div>
            </div>
          ))
        ) : error ? (
          <div className="rounded-xl glass-card p-6 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => setSearchQuery(trimmedSearchInput)}
              className="mt-3 text-sm text-emerald-400 hover:text-emerald-300"
            >
              Try again
            </button>
          </div>
        ) : jobs.length > 0 ? (
          jobs.map((job) => (
            <div key={job.id} className="rounded-xl glass-card p-4">
              <h3 className="font-semibold text-white">{job.title}</h3>
              <p className="text-sm text-emerald-400">{job.companyName}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <span>{job.location}</span>
                <span>•</span>
                <span>{job.workMode}</span>
              </div>
              <Link
                href={`/jobs/${job.id}`}
                className="mt-3 inline-block text-sm text-emerald-400 hover:text-emerald-300"
              >
                View Details →
              </Link>
            </div>
          ))
        ) : (
          <div className="rounded-xl glass-card p-6 text-center">
            <p className="text-slate-400">
              {isSearching
                ? "No jobs found. Try a different search."
                : "No jobs available right now. Please check back soon."}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl glass-card p-4">
        <h2 className="mb-3 font-semibold text-white">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/jobs"
            className="flex items-center gap-2 rounded-lg bg-slate-800 p-3 text-white hover:bg-slate-700"
          >
            <svg
              className="h-5 w-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm">Browse Jobs</span>
          </Link>
          <Link
            href="/resumes"
            className="flex items-center gap-2 rounded-lg bg-slate-800 p-3 text-white hover:bg-slate-700"
          >
            <svg
              className="h-5 w-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-sm">My Resumes</span>
          </Link>
          <Link
            href="/applications"
            className="flex items-center gap-2 rounded-lg bg-slate-800 p-3 text-white hover:bg-slate-700"
          >
            <svg
              className="h-5 w-5 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span className="text-sm">Applications</span>
          </Link>
          <Link
            href="/alerts"
            className="flex items-center gap-2 rounded-lg bg-slate-800 p-3 text-white hover:bg-slate-700"
          >
            <svg
              className="h-5 w-5 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="text-sm">Job Alerts</span>
          </Link>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/dashboard"
          className="text-sm text-slate-400 hover:text-slate-300"
        >
          ← Full Dashboard
        </Link>
      </div>
    </div>
  );
}
