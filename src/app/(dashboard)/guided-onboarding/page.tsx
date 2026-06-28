"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { PROFILE_COUNTRIES, ROLE_TYPE_GROUPS, EXPERIENCE_LEVELS } from "@/lib/user-profile-options";

const WORK_MODES = ["Remote", "Hybrid", "On-site", "Contract"];
const JOB_TYPES = ["Full-time", "Part-time", "Freelance", "Internship"];

interface ProfileData {
  headline: string;
  experience: string;
  desiredRole: string;
  country: string;
}

interface PreferencesData {
  workModes: string[];
  jobTypes: string[];
  remoteOnly: boolean;
}

interface AlertsData {
  enabled: boolean;
  frequency: string;
  keywords: string;
  location: string;
}

const STEP_ICONS = [
  // Welcome
  "M13 10V3L4 14h7v7l9-11h-7z",
  // Profile
  "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  // CV
  "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  // Preferences
  "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
  // Alerts
  "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
];

const STEP_LABELS = ["Welcome", "Profile", "Upload CV", "Preferences", "Job Alerts"];

export default function GuidedOnboarding() {
  const router = useRouter();
  const { userId } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
    headline: "",
    experience: "",
    desiredRole: "",
    country: "Ghana",
  });

  const [preferences, setPreferences] = useState<PreferencesData>({
    workModes: ["Remote"],
    jobTypes: ["Full-time"],
    remoteOnly: false,
  });

  const [alerts, setAlerts] = useState<AlertsData>({
    enabled: true,
    frequency: "daily",
    keywords: "",
    location: "",
  });

  const completeOnboarding = async () => {
    await fetch("/api/user/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: { workModes: preferences.workModes, jobTypes: preferences.jobTypes, remoteOnly: preferences.remoteOnly } }),
    });
    localStorage.setItem("onboardingComplete", "true");
  };

  const skipAll = async () => {
    await completeOnboarding().catch(() => {});
    router.push("/dashboard");
  };

  const handleNext = async () => {
    if (currentStep === 0) { setCurrentStep(1); return; }

    if (currentStep === 1) {
      if (!profile.headline.trim()) { toast.error("Please add a headline"); return; }
      try {
        await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        });
      } catch { /* non-blocking */ }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        try { await fetch("/api/upload", { method: "POST", body: formData }); } catch { /* non-blocking */ }
      }
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) { setCurrentStep(4); return; }

    if (currentStep === 4) { await saveAndFinish(); }
  };

  const saveAndFinish = async () => {
    if (!userId) return;
    setIsSubmitting(true);
    try {
      if (alerts.enabled && alerts.keywords.trim()) {
        await fetch("/api/searches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "My Job Alert",
            searchQuery: alerts.keywords,
            location: alerts.location,
            alertEnabled: true,
            alertFrequency: alerts.frequency,
          }),
        });
      }
      await completeOnboarding();
      toast.success("You're all set!");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("File too large. Max 10 MB."); return; }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.type.includes("pdf") && !f.name.match(/\.(docx?|pdf)$/i)) {
      toast.error("Please upload a PDF or Word document"); return;
    }
    if (f.size > 10 * 1024 * 1024) { toast.error("File too large. Max 10 MB."); return; }
    setFile(f);
  };

  const toggleChip = <T extends string>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  return (
    /* Full-screen overlay — covers the dashboard layout */
    <div className="fixed inset-0 z-[100] bg-[#0a0a0f] overflow-y-auto">
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[150px] animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[120px] animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        {/* Logo */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-base font-bold text-white">CareerOS</span>
          </div>
          <button onClick={skipAll} className="mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Skip setup
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="mono text-[10px] text-zinc-500 uppercase tracking-widest">{STEP_LABELS[currentStep]}</p>
            <p className="mono text-[10px] text-zinc-600">{currentStep + 1} / {STEP_LABELS.length}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {STEP_LABELS.map((_, idx) => (
              <div
                key={idx}
                className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${
                  idx <= currentStep ? "bg-purple-500" : "bg-white/[0.08]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] overflow-hidden">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
          <div className="p-8">

            {/* Step 0: Welcome */}
            {currentStep === 0 && (
              <div className="space-y-6 animate-fade-up">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-5">
                    <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Welcome to CareerOS</h2>
                  <p className="text-zinc-400 leading-relaxed max-w-md mx-auto">
                    I built this to take the guesswork out of job searching.
                    A few quick steps and we&apos;re ready to find you the right fit.
                  </p>
                </div>
                <div className="space-y-3">
                  {[
                    { color: "purple", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", title: "AI Match Scores", desc: "See your fit before you apply" },
                    { color: "cyan", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", title: "Smart Job Alerts", desc: "Get notified when matching roles are posted" },
                    { color: "green", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", title: "Application Tracking", desc: "Every application, one place" },
                  ].map((item) => (
                    <div key={item.title} className={`flex items-start gap-4 p-4 rounded-xl border ${
                      item.color === "purple" ? "bg-purple-500/5 border-purple-500/15" :
                      item.color === "cyan" ? "bg-cyan-500/5 border-cyan-500/15" :
                      "bg-green-500/5 border-green-500/15"
                    }`}>
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        item.color === "purple" ? "bg-purple-500/20" :
                        item.color === "cyan" ? "bg-cyan-500/20" : "bg-green-500/20"
                      }`}>
                        <svg className={`h-4 w-4 ${item.color === "purple" ? "text-purple-400" : item.color === "cyan" ? "text-cyan-400" : "text-green-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-center mono text-xs text-zinc-600">Takes about 2 minutes · skip any step</p>
              </div>
            )}

            {/* Step 1: Profile */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-fade-up">
                <div className="text-center mb-6">
                  <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={STEP_ICONS[1]} />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">Tell us about yourself</h2>
                  <p className="text-sm text-zinc-500">Helps us surface the right opportunities</p>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">
                    Professional headline <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={profile.headline}
                    onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                    placeholder="e.g. Full-Stack Developer · 4 years experience"
                    className="agent-input w-full"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1.5 block">Experience level</label>
                    <select
                      value={profile.experience}
                      onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
                      className="agent-input w-full cursor-pointer"
                    >
                      <option value="">Select level</option>
                      {EXPERIENCE_LEVELS.map((l) => (
                        <option key={l} value={l} className="bg-[#0d0d18]">{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1.5 block">Country</label>
                    <select
                      value={profile.country}
                      onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                      className="agent-input w-full cursor-pointer"
                    >
                      {PROFILE_COUNTRIES.map((c) => (
                        <option key={c} value={c} className="bg-[#0d0d18]">{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Target role</label>
                  <select
                    value={profile.desiredRole}
                    onChange={(e) => setProfile({ ...profile, desiredRole: e.target.value })}
                    className="agent-input w-full cursor-pointer"
                  >
                    <option value="">Select a role</option>
                    {ROLE_TYPE_GROUPS.map((group) => (
                      <optgroup key={group.group} label={group.group}>
                        {group.roles.map((role) => (
                          <option key={role} value={role} className="bg-[#0d0d18]">{role}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Upload CV */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-fade-up">
                <div className="text-center mb-6">
                  <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={STEP_ICONS[2]} />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">Upload your CV</h2>
                  <p className="text-sm text-zinc-500">We&apos;ll analyze it and match you with better jobs</p>
                </div>

                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                    isDragging ? "border-purple-500/60 bg-purple-500/5" :
                    file ? "border-green-500/40 bg-green-500/5" :
                    "border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  {file ? (
                    <div className="space-y-3">
                      <div className="h-12 w-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto">
                        <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-white">{file.name}</p>
                      <p className="mono text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button onClick={() => setFile(null)} className="mono text-xs text-red-400/60 hover:text-red-400 transition-colors">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="h-12 w-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                        <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-sm text-zinc-300 mb-1">Drop your CV here</p>
                      <p className="mono text-xs text-zinc-600 mb-4">PDF · DOC · DOCX · max 10 MB</p>
                      <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" id="cv-onboarding" />
                      <label htmlFor="cv-onboarding" className="agent-button cursor-pointer">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Browse files
                      </label>
                    </>
                  )}
                </div>
                <p className="text-center mono text-xs text-zinc-600">You can always upload from the CVs page later</p>
              </div>
            )}

            {/* Step 3: Preferences */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-fade-up">
                <div className="text-center mb-6">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={STEP_ICONS[3]} />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">Your preferences</h2>
                  <p className="text-sm text-zinc-500">What kind of opportunities are you looking for?</p>
                </div>

                <div>
                  <p className="section-label">Work mode</p>
                  <div className="flex flex-wrap gap-2">
                    {WORK_MODES.map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setPreferences({ ...preferences, workModes: toggleChip(preferences.workModes, mode) })}
                        className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all press-scale ${
                          preferences.workModes.includes(mode)
                            ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                            : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="section-label">Job type</p>
                  <div className="flex flex-wrap gap-2">
                    {JOB_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => setPreferences({ ...preferences, jobTypes: toggleChip(preferences.jobTypes, type) })}
                        className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all press-scale ${
                          preferences.jobTypes.includes(type)
                            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                            : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div>
                    <p className="text-sm font-medium text-white">Remote-only jobs</p>
                    <p className="mono text-xs text-zinc-500 mt-0.5">Only show roles that can be done remotely</p>
                  </div>
                  <button
                    onClick={() => setPreferences({ ...preferences, remoteOnly: !preferences.remoteOnly })}
                    className={`relative h-6 w-11 rounded-full transition-colors ${preferences.remoteOnly ? "bg-purple-500" : "bg-zinc-700"}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${preferences.remoteOnly ? "translate-x-5" : ""}`} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Job Alerts */}
            {currentStep === 4 && (
              <div className="space-y-5 animate-fade-up">
                <div className="text-center mb-6">
                  <div className="h-12 w-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={STEP_ICONS[4]} />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">Set up job alerts</h2>
                  <p className="text-sm text-zinc-500">Get notified when matching jobs are posted</p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-purple-500/5 border border-purple-500/15">
                  <div>
                    <p className="text-sm font-medium text-white">Enable job alerts</p>
                    <p className="mono text-xs text-zinc-500 mt-0.5">Email you when matching jobs are found</p>
                  </div>
                  <button
                    onClick={() => setAlerts({ ...alerts, enabled: !alerts.enabled })}
                    className={`relative h-6 w-11 rounded-full transition-colors ${alerts.enabled ? "bg-purple-500" : "bg-zinc-700"}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${alerts.enabled ? "translate-x-5" : ""}`} />
                  </button>
                </div>

                {alerts.enabled && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Search keywords</label>
                      <input
                        type="text"
                        value={alerts.keywords}
                        onChange={(e) => setAlerts({ ...alerts, keywords: e.target.value })}
                        placeholder="e.g. Software Engineer, React, Node.js"
                        className="agent-input w-full"
                      />
                      <p className="mono text-[10px] text-zinc-600 mt-1">Separate with commas</p>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Location (optional)</label>
                      <input
                        type="text"
                        value={alerts.location}
                        onChange={(e) => setAlerts({ ...alerts, location: e.target.value })}
                        placeholder="e.g. Lagos, Remote, South Africa"
                        className="agent-input w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Frequency</label>
                      <select
                        value={alerts.frequency}
                        onChange={(e) => setAlerts({ ...alerts, frequency: e.target.value })}
                        className="agent-input w-full cursor-pointer"
                      >
                        <option value="daily" className="bg-[#0d0d18]">Daily digest</option>
                        <option value="weekly" className="bg-[#0d0d18]">Weekly summary</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer nav */}
          <div className="flex items-center justify-between px-8 py-5 border-t border-white/[0.06] bg-[#131320]/40">
            <button
              onClick={() => currentStep === 0 ? skipAll() : setCurrentStep(currentStep - 1)}
              className="mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {currentStep === 0 ? "Skip setup" : "Back"}
            </button>

            <div className="flex items-center gap-3">
              {currentStep > 0 && currentStep < STEP_LABELS.length - 1 && (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Skip this step
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="agent-button-primary press-scale disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saving...
                  </>
                ) : currentStep === STEP_LABELS.length - 1 ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    Let&apos;s Go
                  </>
                ) : (
                  <>
                    Next
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center mono text-xs text-zinc-700 mt-6">
          All settings can be changed later in your profile
        </p>
      </div>
    </div>
  );
}
