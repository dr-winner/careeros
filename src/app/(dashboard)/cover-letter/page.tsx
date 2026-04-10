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
      toast.error("Please fill in job title and company name");
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
        toast.error("AI not configured. Using template instead.");
        generateTemplateCoverLetter();
      } else {
        toast.error(data.error || "Failed to generate cover letter");
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
    toast.success("Copied to clipboard!");
  };

  if (!isLoaded || loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Cover Letter Generator</h1>
        <p className="mt-2 text-slate-400">
          Create a professional cover letter tailored to your target role.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-xl glass-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Job Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">
                  Recipient Name (optional)
                </label>
                <input
                  type="text"
                  placeholder="Hiring Manager"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">
                  Company Name *
                </label>
                <input
                  type="text"
                  placeholder="Acme Corporation"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">
                  Job Title *
                </label>
                <input
                  type="text"
                  placeholder="Software Engineer"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">
                  Job Description (optional)
                </label>
                <textarea
                  rows={5}
                  placeholder="Paste the job description here for a more tailored letter..."
                  value={formData.jobDescription}
                  onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500/20 resize-none"
                />
              </div>

              <button
                onClick={generateCoverLetter}
                disabled={generating}
                className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 py-3 text-center font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate Cover Letter"}
              </button>
            </div>
          </div>

          {profile && (
            <div className="rounded-xl glass-card p-6">
              <h2 className="mb-2 text-lg font-semibold text-white">Your Profile</h2>
              <p className="text-sm text-slate-400">
                Used to personalize your cover letter
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <p><span className="font-medium text-slate-300">Name:</span> {profile.fullName || "Not set"}</p>
                <p><span className="font-medium text-slate-300">Email:</span> {profile.email || "Not set"}</p>
                <p><span className="font-medium text-slate-300">Headline:</span> {profile.headline || profile.experience || "Not set"}</p>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="rounded-xl glass-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your Cover Letter</h2>
              {coverLetter && (
                <button
                  onClick={copyToClipboard}
                  className="text-sm text-emerald-400 hover:text-emerald-300"
                >
                  Copy
                </button>
              )}
            </div>

            {coverLetter ? (
              <div className="rounded-lg bg-slate-800 p-6">
                <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans">
                  {coverLetter}
                </pre>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-slate-700">
                <p className="text-slate-500">
                  Fill in the details and click generate
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl glass-card p-4">
            <h3 className="font-semibold text-white">Tips for a Great Cover Letter</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-400">
              <li>• Address it to a specific person when possible</li>
              <li>• Keep it to one page</li>
              <li>• Customize for each application</li>
              <li>• Highlight relevant achievements</li>
              <li>• Show enthusiasm for the company</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
