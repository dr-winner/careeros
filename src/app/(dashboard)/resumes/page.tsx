"use client";

import { useState, useEffect, useCallback, type KeyboardEvent } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CVUpload from "@/app/components/cv-upload";
import { PDFDownloadLink } from "@react-pdf/renderer";
import CVPDF from "@/components/cv-pdf";
import CVAnalysisScreen from "@/components/cv-analysis-screen";
import type { StructuredCV } from "@/app/api/cv-regenerate/route";

const JOB_ROLES = [
  { id: "frontend", label: "Frontend Development", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { id: "backend", label: "Backend Development", icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" },
  { id: "fullstack", label: "Full Stack Development", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
  { id: "ai-ml", label: "AI / ML Engineer", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
  { id: "devops", label: "DevOps / SRE", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
  { id: "product", label: "Product Management", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { id: "marketing", label: "Marketing / Digital Marketing", icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" },
  { id: "data", label: "Data Science / Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { id: "mobile", label: "Mobile Development", icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { id: "custom", label: "Custom / Other", icon: "M12 6v6m0 0v6m0-6h6m-6 0H6" },
];

interface CV {
  id: string;
  originalName: string;
  versionLabel: string | null;
  isPrimary: boolean;
  createdAt: string;
  skills: { skillName: string }[];
  experiences: { title: string; company: string | null }[];
  education: { institution: string; degree: string | null }[];
  parsedText: string | null;
  role?: string | null;
}

export default function CVsPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [cvs, setCVs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratedCV, setRegeneratedCV] = useState<StructuredCV | null>(null);
  const [showRegenerated, setShowRegenerated] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [tailoringForJob, setTailoringForJob] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisCvId, setAnalysisCvId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/premium")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.isPremium !== undefined) setIsPremium(d.isPremium); })
      .catch(() => {});
  }, []);

  const fetchCVs = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch("/api/user/resumes");
      if (response.ok) {
        const data = await response.json();
        setCVs(data.resumes || []);
        if (data.resumes?.length > 0) {
          const primary =
            data.resumes.find((r: CV) => r.isPrimary) || data.resumes[0];
          setSelectedCV(primary);
        } else {
          setSelectedCV(null);
        }
      }
    } catch (error) {
      console.error("Error fetching CVs:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCVs();
  }, [fetchCVs]);

  const handleUploadSuccess = useCallback(() => {
    setShowUpload(false);
    fetchCVs();
  }, [fetchCVs]);

  const handleAnalysisStart = useCallback((cvId: string) => {
    setShowUpload(false);
    setShowAnalysis(true);
    setAnalysisCvId(cvId);
  }, []);

  const handleAnalysisComplete = useCallback(() => {
    setShowAnalysis(false);
    setAnalysisCvId(null);
    fetchCVs();
  }, [fetchCVs]);

  const handleCloseAnalysis = useCallback(() => {
    setShowAnalysis(false);
    setAnalysisCvId(null);
    fetchCVs();
  }, [fetchCVs]);

  const setPrimary = async (id: string) => {
    try {
      const response = await fetch(`/api/user/resumes/${id}`, {
        method: "POST",
      });

      if (response.ok) {
        const updatedCVs = cvs.map((r) => ({
          ...r,
          isPrimary: r.id === id,
        }));
        setCVs(updatedCVs);
        setSelectedCV(updatedCVs.find((r) => r.id === id) || null);
        toast.success("Primary CV updated!");
      }
    } catch {
      toast.error("Failed to update primary CV");
    }
  };

  const deleteCV = async (id: string) => {
    if (!confirm("Delete this CV?")) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/user/resumes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const newCVs = cvs.filter((r) => r.id !== id);
        setCVs(newCVs);
        if (selectedCV?.id === id) {
          setSelectedCV(newCVs[0] || null);
        }
        toast.success("CV deleted");
      }
    } catch {
      toast.error("Failed to delete CV");
    } finally {
      setDeleting(null);
    }
  };

  const createRoleVersion = async (role: string) => {
    if (!selectedCV?.parsedText) {
      toast.error("Upload a CV first to create role-specific versions");
      return;
    }

    if (!isPremium) {
      toast.success("Please upgrade to create role-specific CV versions");
      return;
    }

    setTailoringForJob(true);
    try {
      const response = await fetch("/api/cv-regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          cvText: selectedCV.parsedText,
          role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setRegeneratedCV(data.cvData);
        setShowRegenerated(true);
        setShowRoleSelector(false);
        toast.success(`${role} CV version created!`);
      } else if (data.code === "PREMIUM_REQUIRED") {
        toast.error("Premium subscription required");
        router.push("/pricing");
      } else {
        toast.error(data.error || "Failed to create CV version");
      }
    } catch (error) {
      console.error("Create version error:", error);
      toast.error("Failed to create CV version. Please try again.");
    } finally {
      setTailoringForJob(false);
    }
  };

  const regenerateCV = async () => {
    if (!selectedCV?.parsedText) {
      toast.error("Upload a CV first to regenerate");
      return;
    }

    if (!isPremium) {
      toast.error("Upgrade to Premium to regenerate your CV");
      return;
    }

    setRegenerating(true);
    try {
      const response = await fetch("/api/cv-regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText: selectedCV.parsedText }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setRegeneratedCV(data.cvData);
        setShowRegenerated(true);
        toast.success("CV regenerated successfully!");
      } else if (data.code === "PREMIUM_REQUIRED") {
        toast.error("Premium subscription required");
        router.push("/pricing");
      } else {
        toast.error(data.error || "Failed to regenerate CV");
      }
    } catch (error) {
      console.error("Regeneration error:", error);
      toast.error("Failed to regenerate CV. Please try again.");
    } finally {
      setRegenerating(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const analyzeCV = (cv: CV | null) => {
    if (!cv) return [];

    const suggestions: {
      category: string;
      issue: string;
      suggestion: string;
      priority: "high" | "medium" | "low";
    }[] = [];

    if (!cv.parsedText || cv.parsedText.length < 200) {
      suggestions.push({
        category: "Content",
        issue: "Limited CV content",
        suggestion: "Add more details about your experience and achievements.",
        priority: "high",
      });
    }

    if (cv.skills.length < 5) {
      suggestions.push({
        category: "Skills",
        issue: "Fewer than 5 skills listed",
        suggestion: "Add more relevant technical and soft skills.",
        priority: "high",
      });
    }

    if (cv.experiences.length < 2) {
      suggestions.push({
        category: "Experience",
        issue: "Limited work experience entries",
        suggestion: "Include all relevant positions.",
        priority: "medium",
      });
    }

    if (cv.education.length === 0) {
      suggestions.push({
        category: "Education",
        issue: "No education entries found",
        suggestion: "Add your educational background.",
        priority: "high",
      });
    }

    const hasActionVerbs =
      /^(Led|Managed|Developed|Created|Implemented|Increased|Reduced|Improved|Designed|Built|Analyzed)/.test(
        cv.parsedText || "",
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
        suggestion: "Your CV is well-structured.",
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

  const suggestions = analyzeCV(selectedCV);

  const getRoleLabel = (roleId: string | null | undefined) => {
    if (!roleId) return null;
    const role = JOB_ROLES.find(r => r.id === roleId);
    return role?.label || roleId;
  };

  const groupedCVs = cvs.reduce((acc, cv) => {
    const role = cv.role || "general";
    if (!acc[role]) acc[role] = [];
    acc[role].push(cv);
    return acc;
  }, {} as Record<string, CV[]>);

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
    <>
      {showAnalysis && analysisCvId && (
        <CVAnalysisScreen
          cvId={analysisCvId}
          onComplete={handleAnalysisComplete}
          onClose={handleCloseAnalysis}
        />
      )}
      <div className="w-full space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[#14141f] p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white">My CVs</h1>
              <p className="mono text-xs text-zinc-500">{cvs.length} uploaded</p>
            </div>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex-shrink-0 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
          >
            {showUpload ? "Cancel" : "Upload CV"}
          </button>
        </div>
        {selectedCV && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
            {isPremium ? (
              <>
                <button onClick={() => setShowRoleSelector(true)} className="agent-button text-xs flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Role Version
                </button>
                <button
                  onClick={regenerateCV}
                  disabled={regenerating || !selectedCV?.parsedText}
                  className="agent-button text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {regenerating ? (
                    <div className="h-3 w-3 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {regenerating ? "Regenerating..." : "Regenerate"}
                </button>
              </>
            ) : (
              <a href="/pricing" className="agent-button-primary text-xs flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Upgrade
              </a>
            )}
          </div>
        )}
      </div>

      {showRoleSelector && (
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-500/5 to-transparent p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Create Role-Specific Version</h2>
              <p className="text-sm text-zinc-400">Tailor your CV for a specific job role</p>
            </div>
            <button
              onClick={() => setShowRoleSelector(false)}
              className="rounded-lg p-2 text-zinc-500 hover:text-white hover:bg-white/5"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {JOB_ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => createRoleVersion(role.label)}
                disabled={tailoringForJob}
                className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-[#14141f] hover:border-purple-500/50 hover:bg-purple-500/5 transition-colors text-left disabled:opacity-50"
              >
                <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={role.icon} />
                  </svg>
                </div>
                <span className="text-sm font-medium text-white">{role.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showRegenerated && regeneratedCV && (
        <div className="rounded-2xl border-2 border-purple-500/30 bg-gradient-to-b from-purple-500/5 to-transparent p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">New CV Version Ready</h2>
                <p className="mono text-xs text-zinc-500">Preview and download your tailored CV</p>
              </div>
            </div>
            <button
              onClick={() => setShowRegenerated(false)}
              className="rounded-lg p-2 text-zinc-500 hover:text-white hover:bg-white/5"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Styled CV Preview */}
          <div className="rounded-xl bg-white border border-zinc-200 p-8 max-h-[520px] overflow-y-auto shadow-sm">
            {/* Name & contact */}
            <div className="border-b-2 border-indigo-500 pb-4 mb-5">
              <h1 className="text-2xl font-bold text-[#1e1b4b] tracking-tight">{regeneratedCV.name}</h1>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-sm text-zinc-500">
                {[regeneratedCV.email, regeneratedCV.phone, regeneratedCV.location].filter(Boolean).map((item, i, arr) => (
                  <span key={i} className="flex items-center gap-3">
                    {item}
                    {i < arr.length - 1 && <span className="text-zinc-300">|</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Summary */}
            {regeneratedCV.summary && (
              <div className="mb-5">
                <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Professional Summary</h2>
                <p className="text-sm text-zinc-600 leading-relaxed">{regeneratedCV.summary}</p>
              </div>
            )}

            {/* Experience */}
            {regeneratedCV.experience?.length > 0 && (
              <div className="mb-5">
                <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Work Experience</h2>
                {regeneratedCV.experience.map((exp, i) => (
                  <div key={i} className="mb-4">
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-sm text-[#1e1b4b]">{exp.title}</span>
                      {exp.duration && <span className="text-xs text-zinc-400">{exp.duration}</span>}
                    </div>
                    {exp.company && <div className="text-xs text-indigo-500 font-medium mb-2">{exp.company}</div>}
                    <ul className="space-y-1">
                      {exp.bullets?.map((b, j) => (
                        <li key={j} className="flex gap-2 text-xs text-zinc-600 leading-relaxed">
                          <span className="text-indigo-400 mt-0.5 shrink-0">▸</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {regeneratedCV.education?.length > 0 && (
              <div className="mb-5">
                <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Education</h2>
                {regeneratedCV.education.map((edu, i) => (
                  <div key={i} className="mb-2">
                    <div className="font-semibold text-sm text-[#1e1b4b]">{edu.degree}</div>
                    <div className="text-xs text-zinc-500">{edu.institution}{edu.year ? ` · ${edu.year}` : ""}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Skills */}
            {regeneratedCV.skills?.length > 0 && (
              <div className="mb-5">
                <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {regeneratedCV.skills.map((skill, i) => (
                    <span key={i} className="text-xs bg-indigo-50 text-zinc-700 border border-indigo-100 px-2.5 py-1 rounded">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {regeneratedCV.certifications && regeneratedCV.certifications.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Certifications</h2>
                {regeneratedCV.certifications.map((cert, i) => (
                  <div key={i} className="text-xs text-zinc-600 flex gap-2">
                    <span className="text-indigo-400">▸</span>{cert}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <PDFDownloadLink
              document={<CVPDF data={regeneratedCV} />}
              fileName={`${regeneratedCV.name?.replace(/\s+/g, "-") || "cv"}-careeros.pdf`}
              className="agent-button-primary flex items-center gap-2"
            >
              {({ loading: pdfLoading }) => (
                <>
                  {pdfLoading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </>
                  )}
                </>
              )}
            </PDFDownloadLink>
            <button
              onClick={() => setShowRegenerated(false)}
              className="agent-button flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate Again
            </button>
          </div>
        </div>
      )}

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
          <CVUpload onUploadSuccess={handleUploadSuccess} onAnalysisStart={handleAnalysisStart} />
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
      ) : cvs.length === 0 && !showUpload ? (
        <div className="rounded-2xl border border-white/10 bg-[#14141f] p-12 text-center">
          <div className="h-14 w-14 mx-auto rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
            <svg className="h-7 w-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white">No CVs</h3>
          <p className="mono text-xs text-zinc-500 mt-2">Upload your CV to get started.</p>
          <button
            onClick={() => setShowUpload(true)}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white mt-4 hover:opacity-90 transition-opacity"
          >
            Upload CV
          </button>
        </div>
      ) : cvs.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedCVs).map(([role, roleCVs]) => (
            <div key={role}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-3">
                  {role === "general" ? "General CV" : getRoleLabel(role)}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
              </div>
              <div className="grid gap-2">
                {roleCVs.map((cv) => {
                  const isSelected = selectedCV?.id === cv.id;

                  const handleSelect = () => setSelectedCV(cv);

                  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleSelect();
                    }
                  };

                  return (
                    <div
                      key={cv.id}
                      onClick={handleSelect}
                      onKeyDown={handleKeyDown}
                      tabIndex={0}
                      role="button"
                      aria-pressed={isSelected}
                      className={`rounded-xl border p-4 transition-all cursor-pointer ${
                        isSelected 
                          ? "border-purple-500/50 bg-purple-500/5" 
                          : "border-white/10 bg-[#14141f] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {cv.isPrimary && (
                              <span className="mono text-[10px] px-1.5 py-0.5 rounded border bg-purple-500/20 border-purple-500/30 text-purple-400 flex-shrink-0">
                                primary
                              </span>
                            )}
                            <span className="text-sm font-medium text-white truncate">{cv.originalName}</span>
                          </div>
                          <p className="mono text-xs text-zinc-500 mt-0.5">
                            {formatDate(cv.createdAt)} · {cv.skills.length} skills
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!cv.isPrimary && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setPrimary(cv.id); }}
                              className="mono text-[10px] px-2 py-1 rounded border border-white/10 text-zinc-500 hover:border-purple-500/50 hover:text-purple-400 transition-colors"
                            >
                              Set Primary
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteCV(cv.id); }}
                            disabled={deleting === cv.id}
                            className="mono text-[10px] px-2 py-1 rounded border border-white/10 text-zinc-500 hover:border-red-500/50 hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            {deleting === cv.id ? "..." : "✕"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {selectedCV && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#14141f] p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-zinc-500 font-medium">Optimization Tips</span>
                  <span className="mono text-xs text-zinc-600 truncate max-w-[150px]">{selectedCV.originalName}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg bg-purple-500/10 p-3 text-center">
                    <p className="text-xl font-bold text-purple-400">{selectedCV.skills.length}</p>
                     <p className="text-xs text-zinc-500">Skills</p>
                  </div>
                  <div className="rounded-lg bg-cyan-500/10 p-3 text-center">
                    <p className="text-xl font-bold text-cyan-400">{selectedCV.experiences.length}</p>
                     <p className="text-xs text-zinc-500">Experience</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                    <p className="text-xl font-bold text-amber-400">{selectedCV.education.length}</p>
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
    </>
  );
}
