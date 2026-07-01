"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";

export default function ReferralPage() {
  const { userId, isLoaded } = useAuth();
  const posthog = usePostHog();
  const [referralUrl, setReferralUrl] = useState("");
  const [refereeEmail, setRefereeEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchReferral();
    } else if (isLoaded) {
      setLoadingUrl(false);
    }
  }, [userId, isLoaded]);

  const fetchReferral = async () => {
    try {
      const response = await fetch("/api/referrals");
      if (response.ok) {
        const data = await response.json();
        setReferralUrl(data.referralUrl);
      }
    } catch (error) {
      console.error("Error fetching referral:", error);
    } finally {
      setLoadingUrl(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralUrl);
    posthog?.capture("referral_link_copied");
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
        posthog?.capture("referral_invite_sent");
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
    <div className="max-w-xl mx-auto space-y-5">
      {/* Page header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold gradient-text">Refer &amp; Earn</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Share CareerOS and grow the community</p>
      </div>

      {/* Referral link — hero card */}
      <div className="animate-fade-up delay-100 rounded-2xl overflow-hidden border border-green-500/20 bg-[#0d0d18]">
        {/* Gradient strip at top */}
        <div className="h-1 w-full bg-gradient-to-r from-green-500/40 via-cyan-500/40 to-green-500/40" />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-green-500/20 border border-green-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Your Referral Link</h2>
              <p className="mono text-xs text-zinc-500">Share this link with friends</p>
            </div>
          </div>
          <div className="flex gap-2">
            {loadingUrl ? (
              <div className="flex-1 h-10 rounded-xl bg-white/5 animate-pulse" />
            ) : (
              <input
                type="text"
                value={referralUrl}
                readOnly
                className="agent-input flex-1 text-xs cursor-text"
              />
            )}
            <button
              onClick={copyToClipboard}
              disabled={loadingUrl || !referralUrl}
              className={`press-scale flex-shrink-0 ${copied ? "agent-button" : "agent-button-primary"}`}
            >
              {copied ? (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>

          {referralUrl && (
            <div className="mt-5 pt-5 border-t border-white/[0.06] flex items-center justify-between gap-3 flex-wrap animate-fade-up">
              <span className="mono text-[10px] text-zinc-500">Quick Share:</span>
              <div className="flex gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `I'm using CareerOS to analyze my CV match score and fix skill gaps for job openings in Ghana. Test your CV fit for free here: ${referralUrl}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/20 transition-all press-scale"
                >
                  WhatsApp
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `Stop applying blind. Score your CV fit for free using @careeros_live before you apply to jobs: ${referralUrl}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 text-xs text-sky-400 hover:bg-sky-500/20 transition-all press-scale"
                >
                  Twitter (X)
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-xs text-blue-400 hover:bg-blue-500/20 transition-all press-scale"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send invite card */}
      <div className="animate-fade-up delay-200 rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
        <p className="section-label">Send an Invite</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Friend&apos;s Email</label>
            <input
              type="email"
              value={refereeEmail}
              onChange={(e) => setRefereeEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendInvite()}
              placeholder="friend@email.com"
              className="agent-input"
            />
          </div>
          <button
            onClick={sendInvite}
            disabled={sending}
            className="agent-button-primary w-full justify-center press-scale"
          >
            {sending ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Invite
              </>
            )}
          </button>
        </div>
      </div>

      {/* Benefits card */}
      <div className="animate-fade-up delay-300 rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
        <p className="section-label">Why Refer Friends</p>
        <div className="space-y-3">
          {[
            { icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", color: "purple", text: "Help someone land their dream job" },
            { icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "cyan", text: "Priority access for you and your referrals" },
            { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", color: "green", text: "Build the African tech community together" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                item.color === "purple" ? "bg-purple-500/20" :
                item.color === "cyan" ? "bg-cyan-500/20" : "bg-green-500/20"
              }`}>
                <svg className={`h-4 w-4 ${
                  item.color === "purple" ? "text-purple-400" :
                  item.color === "cyan" ? "text-cyan-400" : "text-green-400"
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
              </div>
              <span className="mono text-xs text-zinc-400">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
