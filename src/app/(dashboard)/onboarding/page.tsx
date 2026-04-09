"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function OnboardingPage() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    headline: "",
    country: "Ghana",
    experience: "",
    desiredRole: "",
  });

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/");
    }
  }, [isLoaded, userId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = () => {
    localStorage.setItem("onboardingComplete", "true");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-amber-50">
      <nav className="border-b border-amber-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-800">
              <span className="text-sm font-bold text-white">C</span>
            </div>
            <span className="text-lg font-semibold text-emerald-900">CareerOS</span>
          </Link>
          <UserButton />
        </div>
      </nav>

      <div className="mx-auto max-w-xl px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    s <= step
                      ? "bg-emerald-800 text-white"
                      : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div className={`h-0.5 w-16 ${s < step ? "bg-emerald-800" : "bg-emerald-100"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-emerald-700/60">
            <span>Profile</span>
            <span className="pr-8">Experience</span>
            <span>Goals</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-emerald-950">Tell us about yourself</h2>
              <p className="mt-2 text-emerald-700/70">
                This helps us personalize your experience.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-emerald-800">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Kwame Asante"
                    className="mt-1 w-full rounded-lg border border-emerald-200 px-4 py-3 text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-800">
                    Professional Headline
                  </label>
                  <input
                    type="text"
                    name="headline"
                    value={formData.headline}
                    onChange={handleChange}
                    placeholder="e.g. Junior Software Developer"
                    className="mt-1 w-full rounded-lg border border-emerald-200 px-4 py-3 text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-800">Country</label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-emerald-200 px-4 py-3 text-emerald-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Ghana">Ghana</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="Kenya">Kenya</option>
                    <option value="South Africa">South Africa</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={!formData.fullName || !formData.headline}
                className="mt-6 w-full rounded-lg bg-emerald-800 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-emerald-950">Your experience level</h2>
              <p className="mt-2 text-emerald-700/70">
                This helps us recommend the right opportunities.
              </p>

              <div className="mt-6 space-y-3">
                {["Student / Just graduated", "0-2 years experience", "3-5 years experience", "5+ years experience"].map((exp) => (
                  <button
                    key={exp}
                    onClick={() => setFormData({ ...formData, experience: exp })}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      formData.experience === exp
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-emerald-200 hover:border-emerald-300"
                    }`}
                  >
                    <span className="font-medium text-emerald-900">{exp}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 rounded-lg border border-emerald-200 py-3 font-medium text-emerald-800 transition hover:bg-emerald-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!formData.experience}
                  className="flex-1 rounded-lg bg-emerald-800 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-emerald-950">What role are you targeting?</h2>
              <p className="mt-2 text-emerald-700/70">
                We&apos;ll prioritize jobs that match your goals.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-emerald-800">
                    Desired Role / Job Title
                  </label>
                  <input
                    type="text"
                    name="desiredRole"
                    value={formData.desiredRole}
                    onChange={handleChange}
                    placeholder="e.g. Frontend Developer, Data Analyst"
                    className="mt-1 w-full rounded-lg border border-emerald-200 px-4 py-3 text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 rounded-lg border border-emerald-200 py-3 font-medium text-emerald-800 transition hover:bg-emerald-50"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 rounded-lg bg-emerald-800 py-3 font-medium text-white transition hover:bg-emerald-700"
                >
                  Complete Setup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
