"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

export default function ReferralPage() {
  const { userId, isLoaded } = useAuth();
  const [referralCode, setReferralCode] = useState("");
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
        setReferralCode(data.referralCode);
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
        <div className="text-emerald-800">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-950">Refer Friends</h1>
        <p className="mt-2 text-emerald-700/70">
          Share CareerOS with friends and help them land their dream jobs.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-emerald-100 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-emerald-950">Your Referral Link</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralUrl}
              readOnly
              className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-800"
            />
            <button
              onClick={copyToClipboard}
              className={`rounded-lg px-4 py-2 font-medium ${
                copied
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-emerald-800 text-white hover:bg-emerald-700"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-sm text-emerald-600">
            Share this link with friends. They&apos;ll get priority access when they sign up!
          </p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-emerald-950">Send an Invite</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-700">
                Friend&apos;s Email
              </label>
              <input
                type="email"
                value={refereeEmail}
                onChange={(e) => setRefereeEmail(e.target.value)}
                placeholder="friend@email.com"
                className="w-full rounded-lg border border-emerald-200 px-4 py-2 text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button
              onClick={sendInvite}
              disabled={sending}
              className="w-full rounded-lg bg-emerald-800 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Invitation"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-amber-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-emerald-950">Why Refer Friends?</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <span className="text-lg">🎯</span>
              </div>
              <div>
                <p className="font-medium text-emerald-800">Help Someone Land Their Dream Job</p>
                <p className="text-sm text-emerald-600">Share a tool that can transform careers</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                <span className="text-lg">🚀</span>
              </div>
              <div>
                <p className="font-medium text-emerald-800">Priority Access</p>
                <p className="text-sm text-emerald-600">You and your referrals get early access to new features</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                <span className="text-lg">🌍</span>
              </div>
              <div>
                <p className="font-medium text-emerald-800">Build the African Tech Community</p>
                <p className="text-sm text-emerald-600">Help more Africans get quality job opportunities</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
