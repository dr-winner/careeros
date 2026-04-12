"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import { toast } from "sonner";

interface CVAnalysis {
  overall: {
    score: number;
    verdict: string;
    summary: string;
  };
  content: {
    score: number;
    issues: string[];
    strengths: string[];
  };
  style: {
    score: number;
    issues: string[];
    strengths: string[];
  };
  structure: {
    score: number;
    issues: string[];
    strengths: string[];
  };
  recommendations: string[];
}

const ANALYSIS_STEPS = [
  "Initializing CV parser...",
  "Reading file structure...",
  "Extracting contact information...",
  "Analyzing work experience entries...",
  "Parsing education history...",
  "Identifying technical skills...",
  "Evaluating action verb usage...",
  "Checking quantifiable achievements...",
  "Assessing ATS compatibility...",
  "Comparing against industry standards...",
  "Generating content insights...",
  "Finalizing analysis...",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const [step, setStep] = useState<"upload" | "analyzing" | "results">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [cvLink, setCvLink] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "link">("file");
  const [isUploading, setIsUploading] = useState(false);
  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState(0);
  const [analysisLines, setAnalysisLines] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/");
    }
  }, [isLoaded, userId, router]);

  useEffect(() => {
    if (step === "analyzing") {
      let stepIndex = 0;
      const interval = setInterval(() => {
        if (stepIndex < ANALYSIS_STEPS.length) {
          setCurrentAnalysisStep(stepIndex);
          setAnalysisLines((prev) => [...prev, ANALYSIS_STEPS[stepIndex]]);
          stepIndex++;
        } else {
          clearInterval(interval);
        }
      }, 400);

      return () => clearInterval(interval);
    }
  }, [step]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [analysisLines]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 10MB.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.size > 10 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 10MB.");
        return;
      }
      setFile(droppedFile);
    }
  }, []);

  const handleAnalyze = async () => {
    if (inputMode === "file" && !file) {
      toast.error("Please upload a CV file");
      return;
    }
    if (inputMode === "link" && !cvLink) {
      toast.error("Please enter a CV link");
      return;
    }

    setStep("analyzing");
    setIsUploading(true);
    setAnalysisLines([]);
    setCurrentAnalysisStep(0);

    try {
      let formData: FormData;
      let response: Response;

      if (inputMode === "link") {
        formData = new FormData();
        formData.append("link", cvLink);
        response = await fetch("/api/cv-analyze", {
          method: "POST",
          body: formData,
        });
      } else {
        formData = new FormData();
        formData.append("file", file!);
        response = await fetch("/api/cv-analyze", {
          method: "POST",
          body: formData,
        });
      }

      const data = await response.json();

      setTimeout(() => {
        if (response.ok && data.analysis) {
          setAnalysis(data.analysis);
          setResumeId(data.resume?.id || null);
          setStep("results");
          toast.success("CV analyzed successfully!");
        } else {
          toast.error(data.error || "Failed to analyze CV");
          setStep("upload");
        }
        setIsUploading(false);
      }, 1500);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to analyze CV. Please try again.");
      setStep("upload");
      setIsUploading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !analysis) return;

    setIsAsking(true);
    setAnswer(null);

    try {
      const response = await fetch("/api/cv-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          analysis,
        }),
      });

      const data = await response.json();
      if (data.answer) {
        setAnswer(data.answer);
      }
    } catch {
      setAnswer("I'm having trouble answering that question. Please try again.");
    } finally {
      setIsAsking(false);
    }
  };

  const handleContinueToDashboard = () => {
    localStorage.setItem("onboardingComplete", "true");
    localStorage.setItem("cvAnalysisComplete", "true");
    if (resumeId) {
      localStorage.setItem("primaryResumeId", resumeId);
    }
    router.push("/dashboard");
  };

  const handleUpgrade = () => {
    localStorage.setItem("cvAnalysisComplete", "true");
    localStorage.setItem("pendingUpgrade", "cv_regeneration");
    router.push("/pricing");
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30", bar: "#4ade80" };
    if (score >= 65) return { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30", bar: "#fbbf24" };
    return { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", bar: "#f87171" };
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          <span className="mono text-sm text-zinc-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">CareerOS</span>
          </div>
          <UserButton />
        </div>
      </header>

      <main className="pt-24 pb-16 px-6">
        <div className="mx-auto max-w-3xl">
          {step === "upload" && (
            <div className="space-y-8 animate-fade-up">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
                  <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-sm text-purple-400">Free CV Analysis</span>
                </div>
                <h1 className="text-4xl font-bold text-white mb-3">
                  Let&apos;s Analyze Your CV
                </h1>
                <p className="text-zinc-400 max-w-lg mx-auto">
                  Upload your CV and get a detailed breakdown of what&apos;s working, 
                  what&apos;s not, and how to improve it. Completely free.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#14141f] p-8">
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setInputMode("file")}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      inputMode === "file"
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : "bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <svg className="h-4 w-4 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Upload File
                  </button>
                  <button
                    onClick={() => setInputMode("link")}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      inputMode === "link"
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : "bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <svg className="h-4 w-4 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Paste Link
                  </button>
                </div>

                {inputMode === "file" ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                      file
                        ? "border-purple-500/50 bg-purple-500/5"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    {file ? (
                      <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-purple-500/20 mx-auto flex items-center justify-center">
                          <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">{file.name}</p>
                          <p className="text-sm text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                          onClick={() => setFile(null)}
                          className="text-sm text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="h-12 w-12 rounded-xl bg-white/5 mx-auto flex items-center justify-center mb-4">
                          <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-white mb-2">Drop your CV here or click to browse</p>
                        <p className="text-sm text-zinc-500 mb-4">PDF, DOC, DOCX up to 10MB</p>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                          id="cv-upload"
                        />
                        <label
                          htmlFor="cv-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-sm text-white hover:bg-white/15 transition-colors cursor-pointer"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Choose File
                        </label>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <input
                        type="url"
                        value={cvLink}
                        onChange={(e) => setCvLink(e.target.value)}
                        placeholder="Paste your CV link (Google Drive, Dropbox, etc.)"
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-purple-500/50 focus:outline-none mono text-sm"
                      />
                    </div>
                    <p className="text-xs text-zinc-500">
                      Supported: Google Drive, Dropbox, OneDrive, or any public URL
                    </p>
                  </div>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={(inputMode === "file" && !file) || (inputMode === "link" && !cvLink) || isUploading}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-4 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Analyze My CV Free
                </button>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center gap-6 text-sm text-zinc-500">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Content analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Style & structure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>ATS score</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "analyzing" && (
            <div className="animate-fade-up">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
                  <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-sm text-purple-400">Agent analyzing</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Analyzing Your CV</h2>
                <p className="text-zinc-400">Our AI agent is working its magic...</p>
              </div>

              <div className="rounded-2xl border border-purple-500/20 bg-[#0d0d15] p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-800">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500/50" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                    <div className="h-3 w-3 rounded-full bg-green-500/50" />
                  </div>
                  <span className="mono text-xs text-zinc-500">careeros-agent ~ cv-analysis</span>
                </div>
                <div
                  ref={terminalRef}
                  className="h-[300px] overflow-y-auto font-mono text-sm"
                >
                  {analysisLines.map((line, i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <span className="text-purple-400">→</span>
                      <span className="text-zinc-300">{line}</span>
                      {i === analysisLines.length - 1 && (
                        <span className="h-4 w-2 bg-purple-400 animate-pulse ml-1" />
                      )}
                    </div>
                  ))}
                  {analysisLines.length < ANALYSIS_STEPS.length && (
                    <div className="flex items-center gap-2 py-1">
                      <span className="text-purple-400">→</span>
                      <span className="text-zinc-500">Processing...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {step === "results" && analysis && (
            <div className="space-y-6 animate-fade-up">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
                  <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-400">Analysis Complete</span>
                </div>
                <h1 className="text-4xl font-bold text-white mb-3">
                  Your CV Analysis
                </h1>
                <p className="text-zinc-400">
                  Here&apos;s what we found. You can ask questions or upgrade to get a fixed CV.
                </p>
              </div>

              <div className={`rounded-2xl border p-6 ${getScoreColor(analysis.overall.score).bg} ${getScoreColor(analysis.overall.score).border}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400 mb-1">Overall Score</p>
                    <p className={`text-4xl font-bold ${getScoreColor(analysis.overall.score).text}`}>
                      {analysis.overall.score}%
                    </p>
                    <p className="text-lg font-semibold text-white mt-1">{analysis.overall.verdict}</p>
                  </div>
                  <div className="h-24 w-24 rounded-full border-4 flex items-center justify-center"
                    style={{ 
                      borderColor: getScoreColor(analysis.overall.score).bar,
                    }}
                  >
                    <span className="text-3xl font-bold text-white">{analysis.overall.score}</span>
                  </div>
                </div>
                <p className="mt-4 text-zinc-300">{analysis.overall.summary}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "Content", data: analysis.content, icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                  { label: "Style", data: analysis.style, icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
                  { label: "Structure", data: analysis.structure, icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
                ].map(({ label, data, icon }) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-[#14141f] p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        label === "Content" ? "bg-purple-500/20" : label === "Style" ? "bg-cyan-500/20" : "bg-amber-500/20"
                      }`}>
                        <svg className={`h-4 w-4 ${
                          label === "Content" ? "text-purple-400" : label === "Style" ? "text-cyan-400" : "text-amber-400"
                        }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-zinc-400">{label}</span>
                          <span className={`text-lg font-bold ${getScoreColor(data.score).text}`}>{data.score}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden mt-2">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${data.score}%`,
                              backgroundColor: getScoreColor(data.score).bar,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
                  <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Issues Found
                  </h3>
                  <div className="space-y-2">
                    {[
                      ...analysis.content.issues,
                      ...analysis.style.issues,
                      ...analysis.structure.issues,
                    ].slice(0, 5).map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <span className="text-red-400 text-xs mt-0.5">•</span>
                        <span className="text-sm text-zinc-300">{issue}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
                  <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Strengths
                  </h3>
                  <div className="space-y-2">
                    {[
                      ...analysis.content.strengths,
                      ...analysis.style.strengths,
                      ...analysis.structure.strengths,
                    ].slice(0, 5).map((strength, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                        <span className="text-green-400 text-xs mt-0.5">✓</span>
                        <span className="text-sm text-zinc-300">{strength}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-purple-500/20 bg-[#14141f] p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Ask About Your CV
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
                      placeholder="e.g., How can I make my summary stronger?"
                      className="flex-1 px-4 py-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-purple-500/50 focus:outline-none mono text-sm"
                    />
                    <button
                      onClick={handleAskQuestion}
                      disabled={!question.trim() || isAsking}
                      className="px-6 py-3 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      {isAsking ? "..." : "Ask"}
                    </button>
                  </div>
                  {answer && (
                    <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <p className="text-sm text-zinc-300 leading-relaxed">{answer}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border-2 border-purple-500/30 bg-gradient-to-b from-purple-500/5 to-transparent p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">Get Your CV Professionally Fixed</h3>
                    <p className="text-sm text-zinc-400 mb-4">
                      Our AI will regenerate your CV, fixing all issues, optimizing for ATS, and formatting it perfectly. 
                      Download as PDF or Word.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleUpgrade}
                        className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-white font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Get Fixed CV - $9.99
                      </button>
                      <button
                        onClick={handleContinueToDashboard}
                        className="rounded-lg border border-white/10 px-6 py-3 text-zinc-400 hover:text-white hover:border-white/20 transition-colors"
                      >
                        Continue to Dashboard
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
