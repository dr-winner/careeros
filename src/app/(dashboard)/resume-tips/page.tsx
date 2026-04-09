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
      case "high": return "bg-red-100 text-red-700 border-red-200";
      case "medium": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
  };

  const suggestions = analyzeResume(selectedResume);

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="text-emerald-800">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-950">Resume Optimization</h1>
        <p className="mt-2 text-emerald-700/70">
          Get personalized suggestions to improve your resume.
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-xl bg-emerald-100"></div>
          <div className="h-64 rounded-xl bg-emerald-100"></div>
        </div>
      ) : resumes.length === 0 ? (
        <div className="rounded-xl border border-emerald-100 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-emerald-950">No Resume Uploaded</h3>
          <p className="mt-2 text-emerald-600">
            Upload your resume to get personalized optimization tips.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-emerald-800 px-4 py-2 text-white hover:bg-emerald-700"
          >
            Upload Resume
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-emerald-100 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-emerald-950">Uploaded Resume</h2>
                <p className="text-sm text-emerald-600">{selectedResume?.originalName}</p>
              </div>
              <select
                value={selectedResume?.id || ""}
                onChange={(e) => {
                  const resume = resumes.find(r => r.id === e.target.value);
                  setSelectedResume(resume || null);
                }}
                className="rounded-lg border border-emerald-200 px-4 py-2 text-emerald-800"
              >
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>{r.originalName}</option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-800">{resumes.find(r => r.id === selectedResume?.id)?.skills.length || 0}</p>
                <p className="text-sm text-emerald-600">Skills</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-800">{resumes.find(r => r.id === selectedResume?.id)?.experiences.length || 0}</p>
                <p className="text-sm text-amber-600">Experiences</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-4 text-center">
                <p className="text-2xl font-bold text-purple-800">{resumes.find(r => r.id === selectedResume?.id)?.education.length || 0}</p>
                <p className="text-sm text-purple-600">Education</p>
              </div>
              <div className="rounded-lg bg-stone-50 p-4 text-center">
                <p className="text-2xl font-bold text-stone-800">{suggestions.filter(s => s.priority === "high").length}</p>
                <p className="text-sm text-stone-600">Issues</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-emerald-950">Optimization Suggestions</h2>
            
            {suggestions.length === 0 ? (
              <p className="text-emerald-600">No suggestions at this time.</p>
            ) : (
              <div className="space-y-4">
                {suggestions.map((item, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border p-4 ${getPriorityColor(item.priority)}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.priority === "high" ? "bg-red-200 text-red-800" :
                        item.priority === "medium" ? "bg-amber-200 text-amber-800" :
                        "bg-emerald-200 text-emerald-800"
                      }`}>
                        {item.priority}
                      </span>
                      <div>
                        <p className="font-medium">{item.issue}</p>
                        <p className="mt-1 text-sm opacity-80">{item.suggestion}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-emerald-100 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-emerald-950">Best Practices Checklist</h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-2 font-medium text-emerald-800">Format & Structure</h3>
                <ul className="space-y-2 text-sm text-emerald-700">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500">✓</span>
                    Keep it to 1-2 pages
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500">✓</span>
                    Use consistent formatting
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500">✓</span>
                    Use a clean, professional layout
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500">✓</span>
                    Use standard fonts (Arial, Calibri)
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="mb-2 font-medium text-emerald-800">Content</h3>
                <ul className="space-y-2 text-sm text-emerald-700">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500">✓</span>
                    Tailor for each application
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500">✓</span>
                    Use keywords from job posting
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500">✓</span>
                    Quantify achievements
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500">✓</span>
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
