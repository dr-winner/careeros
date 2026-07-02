"use client";

import { useState, useEffect, useCallback, type KeyboardEvent } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";
import CVUpload from "@/app/components/cv-upload";
import dynamic from "next/dynamic";
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);
import CVPDF from "@/components/cv-pdf";
import CVAnalysisScreen from "@/components/cv-analysis-screen";
import type { StructuredCV } from "@/app/api/cv-regenerate/route";

const JOB_ROLES = [
  { id: "frontend",   label: "Frontend Development",       icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { id: "backend",    label: "Backend Development",        icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" },
  { id: "fullstack",  label: "Full Stack Development",     icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
  { id: "ai-ml",      label: "AI / ML Engineer",           icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
  { id: "devops",     label: "DevOps / SRE",               icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
  { id: "product",    label: "Product Management",         icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { id: "marketing",  label: "Marketing / Digital",        icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" },
  { id: "data",       label: "Data Science / Analytics",   icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { id: "mobile",     label: "Mobile Development",         icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { id: "custom",     label: "Custom / Other",             icon: "M12 6v6m0 0v6m0-6h6m-6 0H6" },
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

interface UserProfile {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  headline: string | null;
  experience: string | null;
  desiredRole: string | null;
}

function ScoreRing({ score, size = 128 }: { score: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = cx - 10;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#8b5cf6" : score >= 40 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs Work";
  const sw = size > 140 ? 10 : 8;
  const scoreFontSize = size > 140 ? 38 : 28;
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#27272a" strokeWidth={sw} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={sw}
          strokeDasharray={circ}
          strokeDashoffset={circ - fill}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }}
        />
        <text
          x={cx} y={cy - 10}
          textAnchor="middle" dominantBaseline="middle"
          fill="#ffffff" fontSize={scoreFontSize} fontWeight="800"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px` }}
        >
          {score}
        </text>
        <text
          x={cx} y={cy + 16}
          textAnchor="middle" dominantBaseline="middle"
          fill="#71717a" fontSize="12"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px` }}
        >
          /100
        </text>
      </svg>
      <span className="text-sm font-bold mono" style={{ color }}>{label}</span>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden flex-1">
      <div className={`h-full rounded-full ${color}`} style={{ width: max > 0 ? `${Math.min(100,(value/max)*100)}%` : "0%", transition: "width 0.6s ease" }} />
    </div>
  );
}

export default function CVsPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const posthog = usePostHog();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [activeTab, setActiveTab] = useState<"cvs" | "cover-letter">(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("tab") === "cover-letter" ? "cover-letter" : "cvs";
    }
    return "cvs";
  });

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

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [coverForm, setCoverForm] = useState({ recipientName: "", companyName: "", jobTitle: "", jobDescription: "" });
  const [coverLetter, setCoverLetter] = useState("");

  useEffect(() => {
    fetch("/api/user/premium").then((r) => r.ok ? r.json() : null).then((d) => { if (d?.isPremium !== undefined) setIsPremium(d.isPremium); }).catch(() => {});
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
          const primary = data.resumes.find((r: CV) => r.isPrimary) || data.resumes[0];
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

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => { fetchCVs(); fetchProfile(); }, [fetchCVs, fetchProfile]);

  const handleUploadSuccess = useCallback(() => { setShowUpload(false); fetchCVs(); }, [fetchCVs]);
  const handleAnalysisStart = useCallback((cvId: string) => { setShowUpload(false); setShowAnalysis(true); setAnalysisCvId(cvId); }, []);
  const handleAnalysisComplete = useCallback(() => { setShowAnalysis(false); setAnalysisCvId(null); fetchCVs(); }, [fetchCVs]);
  const handleCloseAnalysis = useCallback(() => { setShowAnalysis(false); setAnalysisCvId(null); fetchCVs(); }, [fetchCVs]);

  const setPrimary = async (id: string) => {
    try {
      const response = await fetch(`/api/user/resumes/${id}`, { method: "POST" });
      if (response.ok) {
        const updatedCVs = cvs.map((r) => ({ ...r, isPrimary: r.id === id }));
        setCVs(updatedCVs);
        setSelectedCV(updatedCVs.find((r) => r.id === id) || null);
        toast.success("Primary CV updated!");
      }
    } catch { toast.error("Failed to update primary CV"); }
  };

  const deleteCV = async (id: string) => {
    if (!confirm("Delete this CV?")) return;
    setDeleting(id);
    try {
      const response = await fetch(`/api/user/resumes/${id}`, { method: "DELETE" });
      if (response.ok) {
        const newCVs = cvs.filter((r) => r.id !== id);
        setCVs(newCVs);
        if (selectedCV?.id === id) setSelectedCV(newCVs[0] || null);
        toast.success("CV deleted");
      }
    } catch { toast.error("Failed to delete CV"); } finally { setDeleting(null); }
  };

  const createRoleVersion = async (role: string) => {
    if (!selectedCV?.parsedText) { toast.error("Upload a CV first"); return; }
    if (!isPremium) { toast.success("Please upgrade to create role-specific versions"); return; }
    if (tailoringForJob) return;
    setTailoringForJob(true);
    try {
      const response = await fetch("/api/cv-regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText: selectedCV.parsedText, role }),
      });
      const data = await response.json();
      if (response.ok) {
        posthog?.capture("cv_role_version_created", { role });
        setRegeneratedCV(data.cvData); setShowRegenerated(true); setShowRoleSelector(false); toast.success(`${role} CV version ready!`);
      } else if (data.code === "PREMIUM_REQUIRED") { toast.error("Premium required"); router.push("/pricing"); }
      else { toast.error(data.error || "Failed to create version"); }
    } catch { toast.error("Failed to create CV version"); } finally { setTailoringForJob(false); }
  };

  const regenerateCV = async () => {
    if (!selectedCV?.parsedText) { toast.error("Upload a CV first"); return; }
    if (!isPremium) { toast.error("Upgrade to Premium to regenerate your CV"); return; }
    if (regenerating) return;
    setRegenerating(true);
    try {
      const response = await fetch("/api/cv-regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText: selectedCV.parsedText }),
      });
      const data = await response.json();
      if (response.ok) {
        posthog?.capture("cv_regenerated", { cv_name: selectedCV?.originalName });
        setRegeneratedCV(data.cvData); setShowRegenerated(true); toast.success("CV regenerated!");
      } else if (data.code === "PREMIUM_REQUIRED") { toast.error("Premium required"); router.push("/pricing"); }
      else { toast.error(data.error || "Failed to regenerate CV"); }
    } catch { toast.error("Failed to regenerate CV"); } finally { setRegenerating(false); }
  };

  const generateCoverLetter = async () => {
    if (!coverForm.jobTitle || !coverForm.companyName) { toast.error("Fill in job title and company name"); return; }
    if (generating) return;
    setGenerating(true);
    try {
      const response = await fetch("/api/ai/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coverForm),
      });
      const data = await response.json();
      if (response.ok && data.coverLetter) { setCoverLetter(data.coverLetter); toast.success("Cover letter generated!"); }
      else { generateTemplateCoverLetter(); }
    } catch { generateTemplateCoverLetter(); } finally { setGenerating(false); }
  };

  const generateTemplateCoverLetter = () => {
    const name = profile?.fullName || "Your Name";
    const headline = profile?.headline || profile?.experience || "professional";
    const phone = profile?.phone || "";
    const email = profile?.email || "";
    const letter = `${name}\n${phone}\n${email}\n\n${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}\n\n${coverForm.recipientName ? `Dear ${coverForm.recipientName},\n\n` : ""}I am writing to express my interest in the ${coverForm.jobTitle} position at ${coverForm.companyName}. With my background as a ${headline}, I am confident in my ability to contribute effectively to your team.\n\n${coverForm.jobDescription ? "I was excited to see the requirements for this role. My experience has prepared me well to excel in these areas." : "I am drawn to this opportunity because of your company's commitment to excellence."}\n\nThroughout my career, I have developed strong skills in problem-solving and collaboration. I am committed to continuous learning and staying current with industry best practices.\n\nI would welcome the opportunity to discuss how my skills and experience align with your needs. I am available for an interview at your earliest convenience and can be reached at ${phone || email}.\n\nThank you for considering my application.\n\nSincerely,\n${name}`;
    setCoverLetter(letter);
  };

  const analyzeCV = (cv: CV | null) => {
    if (!cv) return [];
    const s: { category: string; issue: string; suggestion: string; priority: "high" | "medium" | "low" }[] = [];
    if (!cv.parsedText || cv.parsedText.length < 200) s.push({ category: "Content", issue: "Limited CV content", suggestion: "Add more details about your experience and achievements.", priority: "high" });
    if (cv.skills.length < 5) s.push({ category: "Skills", issue: "Fewer than 5 skills listed", suggestion: "Add more relevant technical and soft skills.", priority: "high" });
    if (cv.experiences.length < 2) s.push({ category: "Experience", issue: "Limited work experience", suggestion: "Include all relevant positions, even internships.", priority: "medium" });
    if (cv.education.length === 0) s.push({ category: "Education", issue: "No education entries", suggestion: "Add your educational background and certifications.", priority: "high" });
    if (!/^(Led|Managed|Developed|Created|Implemented|Increased|Reduced|Improved|Designed|Built|Analyzed)/.test(cv.parsedText || "")) s.push({ category: "Writing", issue: "Use stronger action verbs", suggestion: "Start bullets with verbs like Led, Built, Increased.", priority: "low" });
    if (!s.length) s.push({ category: "Overall", issue: "Looking great!", suggestion: "Your CV is well-structured.", priority: "low" });
    return s;
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const suggestions = analyzeCV(selectedCV);
  const cvScore = selectedCV
    ? Math.max(0, 100 - suggestions.filter((s) => s.priority === "high").length * 20 - suggestions.filter((s) => s.priority === "medium").length * 10 - suggestions.filter((s) => s.priority === "low").length * 5)
    : 0;

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
        <CVAnalysisScreen cvId={analysisCvId} onComplete={handleAnalysisComplete} onClose={handleCloseAnalysis} />
      )}

      <div className="w-full space-y-6">
        {/* ── Header ── */}
        <div className="animate-fade-up flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold gradient-text font-display">CVs &amp; Letters</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {cvs.length === 0 ? "No CVs uploaded yet" : `${cvs.length} CV${cvs.length !== 1 ? "s" : ""} · ${selectedCV?.skills.length ?? 0} skills detected`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 gap-1">
              {(["cvs", "cover-letter"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === t ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {t === "cvs" ? "My CVs" : "Cover Letter"}
                </button>
              ))}
            </div>
            {activeTab === "cvs" && (
              <button onClick={() => setShowUpload(!showUpload)} className="agent-button-primary press-scale">
                {showUpload ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    Cancel
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Upload CV
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── CVs tab ── */}
        {activeTab === "cvs" && (
          <>
            {/* Upload zone */}
            {showUpload && (
              <div className="animate-fade-up agent-card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Upload your CV</h2>
                    <p className="mono text-xs text-zinc-500">PDF format · Max 10MB</p>
                  </div>
                </div>
                <CVUpload onUploadSuccess={handleUploadSuccess} onAnalysisStart={handleAnalysisStart} />
              </div>
            )}

            {/* Role selector modal */}
            {showRoleSelector && (
              <div className="animate-fade-up agent-card p-6 border-purple-500/20">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-bold text-white">Create Role-Specific Version</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">AI tailors your CV for the selected role</p>
                  </div>
                  <button onClick={() => setShowRoleSelector(false)} className="rounded-lg p-2 text-zinc-500 hover:text-white hover:bg-white/5">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                  {JOB_ROLES.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => createRoleVersion(role.label)}
                      disabled={tailoringForJob}
                      className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-purple-500/40 hover:bg-purple-500/5 transition-colors text-left disabled:opacity-50 press-scale"
                    >
                      <div className="h-9 w-9 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                        <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={role.icon} />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-zinc-300">{role.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading ? (
              <div className="space-y-4">
                <div className="agent-card p-6 animate-pulse flex items-center gap-6">
                  <div className="h-32 w-32 rounded-full bg-white/[0.04] flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 w-1/3 rounded bg-white/[0.04]" />
                    <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
                    <div className="h-3 w-2/5 rounded bg-white/[0.04]" />
                  </div>
                </div>
                <div className="agent-card p-5 animate-pulse flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-white/[0.04]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 rounded bg-white/[0.04]" />
                    <div className="h-3 w-1/3 rounded bg-white/[0.04]" />
                  </div>
                </div>
              </div>
            ) : cvs.length === 0 && !showUpload ? (
              /* ── Empty state ── */
              <div className="agent-card p-16 text-center">
                <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-cyan-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-5">
                  <svg className="h-10 w-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Upload your CV</h3>
                <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-6">
                  Get a CV score, skill analysis, and AI-powered job fit matching as soon as you upload.
                </p>
                <button onClick={() => setShowUpload(true)} className="agent-button-primary press-scale">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload your first CV
                </button>
              </div>
            ) : (
              /* ── Centered single-column layout ── */
              <div className="max-w-2xl mx-auto space-y-5">

                {/* ══ SCORE HERO — centered, dominant ══ */}
                {selectedCV && (
                  <div className="agent-card p-8 animate-fade-up">
                    {/* Centered ring */}
                    <div className="flex flex-col items-center mb-7">
                      <div className="relative mb-2">
                        <div className="absolute inset-0 rounded-full blur-2xl opacity-20" style={{ background: cvScore >= 80 ? "#22c55e" : cvScore >= 60 ? "#8b5cf6" : cvScore >= 40 ? "#f59e0b" : "#ef4444" }} />
                        <ScoreRing score={cvScore} size={168} />
                      </div>
                      <h2 className="text-base font-semibold text-white mt-2">{selectedCV.originalName}</h2>
                      <p className="mono text-xs text-zinc-500 mt-0.5">{formatDate(selectedCV.createdAt)} · CV Analysis</p>
                    </div>

                    {/* Stat blocks */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {[
                        { label: "Skills", value: selectedCV.skills.length, max: 20, color: "bg-purple-500" },
                        { label: "Experience", value: selectedCV.experiences.length, max: 5, color: "bg-cyan-500" },
                        { label: "Education", value: selectedCV.education.length, max: 3, color: "bg-green-500" },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                          <span className="text-2xl font-black text-white">{stat.value}</span>
                          <div className="mt-1.5 mb-2">
                            <MiniBar value={stat.value} max={stat.max} color={stat.color} />
                          </div>
                          <span className="mono text-[10px] text-zinc-500 uppercase tracking-wide">{stat.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Skill chips */}
                    {selectedCV.skills.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1.5 mb-6">
                        {selectedCV.skills.slice(0, 12).map((s) => (
                          <span key={s.skillName} className="px-2.5 py-1 rounded-lg text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20">{s.skillName}</span>
                        ))}
                        {selectedCV.skills.length > 12 && (
                          <span className="px-2.5 py-1 rounded-lg text-xs text-zinc-600 border border-white/[0.06]">+{selectedCV.skills.length - 12} more</span>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      {isPremium && selectedCV.parsedText ? (
                        <>
                          <button
                            onClick={() => setShowRoleSelector(true)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 text-sm font-medium text-purple-300 hover:bg-purple-500/20 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            Role Version
                          </button>
                          <button
                            onClick={regenerateCV}
                            disabled={regenerating}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-sm font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors disabled:opacity-40"
                          >
                            {regenerating
                              ? <div className="h-4 w-4 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                              : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            }
                            {regenerating ? "Regenerating…" : "Regenerate CV"}
                          </button>
                        </>
                      ) : !isPremium ? (
                        <a href="/pricing" className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-purple-500/20 bg-purple-500/8 text-sm text-purple-400 hover:bg-purple-500/15 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          Unlock AI Tools
                        </a>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* ══ CV list ══ */}
                <div className="space-y-3">
                  <p className="mono text-[10px] text-zinc-600 uppercase tracking-widest px-1">My CVs ({cvs.length})</p>
                  {cvs.map((cv) => {
                    const isSelected = selectedCV?.id === cv.id;
                    const handleSelect = () => setSelectedCV(cv);
                    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(); }
                    };
                    return (
                      <div
                        key={cv.id}
                        onClick={handleSelect}
                        onKeyDown={handleKeyDown}
                        tabIndex={0}
                        role="button"
                        aria-pressed={isSelected}
                        className={`group rounded-2xl border p-4 transition-all cursor-pointer ${
                          isSelected
                            ? "border-purple-500/40 bg-purple-500/[0.06]"
                            : "border-white/[0.07] bg-[#0d0d18] hover:border-white/[0.14] hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-purple-500/20" : "bg-white/[0.04]"}`}>
                            <svg className={`h-5 w-5 transition-colors ${isSelected ? "text-purple-400" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {cv.isPrimary && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 border border-purple-500/30 text-purple-400">
                                  <span className="h-1 w-1 rounded-full bg-purple-400" />Primary
                                </span>
                              )}
                              <span className="text-sm font-medium text-white truncate">{cv.originalName}</span>
                            </div>
                            <p className="mono text-xs text-zinc-600 mt-0.5">{formatDate(cv.createdAt)} · {cv.skills.length} skills</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!cv.isPrimary && (
                              <button onClick={(e) => { e.stopPropagation(); setPrimary(cv.id); }} className="text-[10px] mono px-2 py-1 rounded-lg border border-white/[0.08] text-zinc-500 hover:border-purple-500/40 hover:text-purple-400 transition-colors">
                                Set Primary
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); deleteCV(cv.id); }} disabled={deleting === cv.id} className="text-[10px] mono px-2 py-1 rounded-lg border border-white/[0.08] text-zinc-500 hover:border-red-500/40 hover:text-red-400 transition-colors disabled:opacity-40">
                              {deleting === cv.id ? "…" : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {!showUpload && (
                    <button onClick={() => setShowUpload(true)} className="w-full rounded-2xl border border-dashed border-white/[0.08] p-4 text-sm text-zinc-600 hover:border-purple-500/30 hover:text-zinc-400 transition-colors flex items-center justify-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                      Add another CV version
                    </button>
                  )}
                </div>

                {/* ══ Optimization Tips ══ */}
                {selectedCV && (
                  <div className="agent-card p-5">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mono mb-4">Optimization Tips</p>
                    <div className="space-y-4">
                      {suggestions.map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className={`h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            item.priority === "high" ? "bg-red-500/15" : item.priority === "medium" ? "bg-amber-500/15" : "bg-green-500/15"
                          }`}>
                            <span className={`text-[10px] font-black ${
                              item.priority === "high" ? "text-red-400" : item.priority === "medium" ? "text-amber-400" : "text-green-400"
                            }`}>{item.priority === "high" ? "!" : item.priority === "medium" ? "~" : "✓"}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                item.priority === "high" ? "bg-red-500/10 text-red-400" : item.priority === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-green-500/10 text-green-400"
                              }`}>{item.priority}</span>
                              <p className="text-sm font-medium text-white">{item.issue}</p>
                            </div>
                            <p className="mono text-xs text-zinc-500 leading-relaxed">{item.suggestion}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ══ Best Practices ══ */}
                {selectedCV && (
                  <div className="agent-card p-5">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mono mb-4">Best Practices</p>
                    <ul className="space-y-3">
                      {["Keep to 1–2 pages", "Use job posting keywords", "Quantify achievements", "Start bullets with action verbs", "Proofread carefully"].map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <svg className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          <span className="mono text-sm text-zinc-400">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Regenerated CV preview */}
            {showRegenerated && regeneratedCV && (
              <div className="animate-fade-up agent-card p-6 border-purple-500/20">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="font-bold text-white">New CV Version Ready</h2>
                      <p className="mono text-xs text-zinc-500">Preview and download your tailored CV</p>
                    </div>
                  </div>
                  <button onClick={() => setShowRegenerated(false)} className="rounded-lg p-2 text-zinc-500 hover:text-white hover:bg-white/5">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="rounded-xl bg-white border border-zinc-200 p-8 max-h-[520px] overflow-y-auto">
                  <div className="border-b-2 border-indigo-500 pb-4 mb-5">
                    <h1 className="text-2xl font-bold text-[#1e1b4b]">{regeneratedCV.name}</h1>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-sm text-zinc-500">
                      {[regeneratedCV.email, regeneratedCV.phone, regeneratedCV.location].filter(Boolean).map((item, i, arr) => (
                        <span key={i} className="flex items-center gap-3">{item}{i < arr.length - 1 && <span className="text-zinc-300">|</span>}</span>
                      ))}
                    </div>
                  </div>
                  {regeneratedCV.summary && <div className="mb-5"><h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Professional Summary</h2><p className="text-sm text-zinc-600 leading-relaxed">{regeneratedCV.summary}</p></div>}
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
                          <ul className="space-y-1">{exp.bullets?.map((b, j) => <li key={j} className="flex gap-2 text-xs text-zinc-600 leading-relaxed"><span className="text-indigo-400 mt-0.5 shrink-0">▸</span><span>{b}</span></li>)}</ul>
                        </div>
                      ))}
                    </div>
                  )}
                  {regeneratedCV.skills?.length > 0 && (
                    <div className="mb-5">
                      <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Skills</h2>
                      <div className="flex flex-wrap gap-2">{regeneratedCV.skills.map((skill, i) => <span key={i} className="text-xs bg-indigo-50 text-zinc-700 border border-indigo-100 px-2.5 py-1 rounded">{skill}</span>)}</div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-4 flex-wrap">
                  {isMounted && (
                    <PDFDownloadLink
                      document={<CVPDF data={regeneratedCV} />}
                      fileName={`${regeneratedCV.name?.replace(/\s+/g, "-") || "cv"}-careeros.pdf`}
                      className="agent-button-primary flex items-center gap-2"
                    >
                      {({ loading: pdfLoading }) => pdfLoading ? (
                        <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Generating PDF…</>
                      ) : (
                        <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Download PDF</>
                      )}
                    </PDFDownloadLink>
                  )}
                  <button onClick={() => { setShowRegenerated(false); regenerateCV(); }} className="agent-button flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Regenerate Again
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Cover Letter tab ── */}
        {activeTab === "cover-letter" && (
          <div className="max-w-5xl mx-auto">
            {profileLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="agent-card p-5">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mono mb-4">Job Details</p>
                    <div className="space-y-3.5">
                      {[
                        { label: "Recipient Name", key: "recipientName" as const, placeholder: "Hiring Manager", required: false },
                        { label: "Company Name", key: "companyName" as const, placeholder: "Acme Corporation", required: true },
                        { label: "Job Title", key: "jobTitle" as const, placeholder: "Software Engineer", required: true },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="text-xs text-zinc-400 mb-1.5 block">{f.label}{f.required ? " *" : ""}</label>
                          <input
                            type="text"
                            placeholder={f.placeholder}
                            value={coverForm[f.key]}
                            onChange={(e) => setCoverForm({ ...coverForm, [f.key]: e.target.value })}
                            className="agent-input"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="text-xs text-zinc-400 mb-1.5 block">Job Description</label>
                        <textarea
                          rows={4}
                          placeholder="Paste the job description for a tailored letter…"
                          value={coverForm.jobDescription}
                          onChange={(e) => setCoverForm({ ...coverForm, jobDescription: e.target.value })}
                          className="agent-input resize-none"
                        />
                      </div>
                      <button
                        onClick={generateCoverLetter}
                        disabled={generating}
                        className="agent-button-primary w-full justify-center py-3 press-scale"
                      >
                        {generating ? (
                          <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Generating…</>
                        ) : (
                          <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Generate Letter</>
                        )}
                      </button>
                    </div>
                  </div>

                  {profile && (
                    <div className="agent-card p-5">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mono mb-3">Your Profile</p>
                      <div className="space-y-2">
                        {[
                          { label: "Name", value: profile.fullName },
                          { label: "Email", value: profile.email },
                          { label: "Headline", value: profile.headline || profile.experience },
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                            <span className="text-xs text-zinc-500">{item.label}</span>
                            <span className="text-xs text-zinc-300 truncate text-right">{item.value || <span className="text-zinc-600">Not set</span>}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="agent-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mono">Generated Letter</p>
                      {coverLetter && (
                        <button
                          onClick={() => { navigator.clipboard.writeText(coverLetter); toast.success("Copied!"); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-xs text-purple-400 hover:bg-purple-500/20 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          Copy
                        </button>
                      )}
                    </div>
                    {coverLetter ? (
                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-4">
                        {coverLetter.split("\n\n").filter((p) => p.trim()).map((paragraph, i) => (
                          <p key={i} className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{paragraph.trim()}</p>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-white/[0.06] gap-2">
                        <svg className="h-8 w-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-xs text-zinc-600 text-center">Fill in the details on the left<br />and click Generate Letter</p>
                      </div>
                    )}
                  </div>

                  <div className="agent-card p-5">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mono mb-3">Tips</p>
                    <ul className="space-y-2.5">
                      {["Address to a specific person when possible", "Keep it to one page", "Customize for each application", "Highlight relevant achievements", "Show genuine enthusiasm for the company"].map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <span className="text-cyan-400 flex-shrink-0 mt-0.5">→</span>
                          <span className="mono text-xs text-zinc-500 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
