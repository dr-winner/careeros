"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

interface Job {
  id: string;
  title: string;
  companyName: string;
  location: string;
  country: string;
  workMode: string;
  seniorityLevel: string;
  employmentType: string;
  description: string;
  requirements: string;
  postedAt: string;
  isSaved: boolean;
  applicationUrl: string;
}

const WORK_MODES = ["Full-time", "Contract", "Remote", "Hybrid", "On-site"];
const SENIORITY_LEVELS = ["Entry-Level", "Mid-Level", "Senior"];

export default function JobsPage() {
  const { userId, isLoaded } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [seniority, setSeniority] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalJobs, setTotalJobs] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const persistJobs = useCallback((jobList: Job[]) => {
    if (typeof window === "undefined" || jobList.length === 0) return;
    try {
      const existing = sessionStorage.getItem("dashboard-job-cache");
      const cache = existing ? JSON.parse(existing) : {};
      for (const job of jobList) {
        cache[job.id] = job;
      }
      sessionStorage.setItem("dashboard-job-cache", JSON.stringify(cache));
    } catch (error) {
      console.error("Error caching jobs:", error);
    }
  }, []);

  const fetchJobs = useCallback(async (isNewSearch = true) => {
    if (isNewSearch) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const params = new URLSearchParams();
      params.set("useCursor", "true");
      params.set("pageSize", "20");
      
      if (search) params.set("search", search);
      if (location) params.set("location", location);
      if (workMode) params.set("workMode", workMode);
      if (seniority) params.set("seniority", seniority);
      if (!isNewSearch && cursor) {
        params.set("cursor", cursor);
      }

      const response = await fetch(`/api/jobs?${params}`);
      const data = await response.json();
      const nextJobs = data.jobs || [];
      
      if (isNewSearch) {
        setJobs(nextJobs);
      } else {
        setJobs(prev => [...prev, ...nextJobs]);
      }
      
      setCursor(data.pagination?.cursor || null);
      setHasMore(data.pagination?.hasMore || false);
      setTotalJobs(data.pagination?.total || nextJobs.length);
      
      if (isNewSearch) {
        persistJobs(nextJobs);
      } else {
        persistJobs([...jobs, ...nextJobs]);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, location, workMode, seniority, cursor, jobs, persistJobs]);

  useEffect(() => {
    if (userId) {
      fetchJobs(true);
    }
  }, [userId]);

  const handleSearch = () => {
    setCursor(null);
    setHasMore(true);
    fetchJobs(true);
  };

  const handleClearFilters = () => {
    setSearch("");
    setLocation("");
    setWorkMode("");
    setSeniority("");
    setCursor(null);
    setHasMore(true);
    fetchJobs(true);
  };

  const toggleSave = async (jobId: string) => {
    if (!userId) return;
    try {
      const jobToToggle = jobs.find((job) => job.id === jobId);
      const response = await fetch("/api/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          jobToToggle
            ? {
                jobId: jobToToggle.id,
                title: jobToToggle.title,
                companyName: jobToToggle.companyName,
                location: jobToToggle.location,
                country: jobToToggle.country,
                workMode: jobToToggle.workMode,
                applicationUrl: jobToToggle.applicationUrl,
              }
            : { jobId },
        ),
      });

      if (response.ok) {
        const updatedJobs = jobs.map((job) =>
          job.id === jobId ? { ...job, isSaved: !job.isSaved } : job,
        );
        setJobs(updatedJobs);
        persistJobs(updatedJobs);
      }
    } catch (error) {
      console.error("Error saving job:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "1d";
    if (diff < 7) return `${diff}d`;
    if (diff < 30) return `${Math.floor(diff / 7)}w`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const hasFilters = search || location || workMode || seniority;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          <span className="mono text-sm text-zinc-400">Searching jobs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Job Search</h1>
            <p className="mono text-xs text-zinc-500">AI-matched opportunities</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="agent-card p-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search jobs, skills, roles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full bg-transparent pl-12 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg border transition-all ${
                hasFilters 
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-400" 
                  : "border-white/10 text-zinc-400 hover:bg-white/5"
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 7.586V4z" />
              </svg>
            </button>
            <button
              onClick={handleSearch}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-3">
              <div>
                <label className="mono text-xs text-zinc-500 mb-1 block">Location</label>
                <input
                  type="text"
                  placeholder="City, country..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <label className="mono text-xs text-zinc-500 mb-1 block">Work Mode</label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                >
                  <option value="">All modes</option>
                  {WORK_MODES.map(mode => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <div>
                  <label className="mono text-xs text-zinc-500 mb-1 block">Seniority</label>
                  <select
                    value={seniority}
                    onChange={(e) => setSeniority(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="">All levels</option>
                    {SENIORITY_LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                {hasFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="mono text-xs text-zinc-500 hover:text-white transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="agent-card p-5 animate-pulse">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-48 rounded bg-white/5"></div>
                  <div className="h-4 w-32 rounded bg-white/5"></div>
                </div>
                <div className="h-8 w-20 rounded bg-white/5"></div>
              </div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="agent-card p-12 text-center">
          <div className="h-12 w-12 rounded-xl bg-purple-500/20 mx-auto mb-4 flex items-center justify-center">
            <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="text-zinc-400 mb-4">No jobs found matching your criteria</p>
          {hasFilters && (
            <button onClick={handleClearFilters} className="mono text-sm text-purple-400 hover:text-purple-300">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="mono text-xs text-zinc-500">
              {totalJobs} result{totalJobs !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="mono text-xs text-zinc-500">Live</span>
            </div>
          </div>

          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="agent-card p-5 glass-card-hover">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-white truncate">{job.title}</h3>
                      {userId && (
                        <button
                          onClick={() => toggleSave(job.id)}
                          className={`p-1.5 rounded-lg transition-all ${
                            job.isSaved 
                              ? "bg-amber-500/20 text-amber-400" 
                              : "text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10"
                          }`}
                        >
                          <svg className="h-5 w-5" fill={job.isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="mono text-sm text-purple-400 mt-0.5">{job.companyName}</p>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <span className="inline-flex items-center gap-1.5 mono text-xs text-zinc-500">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {job.location}
                      </span>
                      <span className={`mono text-xs px-2 py-0.5 rounded ${
                        job.workMode === "Remote" 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-cyan-500/20 text-cyan-400"
                      }`}>
                        {job.workMode}
                      </span>
                      <span className="mono text-xs text-zinc-600">{job.seniorityLevel}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="mono text-xs text-zinc-600">{formatDate(job.postedAt)}</span>
                  </div>
                </div>

                <p className="mt-3 text-sm text-zinc-500 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <Link
                    href={`/jobs/${job.id}`}
                    onClick={() => persistJobs([job])}
                    className="flex-1 text-center py-2.5 rounded-lg border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-all text-sm font-medium"
                  >
                    View Details
                  </Link>
                  <a
                    href={job.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Apply
                  </a>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => fetchJobs(false)}
                disabled={loadingMore}
                className="px-8 py-3 rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Load More Jobs
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
