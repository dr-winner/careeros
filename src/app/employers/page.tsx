"use client";

// Force cache invalidation reload
import { useState } from "react";
import Link from "next/link";
import Logo from "@/app/components/logo";

const PERKS = [
  {
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Pre-screened candidates",
    body: "Every applicant has already run a fit analysis against your job. You see their score before they see you.",
  },
  {
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    title: "Skill-matched shortlists",
    body: "Get a ranked list of candidates whose skills actually match your requirements — not just keyword stuffers.",
  },
  {
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    title: "Ghana & Africa talent pool",
    body: "Access a growing pool of job-ready candidates across Ghana, Nigeria, Kenya, and beyond.",
  },
  {
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    title: "Real analytics",
    body: "See how many candidates ran your job through CareerOS, their average fit score, and what skills are scarce.",
  },
];

export default function EmployersPage() {
  const [jobForm, setJobForm] = useState({
    title: "",
    companyName: "",
    location: "Accra, Ghana",
    workMode: "Hybrid",
    seniorityLevel: "Mid-Level",
    employmentType: "Full-time",
    applicationUrl: "",
    description: "",
    skills: "",
    employerName: "",
    employerEmail: "",
  });
  const [jobStatus, setJobStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJobStatus("loading");
    try {
      const res = await fetch("/api/jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobForm),
      });
      setJobStatus(res.ok ? "done" : "error");
    } catch {
      setJobStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <Logo size="sm" variant="full" />
          <span className="text-xs text-zinc-500 ml-1">for Employers</span>
        </Link>
        <Link href="/dashboard" className="agent-button text-sm px-4 py-2">
          Job Seekers →
        </Link>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs text-cyan-400 font-medium mono">Early access · Pilot live</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold font-display mb-4 leading-tight">
            Hire smarter.<br />
            <span className="gradient-text">Know fit before you interview.</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            CareerOS candidates have already self-screened against your job requirements.
            Post a listing directly to let candidates auto-analyze their CV fit and apply.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Perks */}
          <div className="space-y-6">
            {PERKS.map((p) => (
              <div key={p.title} className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center flex-shrink-0">
                  <svg className="h-5 w-5 text-[#8b5cf6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={p.icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{p.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{p.body}</p>
                </div>
              </div>
            ))}

            <div className="agent-card p-5 border-cyan-500/20 mt-8">
              <p className="text-sm text-zinc-400 leading-relaxed">
                <span className="text-cyan-400 font-semibold">Pilot pricing:</span> GHS 500 per job listing,
                or contact us for a team plan. First 10 employers get their first listing completely free.
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div className="agent-card p-6">
            {jobStatus === "done" ? (
              <div className="text-center py-8">
                <div className="h-14 w-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Job Published Live! 🚀</h3>
                <p className="text-sm text-zinc-400 mb-6">
                  Your job opening is now active on CareerOS. Job seekers can search for it, perform resume fit-matching analyses, and apply directly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setJobForm({
                      title: "",
                      companyName: "",
                      location: "Accra, Ghana",
                      workMode: "Hybrid",
                      seniorityLevel: "Mid-Level",
                      employmentType: "Full-time",
                      applicationUrl: "",
                      description: "",
                      skills: "",
                      employerName: "",
                      employerEmail: "",
                    });
                    setJobStatus("idle");
                  }}
                  className="agent-button px-4 py-2 text-sm text-zinc-300 hover:text-white"
                >
                  Post another job
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white mb-1">List an active opening</h2>
                <p className="text-sm text-zinc-500 mb-6">Publish a role directly to the CareerOS network.</p>

                <form onSubmit={handleJobSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Job Title *</label>
                      <input
                        required
                        className="agent-input w-full"
                        placeholder="Senior Software Engineer"
                        value={jobForm.title}
                        onChange={(e) => setJobForm((f) => ({ ...f, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Company Name *</label>
                      <input
                        required
                        className="agent-input w-full"
                        placeholder="Acme West Africa"
                        value={jobForm.companyName}
                        onChange={(e) => setJobForm((f) => ({ ...f, companyName: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Location *</label>
                      <input
                        required
                        className="agent-input w-full"
                        placeholder="Accra, Ghana"
                        value={jobForm.location}
                        onChange={(e) => setJobForm((f) => ({ ...f, location: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Work Mode *</label>
                      <select
                        className="agent-input w-full bg-[#0a0a0f] border-white/10"
                        value={jobForm.workMode}
                        onChange={(e) => setJobForm((f) => ({ ...f, workMode: e.target.value }))}
                      >
                        <option value="Hybrid">Hybrid</option>
                        <option value="Remote">Remote</option>
                        <option value="On-site">On-site</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Seniority Level *</label>
                      <select
                        className="agent-input w-full bg-[#0a0a0f] border-white/10"
                        value={jobForm.seniorityLevel}
                        onChange={(e) => setJobForm((f) => ({ ...f, seniorityLevel: e.target.value }))}
                      >
                        <option value="Mid-Level">Mid-Level</option>
                        <option value="Entry-Level">Entry-Level</option>
                        <option value="Senior">Senior</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Employment Type *</label>
                      <select
                        className="agent-input w-full bg-[#0a0a0f] border-white/10"
                        value={jobForm.employmentType}
                        onChange={(e) => setJobForm((f) => ({ ...f, employmentType: e.target.value }))}
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Application Link (URL) *</label>
                    <input
                      required
                      type="url"
                      className="agent-input w-full"
                      placeholder="https://careers.acme.com/jobs/apply"
                      value={jobForm.applicationUrl}
                      onChange={(e) => setJobForm((f) => ({ ...f, applicationUrl: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Key Skills (comma-separated)</label>
                    <input
                      className="agent-input w-full"
                      placeholder="React, TypeScript, Node.js, REST APIs"
                      value={jobForm.skills}
                      onChange={(e) => setJobForm((f) => ({ ...f, skills: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Job Description *</label>
                    <textarea
                      required
                      rows={4}
                      className="agent-input w-full resize-none"
                      placeholder="Describe the responsibilities, qualifications, and benefits..."
                      value={jobForm.description}
                      onChange={(e) => setJobForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>

                  <div className="border-t border-white/5 pt-4 mt-2">
                    <p className="text-xs text-zinc-400 font-semibold mb-3 mono">YOUR CONTACT INFO (INTERNAL USE)</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1.5">Your Name *</label>
                        <input
                          required
                          className="agent-input w-full"
                          placeholder="John Doe"
                          value={jobForm.employerName}
                          onChange={(e) => setJobForm((f) => ({ ...f, employerName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1.5">Work Email *</label>
                        <input
                          required
                          type="email"
                          className="agent-input w-full"
                          placeholder="john@acme.com"
                          value={jobForm.employerEmail}
                          onChange={(e) => setJobForm((f) => ({ ...f, employerEmail: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {jobStatus === "error" && (
                    <p className="text-xs text-red-400">Failed to submit. Please check that the application link is valid.</p>
                  )}

                  <button
                    type="submit"
                    disabled={jobStatus === "loading"}
                    className="w-full agent-button-primary py-3"
                  >
                    {jobStatus === "loading" ? "Publishing listing..." : "Publish Job Listing"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
