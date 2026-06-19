"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

const FEATURES = {
  free: [
    "CV upload and storage",
    "Free CV analysis (diagnosis only)",
    "Job listings browse",
    "Basic job matching",
    "Application tracking",
  ],
  premium: [
    "Everything in Free",
    "Professional CV regeneration",
    "ATS-optimized CV format",
    "Job fit analysis (CV vs Job)",
    "Skills gap identification",
    "Cover letter generation",
    "Interview preparation tips",
    "Priority job alerts",
  ],
};

export default function PricingPage() {
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/");
    }
  }, [isLoaded, userId, router]);

  const handleSubscribe = async (plan: string) => {
    if (!userId) {
      toast.error("Please sign in first");
      return;
    }

    setLoading(plan);

    try {
      const response = await fetch("/api/user/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        throw new Error("Failed to process payment");
      }

      toast.success(`Successfully subscribed to ${plan}!`);
      const pendingUpgrade = localStorage.getItem("pendingUpgrade");
      if (pendingUpgrade === "cv_regeneration") {
        localStorage.removeItem("pendingUpgrade");
        router.push("/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch {
      toast.error("Failed to process payment. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">CareerOS</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Skip for now
          </Link>
        </div>
      </header>

      <main className="pt-24 pb-16 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
              <span className="text-sm text-purple-400">Unlock Premium Features</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Choose Your Plan
            </h1>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Get professional tools to land your dream job faster. 
              Start with a free CV analysis, then upgrade when you&apos;re ready.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-[#14141f] p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Free</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">$0</span>
                  <span className="text-zinc-500">/forever</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {FEATURES.free.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-zinc-400">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-sm text-zinc-400">
                  You&apos;re already on this plan!
                </p>
                <Link href="/dashboard" className="inline-block mt-3 text-sm text-purple-400 hover:text-purple-300">
                  Go to Dashboard →
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-purple-500/50 bg-gradient-to-b from-purple-500/5 to-transparent p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-semibold text-white">
                RECOMMENDED
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Premium</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">$9.99</span>
                  <span className="text-zinc-500">/one-time</span>
                </div>
                <p className="text-sm text-zinc-500 mt-1">Lifetime access, no subscription</p>
              </div>

              <ul className="space-y-3 mb-8">
                {FEATURES.premium.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-zinc-400">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe("premium")}
                disabled={loading === "premium"}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-4 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading === "premium" ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Processing...
                  </span>
                ) : (
                  "Get Premium Access"
                )}
              </button>

              <p className="text-xs text-zinc-500 text-center mt-3">
                Secure payment • Instant access • 30-day guarantee
              </p>
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-white/10 bg-[#14141f] p-8 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">Frequently Asked Questions</h3>
            <div className="space-y-4">
              {[
                {
                  q: "What do I get with the free CV analysis?",
                  a: "You get a complete diagnosis of your CV including content, style, and structure scores with specific improvement recommendations. This helps you understand what needs fixing.",
                },
                {
                  q: "What does CV regeneration include?",
                  a: "We use AI to rewrite and format your CV professionally, fixing all identified issues, optimizing for ATS systems, and presenting your achievements in the best light.",
                },
                {
                  q: "Is this a one-time payment?",
                  a: "Yes! The premium plan is a one-time payment of $9.99 for lifetime access to all premium features including CV regeneration and job fit analysis.",
                },
                {
                  q: "Can I upgrade later?",
                  a: "Absolutely! You can start with the free plan, get your free CV analysis, and upgrade whenever you&apos;re ready to get your professional CV.",
                },
              ].map((faq, i) => (
                <div key={i} className="border-b border-white/5 pb-4 last:border-0">
                  <p className="font-medium text-white mb-1">{faq.q}</p>
                  <p className="text-sm text-zinc-400">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
