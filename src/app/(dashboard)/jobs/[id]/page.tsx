"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  isSaved: boolean;
  applicationUrl: string;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    fetchJob();
    checkApplication();
  }, [params.id, userId]);

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/jobs?search=${params.id}`);
      const data = await response.json();
      if (data.jobs && data.jobs.length > 0) {
        setJob(data.jobs[0]);
      }
    } catch (error) {
      console.error("Error fetching job:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkApplication = async () => {
    if (!userId) return;
    try {
      const response = await fetch("/api/applications");
      const data = await response.json();
      const applied = data.applications?.some(
        (app: { jobId: string }) => app.jobId === params.id
      );
      setHasApplied(applied);
    } catch (error) {
      console.error("Error checking application:", error);
    }
  };

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
        }),
      });

      if (response.ok) {
        setHasApplied(true);
        toast.success("Application tracked! Good luck!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to track application");
      }
    } catch (error) {
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
        body: JSON.stringify({ jobId: job.id }),
      });

      if (response.ok) {
        setJob({ ...job, isSaved: !job.isSaved });
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

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-emerald-100"></div>
          <div className="h-6 w-1/4 rounded bg-emerald-100"></div>
          <div className="h-32 w-full rounded bg-emerald-100"></div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8 text-center">
        <h1 className="text-2xl font-bold text-emerald-950">Job Not Found</h1>
        <p className="mt-2 text-emerald-600">This job may have been removed.</p>
        <Link href="/jobs" className="mt-4 inline-block text-emerald-600 hover:text-emerald-800">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href="/jobs"
        className="mb-6 inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-800"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Jobs
      </Link>

      <div className="rounded-2xl border border-emerald-100 bg-white p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-emerald-950">{job.title}</h1>
            <p className="mt-2 text-xl text-emerald-700">{job.companyName}</p>
          </div>
          {userId && (
            <button
              onClick={toggleSave}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 ${
                job.isSaved
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <svg className="h-5 w-5" fill={job.isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {job.isSaved ? "Saved" : "Save Job"}
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium text-emerald-800">{job.location}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="font-medium text-emerald-800">{job.workMode}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-emerald-800">{job.seniorityLevel}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2">
            <span className="font-medium text-emerald-800">{job.employmentType}</span>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-emerald-950">About This Role</h2>
          <p className="mt-4 leading-relaxed text-emerald-700">{job.description}</p>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-emerald-950">Requirements</h2>
          <ul className="mt-4 space-y-2">
            {job.requirements.split(", ").map((req, index) => (
              <li key={index} className="flex items-start gap-2 text-emerald-700">
                <svg className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {req}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 border-t border-emerald-100 pt-6">
          <p className="text-sm text-emerald-500">
            Posted on {formatDate(job.postedAt)}
          </p>
        </div>

        <div className="mt-8 flex gap-4">
          {hasApplied ? (
            <Link
              href="/applications"
              className="flex-1 rounded-xl bg-emerald-100 py-4 text-center text-lg font-semibold text-emerald-800"
            >
              Application Tracked
            </Link>
          ) : (
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex-1 rounded-xl bg-emerald-800 py-4 text-center text-lg font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {applying ? "Tracking..." : "Track My Application"}
            </button>
          )}
          <a
            href={job.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-xl border-2 border-emerald-800 py-4 text-center text-lg font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            Apply on Company Site
          </a>
          {userId && (
            <button
              onClick={toggleSave}
              className={`rounded-xl border-2 px-6 py-4 font-semibold ${
                job.isSaved
                  ? "border-amber-400 bg-amber-50 text-amber-700"
                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              {job.isSaved ? "Saved" : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
