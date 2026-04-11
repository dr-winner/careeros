"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { toast } from "sonner";

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
  salaryMin?: number;
  salaryMax?: number;
  isSaved: boolean;
  applicationUrl: string;
}

export default function JobDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const { userId } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [fitScore, setFitScore] = useState<number | null>(null);
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [cvAdvice, setCvAdvice] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);

  const jobId = useMemo(() => {
    if (!params?.id) return "";
    return Array.isArray(params.id) ? params.id[0] : params.id;
  }, [params]);

  const analyzeFit = useCallback(
    async (jobData: Job) => {
      if (!userId) return;
      setAnalyzing(true);
      try {
        const response = await fetch("/api/jobs/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: jobData.id,
            jobTitle: jobData.title,
            jobDescription: jobData.description,
          }),
        });
        const data = await response.json();
        if (data.analysis) {
          setFitScore(data.analysis.fitScore);
          setMatchedSkills(data.analysis.matchedSkills || []);
          setMissingSkills(data.analysis.missingSkills || []);
          setCvAdvice(data.analysis.cvAdvice || "");
          setHasResume(data.analysis.hasResume);
          setAiEnabled(data.analysis.aiEnabled);
        }
      } catch (error) {
        console.error("Error analyzing fit:", error);
      } finally {
        setAnalyzing(false);
      }
    },
    [userId],
  );

  const checkApplication = useCallback(
    async (targetJobId: string) => {
      if (!userId) return;
      try {
        const response = await fetch("/api/applications");
        const data = await response.json();
        const applied = data.applications?.some(
          (app: { jobId: string }) => app.jobId === targetJobId,
        );
        setHasApplied(applied);
      } catch (error) {
        console.error("Error checking application:", error);
      }
    },
    [userId],
  );

  const fetchJobFromAPI = useCallback(async () => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/jobs?jobId=${encodeURIComponent(jobId)}`,
      );
      const data = await response.json();
      if (data.job) {
        setJob(data.job);
        checkApplication(data.job.id);
        analyzeFit(data.job);
      }
    } catch (error) {
      console.error("Error fetching job:", error);
    } finally {
      setLoading(false);
    }
  }, [analyzeFit, checkApplication, jobId]);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    let cachedJob: Job | null = null;

    if (typeof window !== "undefined") {
      try {
        const existing = sessionStorage.getItem("dashboard-job-cache");
        const cache = existing ? JSON.parse(existing) : {};
        cachedJob = cache[jobId] ?? null;
      } catch (error) {
        console.error("Error reading cached job:", error);
      }
    }

    if (cachedJob) {
      setJob(cachedJob);
      setLoading(false);
      checkApplication(cachedJob.id);
      analyzeFit(cachedJob);
      return;
    }

    fetchJobFromAPI();
  }, [analyzeFit, checkApplication, fetchJobFromAPI, jobId]);
  const handleApply = async () => {
    if (!userId || !job) return;

    setApplying(true);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          companyName: job.companyName,
          location: job.location,
          workMode: job.workMode,
        }),
      });

      if (response.ok) {
        setHasApplied(true);
        toast.success("Application tracked! Good luck!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to track application");
      }
    } catch {
      toast.error("Failed to track application");
    } finally {
      setApplying(false);
    }
  };

  const toggleSave = async () => {
    if (!userId || !job) return;

    try {
      const response = await fetch("/api/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          title: job.title,
          companyName: job.companyName,
          location: job.location,
          country: job.country,
          workMode: job.workMode,
          applicationUrl: job.applicationUrl,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setJob({ ...job, isSaved: data.saved });
        toast.success(data.saved ? "Job saved!" : "Job removed from saved");
      }
    } catch (error) {
      console.error("Error saving job:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatSalary = (min?: number, max?: number, country?: string) => {
    if (!min && !max) return null;

    // Currency symbols by region
    const currencyMap: Record<string, string> = {
      ZA: "R", // South Africa
      AFRICA: "$", // General Africa (USD approximation)
      GH: "GH₵", // Ghana
      NG: "₦", // Nigeria
      KE: "KSh", // Kenya
      EU: "€", // Europe
      USA: "$", // USA
      UK: "£", // UK
      ASIA: "$", // Asia
      GLOBAL: "$", // Global
    };

    const currency = currencyMap[country || "GLOBAL"] || "$";
    const format = (n: number) =>
      currency + (n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toString());

    if (min && max) return `${format(min)} - ${format(max)}`;
    if (min) return `From ${format(min)}`;
    if (max) return `Up to ${format(max)}`;
    return null;
  };

  const getFitVerdict = (score: number) => {
    if (score >= 80) return "Strong Match";
    if (score >= 60) return "Good Fit";
    if (score >= 40) return "Partial Match";
    return "Reach Position";
  };

  const getFitStyle = (score: number) => {
    if (score >= 80) {
      return {
        badge: "bg-emerald-500/20 text-emerald-400",
        bar: "bg-emerald-500",
      };
    }
    if (score >= 60) {
      return {
        badge: "bg-amber-500/20 text-amber-400",
        bar: "bg-amber-500",
      };
    }
    return {
      badge: "bg-red-500/20 text-red-400",
      bar: "bg-red-500",
    };
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-slate-800"></div>
          <div className="h-6 w-1/4 rounded bg-slate-800"></div>
          <div className="h-32 w-full rounded bg-slate-800"></div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8 text-center">
        <h1 className="text-2xl font-bold text-white">Job Not Found</h1>
        <p className="mt-2 text-slate-400">
          This job may have expired, been removed, or its details were only
          available during your current browsing session.
        </p>
        <Link
          href="/jobs"
          className="mt-4 inline-block text-emerald-400 hover:text-emerald-300"
        >
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href="/jobs"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Jobs
      </Link>

      <div className="rounded-2xl glass-card p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{job.title}</h1>
            <p className="mt-2 text-xl text-slate-400">{job.companyName}</p>
            {job.salaryMin || job.salaryMax ? (
              <p className="mt-1 text-lg font-medium text-emerald-400">
                {formatSalary(job.salaryMin, job.salaryMax, job.country)}
              </p>
            ) : null}
          </div>
          {userId && (
            <button
              onClick={toggleSave}
              aria-label={
                job.isSaved
                  ? `Remove ${job.title} from saved jobs`
                  : `Save ${job.title}`
              }
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 ${
                job.isSaved
                  ? "border-amber-500/50 bg-amber-500/20 text-amber-400"
                  : "border-slate-700 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <svg
                className="h-5 w-5"
                fill={job.isSaved ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              {job.isSaved ? "Saved" : "Save Job"}
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2">
            <svg
              className="h-5 w-5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="font-medium text-white">{job.location}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2">
            <svg
              className="h-5 w-5 text-slate-400"
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
            <span className="font-medium text-white">{job.workMode}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2">
            <svg
              className="h-5 w-5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium text-white">{job.seniorityLevel}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2">
            <span className="font-medium text-white">{job.employmentType}</span>
          </div>
        </div>

        {analyzing && (
          <div className="mt-6 flex items-center gap-3 text-slate-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-500" />
            <span>Analyzing your CV against this job...</span>
          </div>
        )}

        {!userId && (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Sign in for personalized analysis</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Create an account to upload your CV and get AI-powered job fit analysis.
                </p>
                <Link
                  href="/sign-in"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        )}

        {userId && !hasResume && !analyzing && fitScore === null && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-400">Upload your CV for personalized analysis</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Get match scores, skill gaps, and AI-powered advice tailored to this job.
                </p>
                <Link
                  href="/resumes"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  Upload CV
                </Link>
              </div>
            </div>
          </div>
        )}

        {fitScore !== null && !analyzing && (
          <div className="mt-6 rounded-xl bg-slate-800 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Your Fit for This Role
              </h2>
              <div
                className={`rounded-full px-4 py-1 text-sm font-medium ${getFitStyle(fitScore).badge}`}
              >
                {fitScore}% Match
              </div>
            </div>
            <div
              className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-700"
              aria-label={`Role fit score: ${fitScore}%`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={fitScore}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${getFitStyle(fitScore).bar}`}
                style={{ width: `${fitScore}%` }}
              />
            </div>
            <p className="mt-4 text-lg font-medium text-white">
              {getFitVerdict(fitScore)}
            </p>

            {matchedSkills.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-300">
                  Your matching skills:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {matchedSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm text-emerald-400"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {missingSkills.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-300">
                  Skills to develop:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {missingSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-slate-700 px-3 py-1 text-sm text-slate-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-slate-700 pt-4">
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500">
                  {hasResume ? "CV-based analysis" : "Profile-based analysis"}
                </p>
                {aiEnabled && (
                  <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
                    AI-powered
                  </span>
                )}
              </div>
              <button
                onClick={() => job && analyzeFit(job)}
                className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-analyze
              </button>
            </div>
          </div>
        )}

        {cvAdvice && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
            <div className="flex items-start gap-3">
              <svg
                className="h-6 w-6 flex-shrink-0 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-amber-400">
                  AI CV Advice for This Role
                </h3>
                <p className="mt-2 text-slate-300 leading-relaxed">
                  {cvAdvice}
                </p>
                <Link
                  href="/resumes"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-400 hover:text-amber-300"
                >
                  Update your CV
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white">About This Role</h2>
          <p className="mt-4 leading-relaxed text-slate-300 whitespace-pre-wrap">
            {job.description}
          </p>
        </div>

        <div className="mt-8 border-t border-slate-700 pt-6">
          <p className="text-sm text-slate-500">
            Posted on {formatDate(job.postedAt)}
          </p>
        </div>

        <div className="mt-8 flex gap-4">
          {hasApplied ? (
            <Link
              href="/applications"
              className="flex-1 rounded-xl bg-emerald-500/20 py-4 text-center text-lg font-semibold text-emerald-400"
            >
              Application Tracked
            </Link>
          ) : (
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 py-4 text-center text-lg font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {applying ? "Tracking..." : "Track My Application"}
            </button>
          )}
          <a
            href={job.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Apply for ${job.title} on ${job.companyName} website`}
            className="flex-1 rounded-xl border-2 border-slate-700 py-4 text-center text-lg font-semibold text-white hover:bg-slate-800"
          >
            Apply on Company Site
          </a>
        </div>
      </div>
    </div>
  );
}
