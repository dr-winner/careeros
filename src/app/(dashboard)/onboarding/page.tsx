"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser, UserButton } from "@clerk/nextjs";
import { toast } from "sonner";
import Image from "next/image";

const POPULAR_SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Python",
  "Java",
  "SQL",
  "PostgreSQL",
  "AWS",
  "Docker",
  "Git",
  "Figma",
  "Excel",
  "PowerPoint",
  "Communication",
  "Leadership",
];

const ROLE_SUGGESTIONS = [
  "Software Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Analyst",
  "Data Scientist",
  "UX/UI Designer",
  "Product Manager",
  "DevOps Engineer",
  "Business Analyst",
  "Marketing Manager",
  "Sales Representative",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    fullName: "",
    headline: "",
    country: "Ghana",
    experience: "",
    desiredRole: "",
    roleType: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/");
    }
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName:
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.firstName || prev.fullName,
      }));
    }
  }, [isLoaded, userId, router, user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      localStorage.setItem("onboardingComplete", "true");
      toast.success("Profile created! Let's get started.");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save your profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { num: 1, label: "Profile" },
    { num: 2, label: "Skills" },
    { num: 3, label: "Experience" },
    { num: 4, label: "Goals" },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Image src="/cs_logo.png" alt="CareerOS" width={40} height={40} />
            <span className="text-lg font-bold text-white">CareerOS</span>
          </div>
          <UserButton />
        </div>
      </nav>

      <div className="mx-auto max-w-xl px-6 py-12">
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    s.num < step
                      ? "bg-emerald-500 text-white"
                      : s.num === step
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/25"
                        : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {s.num < step ? "✓" : s.num}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`h-1 w-12 ${s.num < step ? "bg-emerald-500" : "bg-slate-800"}`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between text-sm font-medium">
            {steps.map((s) => (
              <span
                key={s.num}
                className={s.num === step ? "text-white" : "text-slate-500"}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl glass-card p-8">
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-white">
                Welcome to CareerOS! 👋
              </h2>
              <p className="mt-2 text-slate-400">
                Let&apos;s set up your profile in a few quick steps.
              </p>

              <div className="mt-8 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Kwame Asante"
                    className="mt-1 w-full rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Professional Headline
                  </label>
                  <input
                    type="text"
                    name="headline"
                    value={formData.headline}
                    onChange={handleChange}
                    placeholder="e.g. Junior Software Developer at TechHub"
                    className="mt-1 w-full rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Country
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Ghana">🇬🇭 Ghana</option>
                    <option value="Nigeria">🇳🇬 Nigeria</option>
                    <option value="Kenya">🇰🇪 Kenya</option>
                    <option value="South Africa">🇿🇦 South Africa</option>
                    <option value="Other">🌍 Other</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={!formData.fullName || !formData.headline}
                className="mt-8 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 py-4 font-semibold text-white shadow-lg shadow-emerald-500/25 hover:opacity-90 disabled:opacity-50"
              >
                Let&apos;s Go →
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-white">
                What are your skills?
              </h2>
              <p className="mt-2 text-slate-400">
                Select the skills you have. We&apos;ll match you with relevant
                jobs.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {POPULAR_SKILLS.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      selectedSkills.includes(skill)
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-lg"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm text-slate-500">
                {selectedSkills.length} skill
                {selectedSkills.length !== 1 ? "s" : ""} selected
              </p>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 rounded-xl border-2 border-slate-700 py-4 font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 py-4 font-semibold text-white shadow-lg shadow-emerald-500/25 hover:opacity-90"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-white">
                Experience Level
              </h2>
              <p className="mt-2 text-slate-400">
                Where are you in your career journey?
              </p>

              <div className="mt-6 space-y-3">
                {[
                  {
                    value: "Student / Just graduated",
                    icon: "🎓",
                    desc: "Still in school or recently graduated",
                  },
                  {
                    value: "0-2 years experience",
                    icon: "🌱",
                    desc: "Early career, building skills",
                  },
                  {
                    value: "3-5 years experience",
                    icon: "🚀",
                    desc: "Mid-level, ready for bigger challenges",
                  },
                  {
                    value: "5+ years experience",
                    icon: "⭐",
                    desc: "Senior level, leadership roles",
                  },
                ].map((exp) => (
                  <button
                    key={exp.value}
                    onClick={() =>
                      setFormData({ ...formData, experience: exp.value })
                    }
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      formData.experience === exp.value
                        ? "border-emerald-500 bg-emerald-500/10 shadow-lg"
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{exp.icon}</span>
                      <div>
                        <span className="block font-semibold text-white">
                          {exp.value}
                        </span>
                        <span className="text-sm text-slate-400">
                          {exp.desc}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 rounded-xl border-2 border-slate-700 py-4 font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!formData.experience}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 py-4 font-semibold text-white shadow-lg shadow-emerald-500/25 hover:opacity-90 disabled:opacity-50"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-white">
                What&apos;s your target role?
              </h2>
              <p className="mt-2 text-slate-400">
                We&apos;ll prioritize jobs that match your career goals.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {ROLE_SUGGESTIONS.map((role) => (
                  <button
                    key={role}
                    onClick={() =>
                      setFormData({ ...formData, desiredRole: role })
                    }
                    className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                      formData.desiredRole === role
                        ? "border-emerald-500 bg-emerald-500/10 text-white"
                        : "border-slate-700 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-300">
                  Or type your own
                </label>
                <input
                  type="text"
                  name="desiredRole"
                  value={formData.desiredRole}
                  onChange={handleChange}
                  placeholder="e.g. Senior Product Manager"
                  className="mt-1 w-full rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 rounded-xl border-2 border-slate-700 py-4 font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isLoading || !formData.desiredRole}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 py-4 font-semibold text-white shadow-lg shadow-emerald-500/25 hover:opacity-90 disabled:opacity-50"
                >
                  {isLoading ? "Setting up..." : "Complete Setup 🎉"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
