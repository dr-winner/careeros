"use client";

import { useState, useEffect, useCallback, type KeyboardEvent } from "react";
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
          const primary =
            data.resumes.find((r: Resume) => r.isPrimary) || data.resumes[0];
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
      const response = await fetch(`/api/user/resumes/${id}`, {
        method: "POST",
      });

      if (response.ok) {
        const updatedResumes = resumes.map((r) => ({
          ...r,
          isPrimary: r.id === id,
        }));
        setResumes(updatedResumes);
        setSelectedResume(updatedResumes.find((r) => r.id === id) || null);
        toast.success("Primary resume updated!");
      }
    } catch {
      toast.error("Failed to update primary resume");
    }
  };

  const deleteResume = async (id: string) => {
    if (!confirm("Delete this resume?")) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/user/resumes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const newResumes = resumes.filter((r) => r.id !== id);
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

    const suggestions: {
      category: string;
      issue: string;
      suggestion: string;
      priority: "high" | "medium" | "low";
    }[] = [];

    if (!resume.parsedText || resume.parsedText.length < 200) {
      suggestions.push({
        category: "Content",
        issue: "Limited resume content",
        suggestion: "Add more details about your experience and achievements.",
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
        suggestion: "Include all relevant positions.",
        priority: "medium",
      });
    }

    if (resume.education.length === 0) {
      suggestions.push({
        category: "Education",
        issue: "No education entries found",
        suggestion: "Add your educational background.",
        priority: "high",
      });
    }

    const hasActionVerbs =
      /^(Led|Managed|Developed|Created|Implemented|Increased|Reduced|Improved|Designed|Built|Analyzed)/.test(
        resume.parsedText || "",
      );
    if (!hasActionVerbs) {
      suggestions.push({
        category: "Writing",
        issue: "Consider using action verbs",
        suggestion: "Start bullets with strong action verbs.",
        priority: "low",
      });
    }

    if (!suggestions.length) {
      suggestions.push({
        category: "Overall",
        issue: "Looking good!",
        suggestion: "Your resume is well-structured.",
        priority: "low",
      });
    }

    return suggestions;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-500/30 text-red-400";
      case "medium":
        return "border-amber-500/30 text-amber-400";
      default:
        return "border-green-500/30 text-green-400";
    }
  };

  const suggestions = analyzeResume(selectedResume);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          <span className="mono text-sm text-zinc-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#14141f] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Resumes</h1>
              <p className="mono text-xs text-zinc-500">{resumes.length} uploaded</p>
            </div>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            {showUpload ? "Cancel" : "Upload CV"}
          </button>
        </div>
      </div>

      {showUpload && (
        <div className="rounded-2xl border border-white/10 bg-[#14141f] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-sm font-medium text-white">Upload CV</h2>
          </div>
          <CVUpload onUploadSuccess={handleUploadSuccess} />
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-[#14141f] p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-5 w-1/3 rounded bg-white/5" />
                <div className="h-4 w-1/4 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : resumes.length === 0 && !showUpload ? (
        <div className="rounded-2xl border border-white/10 bg-[#14141f] p-12 text-center">
          <div className="h-14 w-14 mx-auto rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
            <svg className="h-7 w-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white">No resumes</h3>
          <p className="mono text-xs text-zinc-500 mt-2">Upload your CV to get started.</p>
          <button
            onClick={() => setShowUpload(true)}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white mt-4 hover:opacity-90 transition-opacity"
          >
            Upload CV
          </button>
        </div>
      ) : resumes.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-medium">Your Resumes</span>
              <button
                onClick={() => setShowUpload(true)}
                className="mono text-xs text-purple-400 hover:text-purple-300"
              >
                + add
              </button>
            </div>
            {resumes.map((resume) => {
              const isSelected = selectedResume?.id === resume.id;

              const handleSelect = () => setSelectedResume(resume);

              const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleSelect();
                }
              };

              return (
                <div
                  key={resume.id}
                  className={`rounded-xl border p-4 transition-all ${isSelected ? "border-purple-500/50 bg-purple-500/5" : "border-white/10 bg-[#14141f] hover:border-white/20"}`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={handleSelect}
                      onKeyDown={handleKeyDown}
                      aria-pressed={isSelected}
                      className="flex flex-1 items-start gap-3 text-left focus:outline-none"
                    >
                      <div className="h-9 w-9 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">{resume.originalName}</span>
                          {resume.isPrimary && (
                            <span className="mono text-xs px-1.5 py-0.5 rounded border bg-purple-500/20 border-purple-500/30 text-purple-400">
                              primary
                            </span>
                          )}
                        </div>
                        <p className="mono text-xs text-zinc-500 mt-1">
                          {formatDate(resume.createdAt)} • {resume.skills.length} skills
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!resume.isPrimary && (
                        <button
                          onClick={() => setPrimary(resume.id)}
                          className="mono text-xs px-2 py-1 rounded border border-white/10 text-zinc-500 hover:border-purple-500/50 hover:text-purple-400 transition-colors"
                        >
                          set
                        </button>
                      )}
                      <button
                        onClick={() => deleteResume(resume.id)}
                        disabled={deleting === resume.id}
                        className="mono text-xs px-2 py-1 rounded border border-white/10 text-zinc-500 hover:border-red-500/50 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {deleting === resume.id ? "..." : "rm"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedResume && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#14141f] p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-zinc-500 font-medium">Optimization Tips</span>
                  <span className="mono text-xs text-zinc-600 truncate max-w-[150px]">{selectedResume.originalName}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg bg-purple-500/10 p-3 text-center">
                    <p className="text-xl font-bold text-purple-400">{selectedResume.skills.length}</p>
                     <p className="text-xs text-zinc-500">Skills</p>
                  </div>
                  <div className="rounded-lg bg-cyan-500/10 p-3 text-center">
                    <p className="text-xl font-bold text-cyan-400">{selectedResume.experiences.length}</p>
                     <p className="text-xs text-zinc-500">Experience</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                    <p className="text-xl font-bold text-amber-400">{selectedResume.education.length}</p>
                     <p className="text-xs text-zinc-500">Education</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {suggestions.map((item, index) => (
                    <div key={index} className={`rounded-lg border p-3 ${getPriorityColor(item.priority)}`}>
                      <div className="flex items-start gap-2">
                        <span className={`mono text-xs ${item.priority === "high" ? "text-red-400" : item.priority === "medium" ? "text-amber-400" : "text-green-400"}`}>
                          [{item.priority}]
                        </span>
                        <div>
                          <p className="text-sm font-medium text-white">{item.issue}</p>
                          <p className="mono text-xs text-zinc-500 mt-1">{item.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#14141f] p-5">
                  <span className="text-xs text-zinc-500 font-medium">Best Practices</span>
                <ul className="mt-3 space-y-2">
                  {[
                    "Keep it to 1-2 pages",
                    "Use keywords from job postings",
                    "Quantify achievements with numbers",
                    "Proofread for errors",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                      <span className="text-green-400">✓</span>
                      <span className="mono text-xs">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
