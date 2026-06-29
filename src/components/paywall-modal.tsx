"use client";

import { useRouter } from "next/navigation";
import { useAnalytics } from "@/lib/analytics";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  feature: string;
}

export default function PaywallModal({
  isOpen,
  onClose,
  title = "Premium Feature",
  feature,
}: PaywallModalProps) {
  const router = useRouter();
  const analytics = useAnalytics();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    analytics.upgradeClicked(feature);
    localStorage.setItem("pendingUpgrade", feature);
    router.push("/pricing");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 overflow-y-auto">
      <div className="w-full max-w-md my-8">
        <div className="agent-card">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <p className="mono text-xs text-zinc-500">Premium Required</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-500 hover:text-white hover:bg-white/5"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 mx-auto flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              {feature === "job_analysis" ? "You've used your 3 free analyses" : "Unlock Premium Features"}
            </h3>
            <p className="text-sm text-zinc-400 mb-6 max-w-xs mx-auto">
              {feature === "job_analysis"
                ? "Free plan includes 3 job analyses per month. Upgrade for unlimited — coffee money at GHS 25/month."
                : "Get unlimited analyses, CV optimization, cover letters, and interview prep."}
            </p>

            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 mb-6 text-left">
              <ul className="space-y-2">
                {[
                  "Unlimited job analyses",
                  "Full skill gap breakdown",
                  "AI cover letters per job",
                  "Interview prep questions",
                  "CV optimization suggestions",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                    <svg className="h-4 w-4 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleUpgrade}
              className="w-full agent-button-primary py-3 mb-3"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Get Premium — GHS 25/month
            </button>

            <button
              onClick={onClose}
              className="w-full agent-button py-3"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
