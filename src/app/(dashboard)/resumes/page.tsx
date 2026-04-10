"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import CVUpload from "@/app/components/cv-upload";

interface Resume {
  id: string;
  originalName: string;
  versionLabel: string | null;
  isPrimary: boolean;
  createdAt: string;
  skills: { skillName: string }[];
  experiences: { title: string; company: string | null }[];
  education: { institution: string; degree: string | null }[];
  parsedText: string | null;
}

export default function ResumesPage() {
  const { userId, isLoaded } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);

  const fetchResumes = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await fetch("/api/user/resumes");
      if (response.ok) {
        const data = await response.json();
        setResumes(data.resumes || []);
        if (data.resumes?.length > 0) {
          const primary = data.resumes.find((r: Resume) => r.isPrimary) || data.resumes[0];
          setSelectedResume(primary);
        } else {
          setSelectedResume(null);
        }
      }
    } catch (error) {
      console.error("Error fetching resumes:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleUploadSuccess = useCallback(() => {
    setShowUpload(false);
    fetchResumes();
  }, [fetchResumes]);

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
        setSelectedResume(resumes.find(r => r.id === id) || null);
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
        const newResumes = resumes.filter(r => r.id !== id);
        setResumes(newResumes);
        if (selectedResume?.id === id) {
          setSelectedResume(newResumes[0] || null);
        }
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

  const analyzeResume = (resume: Resume | null) => {
    if (!resume) return [];

    const suggestions: { category: string; issue: string; suggestion: string; priority: "high" | "medium" | "low" }[] = [];

    if (!resume.parsedText || resume.parsedText.length < 200) {
      suggestions.push({
        category: "Content",
        issue: "Limited resume content detected",
        suggestion: "Add more details about your work experience, achievements, and responsibilities.",
        priority: "high",
      });
    }

    if (resume.skills.length < 5) {
      suggestions.push({
        category: "Skills",
        issue: "Fewer than 5 skills listed",
        suggestion: "Add more relevant technical and soft skills.",
        priority: "high",
      });
    }

    if (resume.experiences.length < 2) {
      suggestions.push({
        category: "Experience",
        issue: "Limited work experience entries",
        suggestion: "Include all relevant positions, even internships or part-time roles.",
        priority: "medium",
      });
    }

    if (resume.education.length === 0) {
      suggestions.push({
        category: "Education",
        issue: "No education entries found",
        suggestion: "Add your educational background including degrees and certifications.",
        priority: "high",
      });
    }

    const hasActionVerbs = /^(Led|Managed|Developed|Created|Implemented|Increased|Reduced|Improved|Designed|Built|Analyzed)/.test(resume.parsedText || "");
    if (!hasActionVerbs) {
      suggestions.push({
        category: "Writing",
        issue: "Consider using action verbs",
        suggestion: "Start bullet points with strong action verbs like 'Led', 'Developed', 'Increased'.",
        priority: "low",
      });
    }

    if (!suggestions.length) {
      suggestions.push({
        category: "Overall",
        issue: "Looking good!",
        suggestion: "Your resume appears well-structured. Consider tailoring it for specific job applications.",
        priority: "low",
      });
    }

    return suggestions;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "border-red-500/30 bg-red-500/10";
      case "medium": return "border-amber-500/30 bg-amber-500/10";
      default: return "border-emerald-500/30 bg-emerald-500/10";
    }
  };

  const suggestions = analyzeResume(selectedResume);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-emerald-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Resumes</h1>
          <p className="mt-2 text-slate-400">
            Upload, manage, and optimize your CVs for job applications.
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {showUpload ? "Cancel" : "Upload CV"}
        </button>
      </div>

      {showUpload && (
        <div className="mb-8 rounded-xl glass-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Upload Your CV</h2>
          <CVUpload onUploadSuccess={handleUploadSuccess} />
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-xl glass-card p-6">
              <div className="h-6 w-1/3 rounded bg-slate-700"></div>
            </div>
          ))}
        </div>
      ) : resumes.length === 0 && !showUpload ? (
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
          <button
            onClick={() => setShowUpload(true)}
            className="mt-4 inline-block rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-white hover:opacity-90"
          >
            Upload your first CV
          </button>
        </div>
      ) : resumes.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your Resumes ({resumes.length})</h2>
              <button
                onClick={() => setShowUpload(true)}
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                + Add another
              </button>
            </div>
            {resumes.map((resume) => (
              <div
                key={resume.id}
                onClick={() => setSelectedResume(resume)}
                className={`rounded-xl glass-card p-5 cursor-pointer transition ${
                  selectedResume?.id === resume.id
                    ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                    : "hover:border-slate-600"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                      <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{resume.originalName}</h3>
                        {resume.isPrimary && (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Uploaded {formatDate(resume.createdAt)} • {resume.skills.length} skills
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!resume.isPrimary && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPrimary(resume.id); }}
                        className="rounded-lg border border-emerald-500/50 px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteResume(resume.id); }}
                      disabled={deleting === resume.id}
                      className="rounded-lg border border-red-500/50 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {deleting === resume.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedResume && (
            <div className="space-y-4">
              <div className="rounded-xl glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Optimization Tips</h2>
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
                    {selectedResume.originalName}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                    <p className="text-xl font-bold text-emerald-400">{selectedResume.skills.length}</p>
                    <p className="text-xs text-slate-400">Skills</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                    <p className="text-xl font-bold text-amber-400">{selectedResume.experiences.length}</p>
                    <p className="text-xs text-slate-400">Experiences</p>
                  </div>
                  <div className="rounded-lg bg-purple-500/10 p-3 text-center">
                    <p className="text-xl font-bold text-purple-400">{selectedResume.education.length}</p>
                    <p className="text-xs text-slate-400">Education</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {suggestions.map((item, index) => (
                    <div
                      key={index}
                      className={`rounded-lg border p-4 ${getPriorityColor(item.priority)}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.priority === "high" ? "bg-red-500/20 text-red-300" :
                          item.priority === "medium" ? "bg-amber-500/20 text-amber-300" :
                          "bg-emerald-500/20 text-emerald-300"
                        }`}>
                          {item.priority}
                        </span>
                        <div>
                          <p className="font-medium text-white">{item.issue}</p>
                          <p className="mt-1 text-sm text-slate-400">{item.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl glass-card p-6">
                <h3 className="mb-3 font-medium text-white">Best Practices</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    Keep it to 1-2 pages
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    Use keywords from job postings
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    Quantify achievements with numbers
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    Proofread for errors
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
