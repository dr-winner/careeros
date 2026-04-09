"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { toast } from "sonner";
import Image from "next/image";

const POPULAR_SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java",
  "SQL", "PostgreSQL", "AWS", "Docker", "Git", "Figma",
  "Excel", "PowerPoint", "Communication", "Leadership"
];

const ROLE_SUGGESTIONS = [
  "Software Developer", "Frontend Developer", "Backend Developer",
  "Full Stack Developer", "Data Analyst", "Data Scientist",
  "UX/UI Designer", "Product Manager", "DevOps Engineer",
  "Business Analyst", "Marketing Manager", "Sales Representative"
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
      setFormData(prev => ({
        ...prev,
        fullName: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.firstName || prev.fullName,
      }));
    }
  }, [isLoaded, userId, router, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
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
          experience: selectedSkills.length > 0 ? selectedSkills.join(", ") : formData.experience,
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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <nav className="border-b border-amber-200/50 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Image src="/cs_logo.png" alt="CareerOS" width={40} height={40} />
            <span className="text-lg font-bold text-emerald-900">CareerOS</span>
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
                      ? "bg-emerald-600 text-white"
                      : s.num === step
                      ? "bg-emerald-800 text-white shadow-lg shadow-emerald-200"
                      : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  {s.num < step ? "✓" : s.num}
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-1 w-12 ${s.num < step ? "bg-emerald-600" : "bg-emerald-100"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between text-sm font-medium">
            {steps.map(s => (
              <span
                key={s.num}
                className={s.num === step ? "text-emerald-800" : "text-emerald-500"}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-lg">
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-emerald-950">Welcome to CareerOS! 👋</h2>
              <p className="mt-2 text-emerald-700">
                Let's set up your profile in a few quick steps.
              </p>

              <div className="mt-8 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-emerald-800">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Kwame Asante"
                    className="mt-1 w-full rounded-xl border-2 border-emerald-200 px-4 py-3 text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-800">Professional Headline</label>
                  <input
                    type="text"
                    name="headline"
                    value={formData.headline}
                    onChange={handleChange}
                    placeholder="e.g. Junior Software Developer at TechHub"
                    className="mt-1 w-full rounded-xl border-2 border-emerald-200 px-4 py-3 text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-800">Country</label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border-2 border-emerald-200 px-4 py-3 text-emerald-900 focus:border-emerald-500 focus:outline-none"
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
                className="mt-8 w-full rounded-xl bg-emerald-800 py-4 font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:opacity-50"
              >
                Let's Go →
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-emerald-950">What are your skills?</h2>
              <p className="mt-2 text-emerald-700">
                Select the skills you have. We'll match you with relevant jobs.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {POPULAR_SKILLS.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      selectedSkills.includes(skill)
                        ? "bg-emerald-600 text-white shadow-lg"
                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm text-emerald-600">
                {selectedSkills.length} skill{selectedSkills.length !== 1 ? "s" : ""} selected
              </p>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 rounded-xl border-2 border-emerald-200 py-4 font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 rounded-xl bg-emerald-800 py-4 font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-emerald-950">Experience Level</h2>
              <p className="mt-2 text-emerald-700">
                Where are you in your career journey?
              </p>

              <div className="mt-6 space-y-3">
                {[
                  { value: "Student / Just graduated", icon: "🎓", desc: "Still in school or recently graduated" },
                  { value: "0-2 years experience", icon: "🌱", desc: "Early career, building skills" },
                  { value: "3-5 years experience", icon: "🚀", desc: "Mid-level, ready for bigger challenges" },
                  { value: "5+ years experience", icon: "⭐", desc: "Senior level, leadership roles" },
                ].map((exp) => (
                  <button
                    key={exp.value}
                    onClick={() => setFormData({ ...formData, experience: exp.value })}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      formData.experience === exp.value
                        ? "border-emerald-500 bg-emerald-50 shadow-lg"
                        : "border-emerald-200 hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{exp.icon}</span>
                      <div>
                        <span className="block font-semibold text-emerald-900">{exp.value}</span>
                        <span className="text-sm text-emerald-600">{exp.desc}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 rounded-xl border-2 border-emerald-200 py-4 font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!formData.experience}
                  className="flex-1 rounded-xl bg-emerald-800 py-4 font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-emerald-950">What's your target role?</h2>
              <p className="mt-2 text-emerald-700">
                We'll prioritize jobs that match your career goals.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {ROLE_SUGGESTIONS.map((role) => (
                  <button
                    key={role}
                    onClick={() => setFormData({ ...formData, desiredRole: role })}
                    className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                      formData.desiredRole === role
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-emerald-200 text-emerald-700 hover:border-emerald-300"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-emerald-800">Or type your own</label>
                <input
                  type="text"
                  name="desiredRole"
                  value={formData.desiredRole}
                  onChange={handleChange}
                  placeholder="e.g. Senior Product Manager"
                  className="mt-1 w-full rounded-xl border-2 border-emerald-200 px-4 py-3 text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 rounded-xl border-2 border-emerald-200 py-4 font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isLoading || !formData.desiredRole}
                  className="flex-1 rounded-xl bg-emerald-800 py-4 font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:opacity-50"
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
