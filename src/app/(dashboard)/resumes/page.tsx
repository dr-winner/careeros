"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { toast } from "sonner";

interface Resume {
  id: string;
  originalName: string;
  versionLabel: string | null;
  isPrimary: boolean;
  createdAt: string;
  skills: { skillName: string }[];
  experiences: { title: string; company: string | null }[];
  education: { institution: string; degree: string | null }[];
}

export default function ResumesPage() {
  const { userId, isLoaded } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchResumes();
    }
  }, [userId]);

  const fetchResumes = async () => {
    try {
      const response = await fetch("/api/user/resumes");
      if (response.ok) {
        const data = await response.json();
        setResumes(data.resumes || []);
      }
    } catch (error) {
      console.error("Error fetching resumes:", error);
    } finally {
      setLoading(false);
    }
  };

  const setPrimary = async (id: string) => {
    try {
      const response = await fetch(`/api/user/resumes/${id}/primary`, {
        method: "POST",
      });

      if (response.ok) {
        setResumes(resumes.map(r => ({
          ...r,
          isPrimary: r.id === id,
        })));
        toast.success("Primary resume updated!");
      }
    } catch {
      toast.error("Failed to update primary resume");
    }
  };

  const deleteResume = async (id: string) => {
    if (!confirm("Delete this resume? This cannot be undone.")) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/user/resumes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setResumes(resumes.filter(r => r.id !== id));
        toast.success("Resume deleted");
      }
    } catch {
      toast.error("Failed to delete resume");
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Resumes</h1>
          <p className="mt-2 text-slate-400">
            Manage your CV versions and track applications.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Upload New CV
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl glass-card p-6">
              <div className="h-6 w-1/3 rounded bg-slate-700"></div>
            </div>
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <div className="rounded-xl glass-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">No Resumes Yet</h3>
          <p className="mt-2 text-slate-400">
            Upload your CV to get started with job applications.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-emerald-400 hover:text-emerald-300"
          >
            Upload your first CV →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className={`rounded-xl glass-card p-6 transition ${
                resume.isPrimary
                  ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
                    <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {resume.originalName}
                      </h3>
                      {resume.isPrimary && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                          Primary
                        </span>
                      )}
                      {resume.versionLabel && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                          {resume.versionLabel}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      Uploaded {formatDate(resume.createdAt)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {resume.skills.slice(0, 5).map((skill) => (
                        <span
                          key={skill.skillName}
                          className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300"
                        >
                          {skill.skillName}
                        </span>
                      ))}
                      {resume.skills.length > 5 && (
                        <span className="text-xs text-slate-500">
                          +{resume.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!resume.isPrimary && (
                    <button
                      onClick={() => setPrimary(resume.id)}
                      className="rounded-lg border border-emerald-500/50 px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    onClick={() => deleteResume(resume.id)}
                    disabled={deleting === resume.id}
                    className="rounded-lg border border-red-500/50 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deleting === resume.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>

              {(resume.experiences.length > 0 || resume.education.length > 0) && (
                <div className="mt-4 border-t border-slate-700 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {resume.experiences.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Experience</p>
                        <div className="mt-1 space-y-1">
                          {resume.experiences.slice(0, 2).map((exp, i) => (
                            <p key={i} className="text-sm text-slate-300">
                              {exp.title}
                              {exp.company && (
                                <span className="text-slate-500"> at {exp.company}</span>
                              )}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {resume.education.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Education</p>
                        <div className="mt-1 space-y-1">
                          {resume.education.slice(0, 2).map((edu, i) => (
                            <p key={i} className="text-sm text-slate-300">
                              {edu.degree || edu.institution}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl glass-card p-6">
        <h3 className="font-semibold text-white">Tips for Multiple Resumes</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">•</span>
            Keep different versions for different job types (e.g., technical vs. management)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">•</span>
            Set your most versatile CV as the primary
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">•</span>
            Use cover letters to highlight role-specific achievements
          </li>
        </ul>
      </div>
    </div>
  );
}
