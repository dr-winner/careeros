"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

function stripHtml(html: string): string {
  return html
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

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

const COUNTRY_OPTIONS = [
  { value: "",       label: "All Countries" },
  { value: "GH",    label: "Ghana" },
  { value: "NG",    label: "Nigeria" },
  { value: "KE",    label: "Kenya" },
  { value: "ZA",    label: "South Africa" },
  { value: "REMOTE",label: "Remote / Global" },
  { value: "GB",    label: "United Kingdom" },
  { value: "US",    label: "United States" },
  { value: "CA",    label: "Canada" },
  { value: "AU",    label: "Australia" },
  { value: "IN",    label: "India" },
];

const WORK_MODE_OPTIONS = [
  { value: "",           label: "Any Mode" },
  { value: "Remote",     label: "Remote" },
  { value: "Full-time",  label: "Full-time" },
  { value: "Hybrid",     label: "Hybrid" },
  { value: "Contract",   label: "Contract" },
  { value: "On-site",    label: "On-site" },
];

const SENIORITY_OPTIONS = [
  { value: "",            label: "Any Level" },
  { value: "Entry-Level", label: "Entry-Level" },
  { value: "Mid-Level",   label: "Mid-Level" },
  { value: "Senior",      label: "Senior" },
];

const EMPLOYMENT_OPTIONS = [
  { value: "",           label: "Any Type" },
  { value: "full-time",  label: "Full-time" },
  { value: "part-time",  label: "Part-time" },
  { value: "contract",   label: "Contract" },
  { value: "internship", label: "Internship" },
];

const DATE_OPTIONS = [
  { value: "",      label: "Any time" },
  { value: "today", label: "Today" },
  { value: "week",  label: "Past week" },
  { value: "month", label: "Past month" },
];

function FilterSelect({
  value,
  onChange,
  options,
  active,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  active: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 pl-3 pr-7 rounded-lg text-xs border appearance-none cursor-pointer focus:outline-none transition-all ${
        active
          ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
          : "bg-white/[0.04] border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
      }`}
      style={{ backgroundImage: "none" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#14141f] text-zinc-200">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function JobsPage() {
  const { userId, isLoaded } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [seniority, setSeniority] = useState("");
  const [country, setCountry] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [datePosted, setDatePosted] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalJobs, setTotalJobs] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const persistJobs = useCallback((jobList: Job[]) => {
    if (typeof window === "undefined" || jobList.length === 0) return;
    try {
      const existing = sessionStorage.getItem("dashboard-job-cache");
      const cache = existing ? JSON.parse(existing) : {};
      for (const job of jobList) {
        cache[job.id] = job;
      }
      sessionStorage.setItem("dashboard-job-cache", JSON.stringify(cache));
    } catch {
      // ignore
    }
  }, []);

  const fetchJobs = useCallback(
    async (isNewSearch = true, overrides?: Partial<{
      search: string; location: string; workMode: string; seniority: string;
      country: string; employmentType: string; datePosted: string; cursor: string | null;
    }>) => {
      if (isNewSearch) setLoading(true);
      else setLoadingMore(true);

      const s = overrides?.search ?? search;
      const l = overrides?.location ?? location;
      const wm = overrides?.workMode ?? workMode;
      const sr = overrides?.seniority ?? seniority;
      const ct = overrides?.country ?? country;
      const et = overrides?.employmentType ?? employmentType;
      const dp = overrides?.datePosted ?? datePosted;
      const cur = isNewSearch ? null : (overrides?.cursor ?? cursor);

      try {
        const params = new URLSearchParams();
        params.set("useCursor", "true");
        params.set("pageSize", "20");
        if (s)   params.set("search", s);
        if (l)   params.set("location", l);
        if (wm)  params.set("workMode", wm);
        if (sr)  params.set("seniority", sr);
        if (ct)  params.set("country", ct);
        if (et)  params.set("employmentType", et);
        if (dp)  params.set("datePosted", dp);
        if (cur) params.set("cursor", cur);

        const response = await fetch(`/api/jobs?${params}`);
        const data = await response.json();
        const nextJobs: Job[] = data.jobs || [];

        if (isNewSearch) {
          setJobs(nextJobs);
          persistJobs(nextJobs);
        } else {
          setJobs((prev) => {
            const merged = [...prev, ...nextJobs];
            persistJobs(merged);
            return merged;
          });
        }

        setCursor(data.pagination?.cursor || null);
        setHasMore(data.pagination?.hasMore || false);
        setTotalJobs(data.pagination?.total || nextJobs.length);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, location, workMode, seniority, country, employmentType, datePosted, cursor, persistJobs],
  );

  useEffect(() => {
    if (userId) fetchJobs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSearch = () => {
    setCursor(null);
    fetchJobs(true);
  };

  const handleFilterChange = <K extends string>(
    setter: (v: K) => void,
    value: K,
  ) => {
    setter(value);
    setCursor(null);
    // Apply filter immediately
    setTimeout(() => fetchJobs(true), 0);
  };

  const clearAllFilters = () => {
    setSearch("");
    setLocation("");
    setWorkMode("");
    setSeniority("");
    setCountry("");
    setEmploymentType("");
    setDatePosted("");
    setCursor(null);
    fetchJobs(true, {
      search: "", location: "", workMode: "", seniority: "",
      country: "", employmentType: "", datePosted: "", cursor: null,
    });
  };

  const toggleSave = async (jobId: string) => {
    if (!userId) return;
    try {
      const job = jobs.find((j) => j.id === jobId);
      const response = await fetch("/api/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          job
            ? {
                jobId: job.id,
                title: job.title,
                companyName: job.companyName,
                location: job.location,
                country: job.country,
                workMode: job.workMode,
                description: job.description || null,
                applicationUrl: job.applicationUrl,
              }
            : { jobId },
        ),
      });
      if (response.ok) {
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, isSaved: !j.isSaved } : j)),
        );
      }
    } catch {
      // ignore
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

  const activeFilterCount = [workMode, seniority, country, employmentType, datePosted, location].filter(Boolean).length;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Job Search</h1>
          <p className="text-xs text-zinc-500">Live opportunities across Africa & globally</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="agent-card p-2 mb-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Job title, skill, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full bg-transparent pl-11 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Search
          </button>
        </div>
      </div>

      {/* Filter bar — always visible */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FilterSelect
          value={country}
          onChange={(v) => handleFilterChange(setCountry, v)}
          options={COUNTRY_OPTIONS}
          active={!!country}
        />
        <FilterSelect
          value={workMode}
          onChange={(v) => handleFilterChange(setWorkMode, v)}
          options={WORK_MODE_OPTIONS}
          active={!!workMode}
        />
        <FilterSelect
          value={seniority}
          onChange={(v) => handleFilterChange(setSeniority, v)}
          options={SENIORITY_OPTIONS}
          active={!!seniority}
        />
        <FilterSelect
          value={employmentType}
          onChange={(v) => handleFilterChange(setEmploymentType, v)}
          options={EMPLOYMENT_OPTIONS}
          active={!!employmentType}
        />
        <FilterSelect
          value={datePosted}
          onChange={(v) => handleFilterChange(setDatePosted, v)}
          options={DATE_OPTIONS}
          active={!!datePosted}
        />

        {/* Location text input */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          <input
            type="text"
            placeholder="City or region..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className={`h-9 pl-8 pr-3 rounded-lg text-xs border focus:outline-none transition-all w-36 ${
              location
                ? "bg-purple-500/15 border-purple-500/40 text-purple-300 placeholder:text-purple-400/50"
                : "bg-white/[0.04] border-white/10 text-zinc-400 placeholder:text-zinc-600 hover:border-white/20"
            }`}
          />
        </div>

        {/* Clear */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="h-9 px-3 rounded-lg text-xs text-zinc-500 hover:text-white border border-white/8 hover:border-white/20 transition-all flex items-center gap-1.5"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="agent-card p-5 animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="space-y-2">
                  <div className="h-4 w-52 rounded bg-white/5" />
                  <div className="h-3 w-32 rounded bg-white/5" />
                </div>
                <div className="h-4 w-12 rounded bg-white/5" />
              </div>
              <div className="flex gap-2 mb-3">
                <div className="h-3 w-28 rounded bg-white/5" />
                <div className="h-5 w-16 rounded bg-white/5" />
              </div>
              <div className="h-3 w-full rounded bg-white/5 mb-1.5" />
              <div className="h-3 w-3/4 rounded bg-white/5" />
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
          <p className="text-zinc-400 mb-4">No jobs match your filters</p>
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="text-sm text-purple-400 hover:text-purple-300">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-zinc-500">
              <span className="text-white font-medium">{totalJobs.toLocaleString()}</span> result{totalJobs !== 1 ? "s" : ""}
              {activeFilterCount > 0 && <span className="text-purple-400"> · {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active</span>}
            </p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-zinc-500">Live</span>
            </div>
          </div>

          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="agent-card p-5 glass-card-hover">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-sm font-semibold text-white">{job.title}</h3>
                      {userId && (
                        <button
                          onClick={() => toggleSave(job.id)}
                          title={job.isSaved ? "Unsave" : "Save job"}
                          className={`p-1 rounded-md transition-all flex-shrink-0 ${
                            job.isSaved
                              ? "text-amber-400"
                              : "text-zinc-600 hover:text-amber-400"
                          }`}
                        >
                          <svg className="h-4 w-4" fill={job.isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-purple-400 mt-0.5 font-medium">{job.companyName}</p>

                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                        <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {job.location}
                      </span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                        job.workMode === "Remote"
                          ? "bg-green-500/15 text-green-400"
                          : job.workMode === "Hybrid"
                            ? "bg-cyan-500/15 text-cyan-400"
                            : "bg-purple-500/15 text-purple-400"
                      }`}>
                        {job.workMode}
                      </span>
                      <span className="text-[11px] text-zinc-600">{job.seniorityLevel}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <span className="text-[11px] text-zinc-600">{formatDate(job.postedAt)}</span>
                  </div>
                </div>

                {job.description && (
                  <p className="mt-3 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                    {stripHtml(job.description)}
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/jobs/${job.id}`}
                    onClick={() => persistJobs([job])}
                    className="flex-1 text-center py-2 rounded-lg border border-purple-500/25 text-purple-400 hover:bg-purple-500/10 transition-all text-xs font-medium"
                  >
                    View Details
                  </Link>
                  <a
                    href={job.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-medium hover:opacity-90 transition-opacity"
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
                className="px-8 py-2.5 rounded-lg border border-white/10 text-sm text-zinc-400 hover:bg-white/5 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    Load more
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
