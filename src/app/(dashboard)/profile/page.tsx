"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { EXPERIENCE_LEVELS, PROFILE_COUNTRIES, ROLE_TYPE_GROUPS } from "@/lib/user-profile-options";

interface UserProfile {
  id: string;
  clerkId: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  roleType: string | null;
  headline: string | null;
  experience: string | null;
  desiredRole: string | null;
}

export default function ProfilePage() {
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    country: "Ghana",
    roleType: "",
    headline: "",
    experience: "",
    desiredRole: "",
  });

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
        setFormData({
          fullName: data.user?.fullName || "",
          phone: data.user?.phone || "",
          country: data.user?.country || "Ghana",
          roleType: data.user?.roleType || "",
          headline: data.user?.headline || "",
          experience: data.user?.experience || "",
          desiredRole: data.user?.desiredRole || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Profile updated!");
        await fetchProfile();
      } else {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(
          typeof data.error === "string" ? data.error : "Failed to update profile",
        );
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
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

  const inputClass = "w-full rounded-lg border border-white/10 bg-[#0d0d15] px-4 py-3 text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all";
  const labelClass = "block mb-2 text-sm font-medium text-zinc-400";
  const selectClass = "w-full rounded-lg border border-white/10 bg-[#0d0d15] px-4 py-3 text-white focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#14141f] p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Profile Settings</h1>
            <p className="text-sm text-zinc-500">Manage your settings</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="rounded-2xl border border-white/10 bg-[#14141f] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={profile?.email || user?.primaryEmailAddress?.emailAddress || ""}
                disabled
                className={`${inputClass} opacity-60`}
              />
              <p className="mono text-xs text-zinc-600 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Enter your full name"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+233 XX XXX XXXX"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <select
                value={PROFILE_COUNTRIES.includes(formData.country as (typeof PROFILE_COUNTRIES)[number]) ? formData.country : "Other"}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className={selectClass}
              >
                {PROFILE_COUNTRIES.map((c) => (
                  <option key={c} value={c} className="bg-[#0d0d15]">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#14141f] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Professional Info</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Professional Headline</label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                placeholder="e.g., Software Developer | React & Node.js"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Field / Specialisation
                <span className="text-zinc-600 font-normal ml-1">— your professional area</span>
              </label>
              <select
                value={formData.roleType}
                onChange={(e) => setFormData({ ...formData, roleType: e.target.value })}
                className={selectClass}
              >
                <option value="" className="bg-[#0d0d15]">Select your field…</option>
                {ROLE_TYPE_GROUPS.map((group) => (
                  <optgroup key={group.group} label={group.group} className="bg-[#0d0d15] text-zinc-400">
                    {group.roles.map((r) => (
                      <option key={r} value={r} className="bg-[#0d0d15] text-white">{r}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Experience Level</label>
              <select
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                className={selectClass}
              >
                <option value="" className="bg-[#0d0d15]">Select experience</option>
                {EXPERIENCE_LEVELS.map((e) => (
                  <option key={e} value={e} className="bg-[#0d0d15]">{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Target Job Title
                <span className="text-zinc-600 font-normal ml-1">— the specific role you&apos;re after</span>
              </label>
              <input
                type="text"
                value={formData.desiredRole}
                onChange={(e) => setFormData({ ...formData, desiredRole: e.target.value })}
                placeholder="e.g., Cloud Security Engineer, Senior DevOps Lead…"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={saveProfile}
        disabled={saving}
        className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-center font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>

    </div>
  );
}
