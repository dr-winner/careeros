"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

export default function ReferralPage() {
  const { userId, isLoaded } = useAuth();
  const [referralUrl, setReferralUrl] = useState("");
  const [refereeEmail, setRefereeEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchReferral();
    }
  }, [userId]);

  const fetchReferral = async () => {
    try {
      const response = await fetch("/api/referrals");
      if (response.ok) {
        const data = await response.json();
        setReferralUrl(data.referralUrl);
      }
    } catch (error) {
      console.error("Error fetching referral:", error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const sendInvite = async () => {
    if (!refereeEmail) {
      toast.error("Please enter an email address");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refereeEmail }),
      });

      if (response.ok) {
        toast.success("Invitation sent!");
        setRefereeEmail("");
      } else {
        toast.error("Failed to send invitation");
      }
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Refer Friends</h1>
        <p className="mt-2 text-slate-400">
          Share CareerOS with friends and help them land their dream jobs.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl glass-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Your Referral Link</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralUrl}
              readOnly
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-slate-400"
            />
            <button
              onClick={copyToClipboard}
              className={`rounded-lg px-4 py-2 font-medium ${
                copied
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-gradient-to-r from-emerald-500 to-emerald-400 text-white hover:opacity-90"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Share this link with friends. They&apos;ll get priority access when they sign up!
          </p>
        </div>

        <div className="rounded-xl glass-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Send an Invite</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">
                Friend&apos;s Email
              </label>
              <input
                type="email"
                value={refereeEmail}
                onChange={(e) => setRefereeEmail(e.target.value)}
                placeholder="friend@email.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500/20"
              />
            </div>
            <button
              onClick={sendInvite}
              disabled={sending}
              className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 py-2 text-white hover:opacity-90 disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Invitation"}
            </button>
          </div>
        </div>

        <div className="rounded-xl glass-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Why Refer Friends?</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                <span className="text-lg">🎯</span>
              </div>
              <div>
                <p className="font-medium text-white">Help Someone Land Their Dream Job</p>
                <p className="text-sm text-slate-400">Share a tool that can transform careers</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                <span className="text-lg">🚀</span>
              </div>
              <div>
                <p className="font-medium text-white">Priority Access</p>
                <p className="text-sm text-slate-400">You and your referrals get early access to new features</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                <span className="text-lg">🌍</span>
              </div>
              <div>
                <p className="font-medium text-white">Build the African Tech Community</p>
                <p className="text-sm text-slate-400">Help more Africans get quality job opportunities</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
