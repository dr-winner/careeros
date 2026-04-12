"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

interface UserProfile {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  headline: string | null;
  experience: string | null;
  desiredRole: string | null;
}

export default function CoverLetterPage() {
  const { userId, isLoaded } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [formData, setFormData] = useState({
    recipientName: "",
    companyName: "",
    jobTitle: "",
    jobDescription: "",
  });

  const [coverLetter, setCoverLetter] = useState("");

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateCoverLetter = async () => {
    if (!formData.jobTitle || !formData.companyName) {
      toast.error("Fill in job title and company name");
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch("/api/ai/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: formData.jobTitle,
          companyName: formData.companyName,
          jobDescription: formData.jobDescription,
          recipientName: formData.recipientName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.coverLetter) {
        setCoverLetter(data.coverLetter);
        toast.success("Cover letter generated!");
      } else if (data.error === "AI not configured") {
        toast.error("AI not configured. Using template.");
        generateTemplateCoverLetter();
      } else {
        toast.error(data.error || "Failed to generate");
        generateTemplateCoverLetter();
      }
    } catch {
      toast.error("Failed to generate cover letter");
      generateTemplateCoverLetter();
    } finally {
      setGenerating(false);
    }
  };

  const generateTemplateCoverLetter = () => {
    const name = profile?.fullName || "Your Name";
    const headline = profile?.headline || profile?.experience || "professional";
    const phone = profile?.phone || "";
    const email = profile?.email || "";

    const letter = `${name}
${phone}
${email}

${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

${formData.recipientName ? `Dear ${formData.recipientName},\n\n` : ""}I am writing to express my interest in the ${formData.jobTitle} position at ${formData.companyName}. With my background as a ${headline}, I am confident in my ability to contribute effectively to your team.

${formData.jobDescription ? `I was excited to see the requirements for this role. My experience has prepared me well to excel in these areas.` : "I am drawn to this opportunity because of your company's commitment to excellence."}

Throughout my career, I have developed strong skills in problem-solving and collaboration. I am committed to continuous learning and staying current with industry best practices.

I would welcome the opportunity to discuss how my skills and experience align with your needs. I am available for an interview at your earliest convenience and can be reached at ${phone || email}.

Thank you for considering my application. I look forward to hearing from you soon.

Sincerely,
${name}`;

    setCoverLetter(letter);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(coverLetter);
    toast.success("Copied!");
  };

  if (!isLoaded || loading) {
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
    <div className="max-w-5xl mx-auto">
      <div className="agent-card p-6 mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Cover Letter</h1>
             <p className="text-sm text-zinc-500">AI-powered letter generator</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="agent-card p-5">
            <span className="text-sm font-medium text-zinc-400">Job Details</span>
            <div className="mt-4 space-y-4">
              <div>
                 <label className="text-sm text-zinc-400 mb-1 block">Recipient Name</label>
                <input
                  type="text"
                  placeholder="Hiring Manager"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  className="agent-input w-full"
                />
              </div>
              <div>
                 <label className="text-sm text-zinc-400 mb-1 block">Company Name *</label>
                <input
                  type="text"
                  placeholder="Acme Corporation"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="agent-input w-full"
                />
              </div>
              <div>
                 <label className="text-sm text-zinc-400 mb-1 block">Job Title *</label>
                <input
                  type="text"
                  placeholder="Software Engineer"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="agent-input w-full"
                />
              </div>
              <div>
                 <label className="text-sm text-zinc-400 mb-1 block">Job Description</label>
                <textarea
                  rows={4}
                  placeholder="Paste job description for tailored letter..."
                  value={formData.jobDescription}
                  onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                  className="agent-input w-full resize-none"
                />
              </div>
              <button
                onClick={generateCoverLetter}
                disabled={generating}
                className="agent-button-primary w-full justify-center py-3"
              >
                {generating ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    generating...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    generate()
                  </>
                )}
              </button>
            </div>
          </div>

          {profile && (
          <div className="agent-card p-5">
            <span className="text-sm font-medium text-zinc-400">Your Profile</span>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between">
                   <span className="text-sm text-zinc-500">Name</span>
                  <span className="text-sm text-zinc-400">{profile.fullName || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-sm text-zinc-500">Email</span>
                  <span className="text-sm text-zinc-400">{profile.email || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-sm text-zinc-500">Headline</span>
                  <span className="text-sm text-zinc-400 truncate max-w-[150px]">{profile.headline || profile.experience || "Not set"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="agent-card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-zinc-400">Generated Letter</span>
              {coverLetter && (
                <button onClick={copyToClipboard} className="mono text-xs text-purple-400 hover:text-purple-300">
                  copy
                </button>
              )}
            </div>

            {coverLetter ? (
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <pre className="whitespace-pre-wrap text-xs text-zinc-400 font-mono">
                  {coverLetter}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 rounded-lg border-2 border-dashed border-zinc-800">
                 <p className="text-sm text-zinc-600">Fill in the details and click generate</p>
              </div>
            )}
          </div>

          <div className="agent-card p-5">
            <span className="text-sm font-medium text-zinc-400">Tips</span>
            <ul className="mt-3 space-y-2">
              {[
                "Address to a specific person when possible",
                "Keep it to one page",
                "Customize for each application",
                "Highlight relevant achievements",
                "Show enthusiasm for the company",
              ].map((item, i) => (
                <li key={i} className="mono text-xs text-zinc-500 flex items-center gap-2">
                  <span className="text-cyan-400">→</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
