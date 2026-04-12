"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { toast } from "sonner";

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

const COUNTRIES = ["Ghana", "Nigeria", "Kenya", "South Africa", "Other"];
const ROLE_TYPES = ["Developer", "Designer", "Data/Analytics", "Marketing", "Sales", "Operations", "HR", "Finance", "Other"];
const EXPERIENCE_LEVELS = ["0-1 years", "1-3 years", "3-5 years", "5-10 years", "10+ years"];

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
        fetchProfile();
      } else {
        toast.error("Failed to update profile");
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
    <div className="max-w-xl mx-auto space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#14141f] p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Profile Settings</h1>
            <p className="mono text-xs text-zinc-500">user_configuration</p>
          </div>
        </div>
      </div>

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
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className={selectClass}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c} className="bg-[#0d0d15]">{c}</option>
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
            <label className={labelClass}>Role Type</label>
            <select
              value={formData.roleType}
              onChange={(e) => setFormData({ ...formData, roleType: e.target.value })}
              className={selectClass}
            >
              <option value="" className="bg-[#0d0d15]">Select role type</option>
              {ROLE_TYPES.map((r) => (
                <option key={r} value={r} className="bg-[#0d0d15]">{r}</option>
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
            <label className={labelClass}>Desired Role</label>
            <input
              type="text"
              value={formData.desiredRole}
              onChange={(e) => setFormData({ ...formData, desiredRole: e.target.value })}
              placeholder="e.g., Senior Software Engineer"
              className={inputClass}
            />
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
