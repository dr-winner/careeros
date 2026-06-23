"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

const STEPS = [
  { id: "welcome", title: "Welcome", icon: "👋" },
  { id: "profile", title: "Your Profile", icon: "👤" },
  { id: "cv", title: "Upload CV", icon: "📄" },
  { id: "preferences", title: "Preferences", icon: "⚙️" },
  { id: "alerts", title: "Job Alerts", icon: "🔔" },
];

const WORK_MODES = ["Remote", "Hybrid", "On-site"];
const EXPERIENCE_LEVELS = ["Entry Level", "Mid Level", "Senior", "Lead", "Manager", "Director"];
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance"];

interface ProfileData {
  headline: string;
  experience: string;
  desiredRole: string;
  country: string;
}

interface PreferencesData {
  workMode: string[];
  jobType: string[];
  remoteOnly: boolean;
}

interface AlertsData {
  enabled: boolean;
  frequency: string;
  keywords: string;
  location: string;
}

export default function GuidedOnboarding() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const [profile, setProfile] = useState<ProfileData>({
    headline: "",
    experience: "",
    desiredRole: "",
    country: "Ghana",
  });

  const [preferences, setPreferences] = useState<PreferencesData>({
    workMode: ["Remote"],
    jobType: ["Full-time"],
    remoteOnly: false,
  });

  const [alerts, setAlerts] = useState<AlertsData>({
    enabled: true,
    frequency: "daily",
    keywords: "",
    location: "",
  });

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/sign-in");
    }
  }, [isLoaded, userId, router]);

  const handleNext = async () => {
    if (currentStep === 0) {
      setCurrentStep(1);
      return;
    }

    if (currentStep === 1) {
      if (!profile.headline.trim()) {
        toast.error("Please add a headline");
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      await saveOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveOnboarding = async () => {
    setIsSubmitting(true);
    try {
      if (profile.headline || profile.experience || profile.desiredRole) {
        await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        });
      }

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
      }

      if (alerts.enabled && alerts.keywords) {
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

      await fetch("/api/user/onboarding", { method: "POST" });
      localStorage.setItem("onboardingComplete", "true");
      toast.success("You're all set!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const skipStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.includes("pdf") || droppedFile?.name.match(/\.(docx?|pdf)$/i)) {
      if (droppedFile.size > 10 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 10MB.");
        return;
      }
      setFile(droppedFile);
    } else {
      toast.error("Please upload a PDF or Word document");
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Let&apos;s Get You Set Up</h1>
          <p className="text-zinc-500 mt-2">Just a few quick steps to personalize your experience</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  idx < currentStep
                    ? "bg-purple-500 text-white"
                    : idx === currentStep
                    ? "bg-purple-500/20 border-2 border-purple-500 text-purple-400"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {idx < currentStep ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{step.icon}</span>
                )}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${idx < currentStep ? "bg-purple-500" : "bg-zinc-800"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-[#14141f] rounded-2xl border border-white/10 p-8">
          {currentStep === 0 && (
            <div className="space-y-6 animate-fade-up">
              <div className="text-center">
                <div className="text-5xl mb-4">👋</div>
                <h2 className="text-2xl font-bold text-white mb-2">Hey, welcome to CareerOS!</h2>
                <p className="text-zinc-400">
                  I&apos;m Winner, the founder. I built this because I know how exhausting job searching can be. 
                  Let me help you find the right fit, not just any job.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">AI-Powered Match Scores</h3>
                    <p className="text-zinc-500 text-sm">See how well you fit a job before you apply</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Smart Job Alerts</h3>
                    <p className="text-zinc-500 text-sm">Get notified when matching jobs are posted</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Application Tracking</h3>
                    <p className="text-zinc-500 text-sm">Keep track of every application you submit</p>
                  </div>
                </div>
              </div>

              <p className="text-center text-zinc-500 text-sm">
                This takes about 2 minutes. You can skip any step you want.
              </p>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-up">
              <div className="text-center mb-8">
                <div className="text-4xl mb-3">👤</div>
                <h2 className="text-xl font-bold text-white mb-2">Tell us about yourself</h2>
                <p className="text-zinc-500">This helps us suggest the right jobs for you</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    What&apos;s your professional headline? <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={profile.headline}
                    onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                    placeholder="e.g., Full Stack Developer with 5 years experience"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-purple-500/50 focus:outline-none mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Your experience level</label>
                  <select
                    value={profile.experience}
                    onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-white focus:border-purple-500/50 focus:outline-none mono text-sm"
                  >
                    <option value="">Select experience level</option>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">What role are you looking for?</label>
                  <input
                    type="text"
                    value={profile.desiredRole}
                    onChange={(e) => setProfile({ ...profile, desiredRole: e.target.value })}
                    placeholder="e.g., Software Engineer, Data Scientist"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-purple-500/50 focus:outline-none mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Your country</label>
                  <select
                    value={profile.country}
                    onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-white focus:border-purple-500/50 focus:outline-none mono text-sm"
                  >
                    <option value="South Africa">South Africa</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="Kenya">Kenya</option>
                    <option value="Ghana">Ghana</option>
                    <option value="Global">Global / Remote Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-up">
              <div className="text-center mb-8">
                <div className="text-4xl mb-3">📄</div>
                <h2 className="text-xl font-bold text-white mb-2">Upload your CV</h2>
                <p className="text-zinc-500">We&apos;ll analyze it and find jobs that match your skills</p>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
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

              <p className="text-center text-zinc-500 text-sm">
                Don&apos;t have a CV handy? You can skip this and upload later.
              </p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-up">
              <div className="text-center mb-8">
                <div className="text-4xl mb-3">⚙️</div>
                <h2 className="text-xl font-bold text-white mb-2">Your preferences</h2>
                <p className="text-zinc-500">What kind of opportunities are you looking for?</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-zinc-400 mb-3">Work mode preference</label>
                  <div className="flex flex-wrap gap-2">
                    {WORK_MODES.map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          const current = preferences.workMode;
                          const updated = current.includes(mode)
                            ? current.filter((m) => m !== mode)
                            : [...current, mode];
                          setPreferences({ ...preferences, workMode: updated });
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          preferences.workMode.includes(mode)
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                            : "bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-3">Job type</label>
                  <div className="flex flex-wrap gap-2">
                    {JOB_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          const current = preferences.jobType;
                          const updated = current.includes(type)
                            ? current.filter((t) => t !== type)
                            : [...current, type];
                          setPreferences({ ...preferences, jobType: updated });
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          preferences.jobType.includes(type)
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : "bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <div>
                    <p className="text-white font-medium">Remote-only jobs</p>
                    <p className="text-zinc-500 text-sm">Only show jobs that can be done remotely</p>
                  </div>
                  <button
                    onClick={() => setPreferences({ ...preferences, remoteOnly: !preferences.remoteOnly })}
                    className={`h-8 w-14 rounded-full transition-colors ${
                      preferences.remoteOnly ? "bg-purple-500" : "bg-zinc-700"
                    }`}
                  >
                    <div className={`h-6 w-6 rounded-full bg-white mx-1 transition-transform ${
                      preferences.remoteOnly ? "translate-x-5" : ""
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-up">
              <div className="text-center mb-8">
                <div className="text-4xl mb-3">🔔</div>
                <h2 className="text-xl font-bold text-white mb-2">Set up job alerts</h2>
                <p className="text-zinc-500">Get notified when matching jobs are posted</p>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div>
                  <p className="text-white font-medium">Enable job alerts</p>
                  <p className="text-zinc-500 text-sm">We&apos;ll email you when matching jobs are found</p>
                </div>
                <button
                  onClick={() => setAlerts({ ...alerts, enabled: !alerts.enabled })}
                  className={`h-8 w-14 rounded-full transition-colors ${
                    alerts.enabled ? "bg-purple-500" : "bg-zinc-700"
                  }`}
                >
                  <div className={`h-6 w-6 rounded-full bg-white mx-1 transition-transform ${
                    alerts.enabled ? "translate-x-5" : ""
                  }`} />
                </button>
              </div>

              {alerts.enabled && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">What keywords should we search for?</label>
                    <input
                      type="text"
                      value={alerts.keywords}
                      onChange={(e) => setAlerts({ ...alerts, keywords: e.target.value })}
                      placeholder="e.g., Software Engineer, JavaScript, React"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-purple-500/50 focus:outline-none mono text-sm"
                    />
                    <p className="text-zinc-600 text-xs mt-2">Separate keywords with commas</p>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Location (optional)</label>
                    <input
                      type="text"
                      value={alerts.location}
                      onChange={(e) => setAlerts({ ...alerts, location: e.target.value })}
                      placeholder="e.g., South Africa, Remote, Lagos"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-purple-500/50 focus:outline-none mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">How often?</label>
                    <select
                      value={alerts.frequency}
                      onChange={(e) => setAlerts({ ...alerts, frequency: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-white focus:border-purple-500/50 focus:outline-none mono text-sm"
                    >
                      <option value="daily">Daily digest</option>
                      <option value="weekly">Weekly summary</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            <button
              onClick={currentStep === 0 ? () => router.push("/dashboard") : handleBack}
              className="px-4 py-2 text-zinc-500 hover:text-white transition-colors"
            >
              {currentStep === 0 ? "Skip for now" : "Back"}
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={skipStep}
                className="px-4 py-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
              >
                Skip this step
              </button>
              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saving...
                  </>
                ) : currentStep === STEPS.length - 1 ? (
                  <>
                    Let&apos;s Go
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
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

        <p className="text-center text-zinc-600 text-sm mt-6">
          You can update all of these settings later in your profile.
        </p>
      </div>
    </div>
  );
}
