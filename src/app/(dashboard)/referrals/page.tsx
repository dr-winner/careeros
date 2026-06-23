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
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const sendInvite = async () => {
    if (!refereeEmail) {
      toast.error("Enter an email address");
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
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          <span className="mono text-sm text-zinc-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="agent-card p-6 mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Refer & Earn</h1>
             <p className="text-sm text-zinc-500">Share CareerOS with friends</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="agent-card p-5">
            <span className="text-sm font-medium text-zinc-400">Your Referral Link</span>
          <div className="mt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={referralUrl}
                readOnly
                className="agent-input flex-1 text-xs"
              />
              <button onClick={copyToClipboard} className={copied ? "agent-button" : "agent-button-primary"}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="mono text-xs text-zinc-600 mt-2">Share this link with friends.</p>
          </div>
        </div>

        <div className="agent-card p-5">
            <span className="text-sm font-medium text-zinc-400">Send an Invite</span>
          <div className="mt-4 space-y-3">
            <div>
               <label className="text-sm text-zinc-400 mb-1 block">Friend&apos;s Email</label>
              <input
                type="email"
                value={refereeEmail}
                onChange={(e) => setRefereeEmail(e.target.value)}
                placeholder="friend@email.com"
                className="agent-input w-full"
              />
            </div>
            <button onClick={sendInvite} disabled={sending} className="agent-button-primary w-full justify-center">
              {sending ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </div>

        <div className="agent-card p-5">
            <span className="text-sm font-medium text-zinc-400">Why Refer Friends</span>
          <div className="mt-4 space-y-3">
            {[
              { icon: "→", color: "purple", text: "Help someone land their dream job" },
              { icon: "→", color: "cyan", text: "Priority access for you and referrals" },
              { icon: "→", color: "green", text: "Build the African tech community" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900/30">
                <span className={`text-${item.color}-400`}>{item.icon}</span>
                <span className="mono text-xs text-zinc-400">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
