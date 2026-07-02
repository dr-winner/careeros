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
    momoNumber: "",
    momoChannel: 0,
    smsAlerts: false,
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
          momoNumber: data.user?.momoNumber || "",
          momoChannel: data.user?.momoChannel || 0,
          smsAlerts: data.user?.smsAlerts || false,
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
        body: JSON.stringify({
          ...formData,
          momoNumber: formData.momoNumber || null,
          momoChannel: formData.momoChannel || null,
        }),
      });

      if (response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          walletName?: string | null;
          rewardsPaid?: number;
        };
        if (data.walletName) {
          toast.success(`Profile updated! Wallet verified: ${data.walletName}`);
        } else {
          toast.success("Profile updated!");
        }
        if (data.rewardsPaid) {
          toast.success(`${data.rewardsPaid} pending referral reward${data.rewardsPaid > 1 ? "s" : ""} sent to your MoMo!`);
        }
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

  const displayEmail = profile?.email || user?.primaryEmailAddress?.emailAddress || "";
  const displayName = formData.fullName || user?.fullName || "Your Name";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold gradient-text">Profile Settings</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Manage your career identity</p>
      </div>

      {/* Avatar / name hero */}
      <div className="animate-fade-up delay-100 rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
            <span className="text-xl font-bold text-white">{initials || "?"}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{displayName}</h2>
            <p className="text-sm text-zinc-400">{displayEmail}</p>
            {formData.headline && <p className="mono text-xs text-purple-400 mt-1">{formData.headline}</p>}
          </div>
        </div>
      </div>

      <div className="animate-fade-up delay-200 grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Account section */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-6">
          <p className="section-label">Account</p>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-zinc-400">Email</label>
              <input
                type="email"
                value={displayEmail}
                disabled
                className="agent-input opacity-60 cursor-not-allowed"
              />
              <p className="mono text-xs text-zinc-600 mt-1">Email cannot be changed here</p>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-zinc-400">Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Enter your full name"
                className="agent-input"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-zinc-400">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+233 XX XXX XXXX"
                className="agent-input"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-zinc-400">Country</label>
              <select
                value={PROFILE_COUNTRIES.includes(formData.country as (typeof PROFILE_COUNTRIES)[number]) ? formData.country : "Other"}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="agent-input cursor-pointer"
              >
                {PROFILE_COUNTRIES.map((c) => (
                  <option key={c} value={c} className="bg-[#0d0d18]">{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Professional section */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-6">
          <p className="section-label">Professional Info</p>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-zinc-400">Professional Headline</label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                placeholder="e.g., Software Developer | React & Node.js"
                className="agent-input"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-zinc-400">
                Field / Specialisation
                <span className="text-zinc-600 font-normal ml-1">— your professional area</span>
              </label>
              <select
                value={formData.roleType}
                onChange={(e) => setFormData({ ...formData, roleType: e.target.value })}
                className="agent-input cursor-pointer"
              >
                <option value="" className="bg-[#0d0d18]">Select your field…</option>
                {ROLE_TYPE_GROUPS.map((group) => (
                  <optgroup key={group.group} label={group.group} className="bg-[#0d0d18] text-zinc-400">
                    {group.roles.map((r) => (
                      <option key={r} value={r} className="bg-[#0d0d18] text-white">{r}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-zinc-400">Experience Level</label>
              <select
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                className="agent-input cursor-pointer"
              >
                <option value="" className="bg-[#0d0d18]">Select experience</option>
                {EXPERIENCE_LEVELS.map((e) => (
                  <option key={e} value={e} className="bg-[#0d0d18]">{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-zinc-400">
                Target Job Title
                <span className="text-zinc-600 font-normal ml-1">— the specific role you&apos;re after</span>
              </label>
              <input
                type="text"
                value={formData.desiredRole}
                onChange={(e) => setFormData({ ...formData, desiredRole: e.target.value })}
                placeholder="e.g., Cloud Security Engineer, Senior DevOps Lead…"
                className="agent-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payouts & notifications */}
      <div className="animate-fade-up delay-200 rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-6">
        <p className="section-label">Payouts &amp; Notifications</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-zinc-400">
                Mobile Money Number
                <span className="text-zinc-600 font-normal ml-1">— for referral cash rewards</span>
              </label>
              <input
                type="tel"
                value={formData.momoNumber}
                onChange={(e) => setFormData({ ...formData, momoNumber: e.target.value.trim() })}
                placeholder="e.g. 0241234567"
                className="agent-input"
              />
              <p className="mono text-xs text-zinc-600 mt-1">
                Earn GHS 5 per friend who goes Premium — paid instantly via Moolre
              </p>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-zinc-400">Network</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 1, label: "MTN" },
                  { id: 6, label: "Telecel" },
                  { id: 7, label: "AirtelTigo" },
                ].map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, momoChannel: n.id })}
                    className={`rounded-lg px-2 py-2.5 mono text-xs transition-all border ${
                      formData.momoChannel === n.id
                        ? "border-purple-500/50 bg-purple-500/15 text-purple-300"
                        : "border-white/[0.08] bg-white/[0.03] text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-zinc-400">SMS Job Alerts</label>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, smsAlerts: !formData.smsAlerts })}
              className={`w-full rounded-xl border p-4 text-left transition-all ${
                formData.smsAlerts
                  ? "border-green-500/30 bg-green-500/[0.06]"
                  : "border-white/[0.08] bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${formData.smsAlerts ? "text-green-400" : "text-zinc-300"}`}>
                    {formData.smsAlerts ? "SMS alerts on" : "SMS alerts off"}
                  </p>
                  <p className="mono text-xs text-zinc-600 mt-1">
                    Get your daily job matches by text — uses your phone number above
                  </p>
                </div>
                <div className={`h-6 w-11 rounded-full p-0.5 transition-colors flex-shrink-0 ${
                  formData.smsAlerts ? "bg-green-500/60" : "bg-zinc-700"
                }`}>
                  <div className={`h-5 w-5 rounded-full bg-white transition-transform ${
                    formData.smsAlerts ? "translate-x-5" : ""
                  }`} />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Sticky save button */}
      <div className="animate-fade-up delay-300 sticky bottom-4">
        <button
          onClick={saveProfile}
          disabled={saving}
          className="agent-button-primary w-full py-3.5 text-base font-semibold press-scale shadow-xl shadow-purple-500/20"
        >
          {saving ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
