"use client";

import { useState } from "react";
import Link from "next/link";

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
  const [form, setForm] = useState({ company: "", name: "", email: "", role: "", hiringFor: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/employer-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-white">CareerOS</span>
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
            <span className="text-xs text-cyan-400 font-medium mono">Early access · Limited spots</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold font-display mb-4 leading-tight">
            Hire smarter.<br />
            <span className="gradient-text">Know fit before you interview.</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            CareerOS candidates have already self-screened against your job requirements.
            You get a ranked shortlist of people who know they fit — not just hopeful applicants.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Perks */}
          <div className="space-y-6">
            {PERKS.map((p) => (
              <div key={p.title} className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                or contact us for a team plan. First 10 employers on the waitlist get their first listing free.
              </p>
            </div>
          </div>

          {/* Waitlist form */}
          <div className="agent-card p-6">
            {status === "done" ? (
              <div className="text-center py-8">
                <div className="h-14 w-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">You&apos;re on the list.</h3>
                <p className="text-sm text-zinc-400">
                  We&apos;ll reach out personally when your employer dashboard is ready.
                  Expect early access within 2–4 weeks.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white mb-1">Join the employer waitlist</h2>
                <p className="text-sm text-zinc-500 mb-6">We&apos;ll contact you personally when access opens.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Your name *</label>
                      <input
                        required
                        className="agent-input w-full"
                        placeholder="Kwame Mensah"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">Company *</label>
                      <input
                        required
                        className="agent-input w-full"
                        placeholder="Acme Ghana Ltd"
                        value={form.company}
                        onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Work email *</label>
                    <input
                      required
                      type="email"
                      className="agent-input w-full"
                      placeholder="you@company.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Your role</label>
                    <input
                      className="agent-input w-full"
                      placeholder="Head of Talent, Founder, HR Manager…"
                      value={form.role}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">What roles are you hiring for?</label>
                    <textarea
                      rows={2}
                      className="agent-input w-full resize-none"
                      placeholder="e.g. Software engineers, product managers, data analysts…"
                      value={form.hiringFor}
                      onChange={(e) => setForm((f) => ({ ...f, hiringFor: e.target.value }))}
                    />
                  </div>

                  {status === "error" && (
                    <p className="text-xs text-red-400">Something went wrong. Email us at employers@careeros.live</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full agent-button-primary py-3"
                  >
                    {status === "loading" ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Submitting…
                      </span>
                    ) : (
                      "Request early access"
                    )}
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
