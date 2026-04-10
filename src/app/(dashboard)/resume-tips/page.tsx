"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

interface ResumeWithSkills {
  id: string;
  originalName: string;
  parsedText: string | null;
  skills: { skillName: string }[];
  experiences: { title: string; company: string | null }[];
  education: { institution: string; degree: string | null }[];
  createdAt: string;
}

export default function ResumeTipsPage() {
  const { userId, isLoaded } = useAuth();
  const [resumes, setResumes] = useState<ResumeWithSkills[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResume, setSelectedResume] = useState<ResumeWithSkills | null>(null);

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
        if (data.resumes?.length > 0) {
          setSelectedResume(data.resumes[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching resumes:", error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeResume = (resume: ResumeWithSkills | null) => {
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
        suggestion: "Add more relevant technical and soft skills. Include both hard skills (tools, languages) and soft skills (communication, leadership).",
        priority: "high",
      });
    }

    if (resume.experiences.length < 2) {
      suggestions.push({
        category: "Experience",
        issue: "Limited work experience entries",
        suggestion: "Include all relevant positions, even internships or part-time roles. Focus on achievements and measurable results.",
        priority: "medium",
      });
    }

    if (resume.education.length === 0) {
      suggestions.push({
        category: "Education",
        issue: "No education entries found",
        suggestion: "Add your educational background including degrees, certifications, and relevant coursework.",
        priority: "high",
      });
    }

    const hasActionVerbs = /^(Led|Managed|Developed|Created|Implemented|Increased|Reduced|Improved|Designed|Built|Analyzed)/.test(resume.parsedText || "");
    if (!hasActionVerbs) {
      suggestions.push({
        category: "Writing",
        issue: "Consider using action verbs",
        suggestion: "Start bullet points with strong action verbs like 'Led', 'Developed', 'Increased', 'Reduced', 'Implemented' to highlight achievements.",
        priority: "low",
      });
    }

    if (!(resume.parsedText || "").includes("@") && !(resume.parsedText || "").includes("gmail") && !(resume.parsedText || "").includes("yahoo")) {
      suggestions.push({
        category: "Contact",
        issue: "Contact information may be missing",
        suggestion: "Ensure your email address is clearly visible at the top of your resume.",
        priority: "high",
      });
    }

    const hasNumbers = /\d+%|\d+\s*(years?|months?)/.test(resume.parsedText || "");
    if (!hasNumbers) {
      suggestions.push({
        category: "Achievements",
        issue: "No quantified achievements found",
        suggestion: "Add numbers to your achievements: 'Increased sales by 25%', 'Managed a team of 10', 'Reduced processing time by 50%'.",
        priority: "medium",
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
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default: return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    }
  };

  const suggestions = analyzeResume(selectedResume);

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Resume Optimization</h1>
        <p className="mt-2 text-slate-400">
          Get personalized suggestions to improve your resume.
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-xl glass-card"></div>
          <div className="h-64 rounded-xl glass-card"></div>
        </div>
      ) : resumes.length === 0 ? (
        <div className="rounded-xl glass-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">No Resume Uploaded</h3>
          <p className="mt-2 text-slate-400">
            Upload your resume to get personalized optimization tips.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-white hover:opacity-90"
          >
            Upload Resume
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Uploaded Resume</h2>
                <p className="text-sm text-slate-400">{selectedResume?.originalName}</p>
              </div>
              <select
                value={selectedResume?.id || ""}
                onChange={(e) => {
                  const resume = resumes.find(r => r.id === e.target.value);
                  setSelectedResume(resume || null);
                }}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white"
              >
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>{r.originalName}</option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-emerald-500/10 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{resumes.find(r => r.id === selectedResume?.id)?.skills.length || 0}</p>
                <p className="text-sm text-slate-400">Skills</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{resumes.find(r => r.id === selectedResume?.id)?.experiences.length || 0}</p>
                <p className="text-sm text-slate-400">Experiences</p>
              </div>
              <div className="rounded-lg bg-purple-500/10 p-4 text-center">
                <p className="text-2xl font-bold text-purple-400">{resumes.find(r => r.id === selectedResume?.id)?.education.length || 0}</p>
                <p className="text-sm text-slate-400">Education</p>
              </div>
              <div className="rounded-lg bg-slate-700 p-4 text-center">
                <p className="text-2xl font-bold text-slate-300">{suggestions.filter(s => s.priority === "high").length}</p>
                <p className="text-sm text-slate-400">Issues</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl glass-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Optimization Suggestions</h2>
            
            {suggestions.length === 0 ? (
              <p className="text-slate-400">No suggestions at this time.</p>
            ) : (
              <div className="space-y-4">
                {suggestions.map((item, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border p-4 ${getPriorityColor(item.priority)}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.priority === "high" ? "bg-red-500/30 text-red-300" :
                        item.priority === "medium" ? "bg-amber-500/30 text-amber-300" :
                        "bg-emerald-500/30 text-emerald-300"
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
            )}
          </div>

          <div className="rounded-xl glass-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Best Practices Checklist</h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-2 font-medium text-slate-300">Format & Structure</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    Keep it to 1-2 pages
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    Use consistent formatting
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    Use a clean, professional layout
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    Use standard fonts (Arial, Calibri)
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="mb-2 font-medium text-slate-300">Content</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    Tailor for each application
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    Use keywords from job posting
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    Quantify achievements
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    Proofread for errors
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
