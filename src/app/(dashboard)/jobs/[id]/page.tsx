"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { toast } from "sonner";
import PaywallModal from "@/components/paywall-modal";

function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [cvOptimization, setCvOptimization] = useState<{
    content: string[];
    format: string[];
    atsTips: string[];
    keywordsToAdd: string[];
    phrasesToUse: string[];
  } | null>(null);
  const [aiNarrative, setAiNarrative] = useState<{
    strengths: string;
    gaps: string;
    recommendation: string;
  } | null>(null);

  const jobId = useMemo(() => {
    if (!params?.id) return "";
    return Array.isArray(params.id) ? params.id[0] : params.id;
  }, [params]);

  useEffect(() => {
    fetch("/api/user/premium")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.isPremium !== undefined) setIsPremium(d.isPremium); })
      .catch(() => {});
  }, []);

  const handleOptimizeClick = () => {
    if (isPremium) {
      setShowOptimizeModal(true);
    } else {
      setShowPaywall(true);
    }
  };

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
          setProfileIncomplete(data.analysis.profileIncomplete || false);
          setAiEnabled(data.analysis.aiEnabled);
          setCvOptimization(data.analysis.cvOptimization || null);
          setAiNarrative(data.analysis.aiNarrative || null);
          if (data.analysis.isPremium !== undefined) setIsPremium(data.analysis.isPremium);
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
          description: job.description || null,
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
      month: "short",
      day: "numeric",
    });
  };

  const formatSalary = (min?: number, max?: number, country?: string) => {
    if (!min && !max) return null;

    const currencyMap: Record<string, string> = {
      ZA: "R",
      AFRICA: "$",
      GH: "GH₵",
      NG: "₦",
      KE: "KSh",
      EU: "€",
      USA: "$",
      UK: "£",
      ASIA: "$",
      GLOBAL: "$",
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

  const getFitColor = (score: number) => {
    if (score >= 80) return { bg: "bg-purple-500/20", text: "text-purple-400", bar: "bg-gradient-to-r from-purple-500 to-cyan-500" };
    if (score >= 60) return { bg: "bg-amber-500/20", text: "text-amber-400", bar: "bg-gradient-to-r from-amber-500 to-orange-500" };
    return { bg: "bg-red-500/20", text: "text-red-400", bar: "bg-gradient-to-r from-red-500 to-rose-500" };
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="agent-card p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 rounded bg-zinc-800" />
            <div className="h-6 w-1/4 rounded bg-zinc-800" />
            <div className="h-32 w-full rounded bg-zinc-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="agent-card p-8 text-center">
          <div className="h-16 w-16 mx-auto rounded-xl bg-red-500/20 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Job Not Found</h1>
          <p className="mono text-sm text-zinc-500 mb-6">
            This job may have expired or been removed.
          </p>
          <Link href="/jobs" className="agent-button inline-flex">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  const fitColor = fitScore !== null ? getFitColor(fitScore) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 mono text-sm text-zinc-500 hover:text-purple-400 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Jobs
      </Link>

      <div className="agent-card p-6 animate-fade-up">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">{job.title}</h1>
            <p className="mono text-sm text-zinc-400 mt-1">{job.companyName}</p>
            {job.salaryMin || job.salaryMax ? (
              <p className="gradient-text mt-1 font-medium">
                {formatSalary(job.salaryMin, job.salaryMax, job.country)}
              </p>
            ) : null}
          </div>
          {userId && (
            <button
              onClick={toggleSave}
              className={`agent-button flex-shrink-0 ${job.isSaved ? "border-cyan-500/50 text-cyan-400" : ""}`}
            >
              <svg className="h-4 w-4" fill={job.isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {job.isSaved ? "Saved" : "Save"}
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z", label: job.location },
            { icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", label: job.workMode },
            { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: job.seniorityLevel },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <svg className="h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              <span className="mono text-xs text-zinc-400">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 mono text-xs text-zinc-600">
          {formatDate(job.postedAt)} · {job.employmentType}
        </div>
      </div>

      {analyzing && (
        <div className="agent-card p-6 animate-fade-up">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
            </div>
            <div>
              <div className="text-sm text-white">Analyzing your CV</div>
              <div className="mono text-xs text-zinc-500">Computing match score...</div>
            </div>
          </div>
        </div>
      )}

      {!userId && (
        <div className="agent-card p-6 animate-fade-up">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-white">Sign in for personalized analysis</h3>
              <p className="mono text-xs text-zinc-500 mt-1">Upload your CV and get AI-powered job fit analysis.</p>
              <Link href="/sign-in" className="agent-button mt-3 inline-flex">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      )}

      {userId && !hasResume && !analyzing && fitScore === null && (
        <div className="agent-card p-6 animate-fade-up border-amber-500/20">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-400">Upload your CV</h3>
              <p className="mono text-xs text-zinc-500 mt-1">Get match scores, skill gaps, and AI advice.</p>
              <Link href="/resumes" className="agent-button mt-3 inline-flex">
                Upload CV
              </Link>
            </div>
          </div>
        </div>
      )}

      {profileIncomplete && fitScore !== null && !analyzing && (
        <div className="agent-card p-4 animate-fade-up border-amber-500/20 flex items-start gap-3">
          <svg className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-300">
            Your profile is empty — fit score is based on job keywords only.{" "}
            <a href="/profile" className="underline hover:text-amber-200">Complete your profile</a> or{" "}
            <a href="/resumes" className="underline hover:text-amber-200">upload your CV</a> for accurate results.
          </p>
        </div>
      )}

      {fitScore !== null && !analyzing && (
        <div className="agent-card p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Fit Score</span>
                <div className="text-lg font-bold text-white">{getFitVerdict(fitScore)}</div>
              </div>
            </div>
            <div className={`px-3 py-1.5 rounded-lg ${fitColor?.bg}`}>
              <span className={`mono text-lg font-bold ${fitColor?.text}`}>{fitScore}%</span>
            </div>
          </div>

          <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden">
            <div className={`h-full rounded-full ${fitColor?.bar} transition-all duration-500`} style={{ width: `${fitScore}%` }} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {matchedSkills.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 mb-2 font-medium">Matched Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {matchedSkills.map((skill, i) => (
                    <span key={i} className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {missingSkills.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 mb-2 font-medium">Skills to Add</div>
                <div className="flex flex-wrap gap-1.5">
                  {missingSkills.map((skill, i) => (
                    <span key={i} className="px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">
                {hasResume ? "CV Analysis" : "Profile Analysis"}
              </span>
              {aiEnabled && (
                <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  AI
                </span>
              )}
            </div>
            <button
              onClick={() => job && analyzeFit(job)}
              className="mono text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-analyze
            </button>
          </div>
        </div>
      )}

      {aiNarrative && (
        <div className="agent-card p-5 animate-fade-up border-cyan-500/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-cyan-400">AI Analysis</span>
            <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">Agent</span>
          </div>
          <div className="space-y-2 mono text-xs text-zinc-300">
            <p><span className="text-green-400">Strengths: </span>{aiNarrative.strengths}</p>
            <p><span className="text-amber-400">Gaps: </span>{aiNarrative.gaps}</p>
            <p><span className="text-purple-400">Verdict: </span>{aiNarrative.recommendation}</p>
          </div>
        </div>
      )}

      {cvAdvice && (
        <div className="agent-card p-6 animate-fade-up border-amber-500/20">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-amber-400">CV Advice</h3>
                {!isPremium && (
                  <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    Premium
                  </span>
                )}
              </div>
              <p className="mono text-xs text-zinc-400 mt-2 leading-relaxed">{cvAdvice}</p>
              <button
                onClick={handleOptimizeClick}
                className="agent-button mt-3 inline-flex"
              >
                {isPremium ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
                {isPremium ? "Optimize CV" : "Unlock Optimization"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="agent-card p-6 animate-fade-up">
        <p className="section-label">Job Description</p>
        <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
          {stripHtml(job.description)}
        </div>
      </div>

      <div className="agent-card p-6 animate-fade-up">
        <div className="flex gap-3">
          {hasApplied ? (
            <Link href="/applications" className="flex-1 agent-button text-center justify-center">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Application Tracked
            </Link>
          ) : (
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex-1 agent-button-primary text-center justify-center"
            >
              {applying ? "Tracking..." : "Track Application"}
            </button>
          )}
          <a
            href={job.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 agent-button text-center justify-center"
          >
            Apply on Company Site
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="cv_optimization"
        title="CV Optimization"
      />

      {showOptimizeModal && cvOptimization && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 animate-fade-up">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] overflow-hidden">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
              <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">CV Optimization</h2>
                  <p className="mono text-xs text-zinc-500 mt-0.5">tailored for {job?.title}</p>
                </div>
                <button
                  onClick={() => setShowOptimizeModal(false)}
                  className="rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-5 space-y-5">
                {cvOptimization.content.length > 0 && (
                  <div>
                    <p className="section-label text-purple-400/70">Content Changes</p>
                    <ul className="space-y-2">
                      {cvOptimization.content.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                          <span className="text-purple-400 mt-0.5 flex-shrink-0">→</span>
                          <span className="mono text-xs text-zinc-400 leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {cvOptimization.keywordsToAdd.length > 0 && (
                  <div>
                    <p className="section-label text-cyan-400/70">Keywords to Add</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cvOptimization.keywordsToAdd.map((keyword, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 mono">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {cvOptimization.phrasesToUse.length > 0 && (
                  <div>
                    <p className="section-label text-amber-400/70">Power Phrases</p>
                    <div className="space-y-2">
                      {cvOptimization.phrasesToUse.map((phrase, i) => (
                        <div key={i} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                          <span className="mono text-xs text-amber-300">&ldquo;{phrase}&rdquo;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cvOptimization.format.length > 0 && (
                  <div>
                    <p className="section-label text-green-400/70">Format Tips</p>
                    <ul className="space-y-2">
                      {cvOptimization.format.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                          <span className="text-green-400 mt-0.5 flex-shrink-0">→</span>
                          <span className="mono text-xs text-zinc-400 leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {cvOptimization.atsTips.length > 0 && (
                  <div>
                    <p className="section-label text-red-400/70">ATS Optimisation</p>
                    <ul className="space-y-2">
                      {cvOptimization.atsTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                          <span className="text-red-400 mt-0.5 flex-shrink-0">!</span>
                          <span className="mono text-xs text-zinc-400 leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-white/[0.06] flex gap-3">
                <Link
                  href="/resumes"
                  onClick={() => setShowOptimizeModal(false)}
                  className="flex-1 agent-button-primary text-center justify-center press-scale"
                >
                  Update My CV
                </Link>
                <button
                  onClick={() => { setShowOptimizeModal(false); analyzeFit(job!); }}
                  className="flex-1 agent-button text-center justify-center press-scale"
                >
                  Re-analyze
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
