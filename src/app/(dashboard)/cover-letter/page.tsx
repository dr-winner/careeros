"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";
import { AiOutageNotice, AiStatusBadge, useAiStatus } from "@/components/ai-status";

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
  const posthog = usePostHog();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    recipientName: "",
    companyName: "",
    jobTitle: "",
    jobDescription: "",
  });

  const [coverLetter, setCoverLetter] = useState("");
  // "template" means the AI call failed and the user is looking at a generic
  // starter — they must be told, or they'll send it as-is.
  const [letterSource, setLetterSource] = useState<"ai" | "template" | null>(null);
  const aiStatus = useAiStatus();

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
        const role = (data.user?.desiredRole || data.user?.headline || "").trim();
        if (role) {
          setFormData((prev) => (prev.jobTitle ? prev : { ...prev, jobTitle: role }));
        }
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
        setLetterSource("ai");
        posthog?.capture("cover_letter_generated", {
          job_title: formData.jobTitle,
          company_name: formData.companyName,
          has_job_description: !!formData.jobDescription,
          method: "ai",
        });
        toast.success("Cover letter generated!");
      } else if (response.status === 402) {
        toast.error("Monthly AI credits used up — here's a starter template instead. Upgrade to Premium for unlimited AI letters.");
        generateTemplateCoverLetter();
      } else {
        toast.error("Our AI is unavailable right now — here's a starter template to edit. No credit was used.");
        generateTemplateCoverLetter();
      }
    } catch {
      toast.error("Couldn't reach the AI — here's a starter template to edit.");
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

    posthog?.capture("cover_letter_generated", {
      job_title: formData.jobTitle,
      company_name: formData.companyName,
      has_job_description: !!formData.jobDescription,
      method: "template",
    });
    setCoverLetter(letter);
    setLetterSource("template");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(coverLetter);
    posthog?.capture("cover_letter_copied", {
      job_title: formData.jobTitle,
      company_name: formData.companyName,
    });
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Plain .txt keeps the letter editable in any phone notes app or Word;
  // most applicants paste it into an email or a portal form anyway.
  const downloadLetter = () => {
    const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    const filename = `Cover-Letter-${safe(formData.companyName) || "company"}-${safe(formData.jobTitle) || "role"}.txt`;
    const blob = new Blob([coverLetter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    posthog?.capture("cover_letter_downloaded", {
      job_title: formData.jobTitle,
      company_name: formData.companyName,
    });
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
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Page header */}
      <div className="animate-fade-up flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Cover Letter</h1>
          <p className="text-sm text-zinc-400 mt-0.5">AI-powered letter generator</p>
        </div>
        <AiStatusBadge status={aiStatus.status} />
      </div>

      <AiOutageNotice
        status={aiStatus.status}
        reasons={aiStatus.reasons}
        message="Generating now gives you a starter template to edit instead of a tailored letter."
      />

      <div className="grid gap-5 lg:grid-cols-2 animate-fade-up delay-100">
        {/* Left: form */}
        <div className="space-y-4">
          {/* Job details card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] overflow-hidden">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
            <div className="p-5">
              <p className="section-label">Job Details</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Recipient Name</label>
                  <input
                    type="text"
                    placeholder="Hiring Manager"
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    className="agent-input w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">
                    Company Name <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Company you're applying to"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="agent-input w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">
                    Job Title <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={profile?.desiredRole || profile?.headline || "Role you're applying for"}
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="agent-input w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Job Description</label>
                  <textarea
                    rows={4}
                    placeholder="Paste job description for a tailored letter..."
                    value={formData.jobDescription}
                    onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                    className="agent-input w-full resize-none"
                  />
                </div>
                <button
                  onClick={generateCoverLetter}
                  disabled={generating}
                  className="agent-button-primary w-full justify-center press-scale"
                >
                  {generating ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Letter
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Profile snapshot */}
          {profile && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
              <p className="section-label">Your Profile</p>
              <div className="space-y-2.5">
                {[
                  { label: "Name", value: profile.fullName },
                  { label: "Email", value: profile.email },
                  { label: "Headline", value: profile.headline || profile.experience },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3">
                    <span className="mono text-xs text-zinc-500">{row.label}</span>
                    <span className="text-xs text-zinc-300 truncate max-w-[180px]">
                      {row.value || <span className="text-zinc-600">Not set</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
            <p className="section-label">Tips</p>
            <ul className="space-y-2">
              {[
                "Address to a specific person when possible",
                "Keep it to one page",
                "Customize for each application",
                "Highlight relevant achievements",
                "Show enthusiasm for the company",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <svg className="h-3.5 w-3.5 text-cyan-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="mono text-xs text-zinc-400">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: output */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] overflow-hidden h-fit">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="section-label mb-0">Generated Letter</p>
              {coverLetter && (
                <div className="flex items-center gap-2">
                <button
                  onClick={downloadLetter}
                  className="press-scale flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.06]"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={copyToClipboard}
                  className={`press-scale flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    copied
                      ? "border-green-500/30 bg-green-500/10 text-green-400"
                      : "border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
                </div>
              )}
            </div>

            {coverLetter && letterSource === "template" && (
              <div className="mb-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.08] px-3 py-2 text-xs text-amber-200">
                <span className="font-semibold">Starter template, not AI-written.</span> It is generic on purpose — replace the middle
                paragraphs with one real achievement and why you want this specific role before sending.
              </div>
            )}

            {coverLetter ? (
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 max-h-[600px] overflow-y-auto">
                {coverLetter.split("\n\n").map((paragraph, i) =>
                  paragraph.trim() ? (
                    <p key={i} className="text-sm text-zinc-200 leading-relaxed mb-4 last:mb-0 whitespace-pre-wrap">
                      {paragraph.trim()}
                    </p>
                  ) : null
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-white/[0.06]">
                <div className="empty-state-icon mb-0">
                  <svg className="h-7 w-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-zinc-500 mt-4">Fill in the details and generate</p>
                <p className="mono text-xs text-zinc-600 mt-1">Your letter will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
