"use client";

import { useState, useEffect } from "react";
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

export default function JobsPage() {
  const { userId, isLoaded } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [seniority, setSeniority] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchJobs();
  }, [search, location, workMode, seniority, page, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (location) params.set("location", location);
      if (workMode) params.set("workMode", workMode);
      if (seniority) params.set("seniority", seniority);
      params.set("page", page.toString());

      const response = await fetch(`/api/jobs?${params}`);
      const data = await response.json();
      setJobs(data.jobs || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSave = async (jobId: string) => {
    if (!userId) return;
    
    try {
      const response = await fetch("/api/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      
      if (response.ok) {
        setJobs(jobs.map(job => 
          job.id === jobId ? { ...job, isSaved: !job.isSaved } : job
        ));
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
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-emerald-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Find Jobs</h1>
        <p className="mt-2 text-slate-400">
          Discover opportunities across Africa that match your skills.
        </p>
      </div>

      <div className="mb-6 rounded-xl glass-card p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <input
            type="text"
            placeholder="Location..."
            value={location}
            onChange={(e) => { setLocation(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <select
            value={workMode}
            onChange={(e) => { setWorkMode(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Work Modes</option>
            <option value="Full-time">Full-time</option>
            <option value="Contract">Contract</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </select>
          <select
            value={seniority}
            onChange={(e) => { setSeniority(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Levels</option>
            <option value="Entry-Level">Entry-Level</option>
            <option value="Mid-Level">Mid-Level</option>
            <option value="Senior">Senior</option>
          </select>
          <button
            onClick={() => { setSearch(""); setLocation(""); setWorkMode(""); setSeniority(""); setPage(1); }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-300 hover:border-slate-600 hover:bg-slate-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl glass-card p-6">
              <div className="h-6 w-1/3 rounded bg-slate-700"></div>
              <div className="mt-2 h-4 w-1/4 rounded bg-slate-700"></div>
              <div className="mt-4 h-4 w-full rounded bg-slate-700"></div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl glass-card p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <p className="text-slate-400">No jobs found matching your criteria.</p>
          <button
            onClick={() => { setSearch(""); setLocation(""); setWorkMode(""); setSeniority(""); }}
            className="mt-4 text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Showing {jobs.length} job{jobs.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="grid gap-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl glass-card p-6 transition-all hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-white">
                        {job.title}
                      </h3>
                      {userId && (
                        <button
                          onClick={() => toggleSave(job.id)}
                          className={`p-1 transition-colors ${job.isSaved ? "text-amber-400" : "text-slate-500 hover:text-amber-400"}`}
                        >
                          <svg className="h-6 w-6" fill={job.isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="mt-1 font-medium text-emerald-400">{job.companyName}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {job.workMode}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {job.seniorityLevel}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-400 border border-emerald-500/20">
                        {job.employmentType}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-4 line-clamp-2 text-sm text-slate-400">
                  {job.description}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Posted {formatDate(job.postedAt)}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/jobs/${job.id}?data=${encodeURIComponent(JSON.stringify(job))}`}
                      className="rounded-lg border border-emerald-500/50 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition-all"
                    >
                      View Details
                    </Link>
                    <a
                      href={job.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all"
                    >
                      Apply
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 disabled:cursor-not-allowed disabled:opacity-50 hover:border-slate-600 hover:bg-slate-800 transition-colors"
              >
                Previous
              </button>
              <span className="px-4 text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 disabled:cursor-not-allowed disabled:opacity-50 hover:border-slate-600 hover:bg-slate-800 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
