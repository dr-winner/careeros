"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const isSuccess = searchParams.get("success") === "true";

  useEffect(() => {
    if (isLoaded && !userId) router.push("/");
  }, [isLoaded, userId, router]);

  const checkPremium = useCallback(async () => {
    const res = await fetch("/api/user/premium").catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      setIsPremium(d.isPremium || false);
    }
  }, []);

  useEffect(() => {
    checkPremium();
  }, [checkPremium]);

  // After redirect back from Moolre, poll a few times until DB is updated
  useEffect(() => {
    if (!isSuccess) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const res = await fetch("/api/user/premium").catch(() => null);
      if (res?.ok) {
        const d = await res.json();
        if (d.isPremium) {
          setIsPremium(true);
          clearInterval(interval);
        }
      }
      if (attempts >= 8) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [isSuccess]);

  const handleUpgrade = async () => {
    if (!userId) {
      toast.error("Please sign in first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/payment/create-link", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Could not start payment. Please try again.");
        return;
      }

      // Redirect to Moolre's hosted payment page
      window.location.href = data.url;
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  // Success state — shown after returning from Moolre checkout
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
            {isPremium ? (
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            )}
          </div>
          {isPremium ? (
            <>
              <h1 className="text-3xl font-bold text-white mb-3">You&apos;re Premium!</h1>
              <p className="text-zinc-400 mb-8">
                Your payment was successful. All premium features are now unlocked.
              </p>
              <Link
                href="/dashboard"
                className="inline-block rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-4 text-white font-semibold hover:opacity-90 transition-opacity"
              >
                Go to Dashboard →
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-3">Verifying payment…</h1>
              <p className="text-zinc-400 mb-8">
                Your payment is being confirmed. This usually takes a few seconds.
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="text-sm text-zinc-500 hover:text-zinc-300"
              >
                Continue to Dashboard
              </button>
            </>
          )}
        </div>
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
            <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Get professional tools to land your dream job faster.
              Start with a free CV analysis, then upgrade when you&apos;re ready.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
            {/* Free plan */}
            <div className="rounded-2xl border border-white/10 bg-[#14141f] p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Free</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">GHS 0</span>
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
                <p className="text-sm text-zinc-400">You&apos;re already on this plan!</p>
                <Link href="/dashboard" className="inline-block mt-3 text-sm text-purple-400 hover:text-purple-300">
                  Go to Dashboard →
                </Link>
              </div>
            </div>

            {/* Premium plan */}
            <div className="rounded-2xl border-2 border-purple-500/50 bg-gradient-to-b from-purple-500/5 to-transparent p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-semibold text-white">
                RECOMMENDED
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Premium</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    GHS 99
                  </span>
                  <span className="text-zinc-500">/one-time</span>
                </div>
                <p className="text-sm text-zinc-500 mt-1">Lifetime access · no subscription</p>
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

              {isPremium ? (
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-center">
                  <p className="text-sm text-green-400 font-medium">✓ You&apos;re already Premium</p>
                  <Link href="/dashboard" className="inline-block mt-2 text-sm text-zinc-400 hover:text-white">
                    Go to Dashboard →
                  </Link>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleUpgrade}
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-4 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Preparing checkout…
                      </span>
                    ) : (
                      "Pay with Mobile Money / Card"
                    )}
                  </button>
                  <p className="text-xs text-zinc-500 text-center mt-3">
                    MTN · Telecel · AirtelTigo · Card · Secure checkout by Moolre
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-white/10 bg-[#14141f] p-8 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">Frequently Asked Questions</h3>
            <div className="space-y-4">
              {[
                {
                  q: "What payment methods are accepted?",
                  a: "You can pay via MTN Mobile Money, Telecel Cash, AirtelTigo Money, or card — all processed securely by Moolre, Ghana's digital payment platform.",
                },
                {
                  q: "What do I get with the free CV analysis?",
                  a: "A complete diagnosis of your CV including content, style, and structure scores with specific improvement recommendations.",
                },
                {
                  q: "What does CV regeneration include?",
                  a: "We use AI to rewrite and format your CV professionally, fixing all identified issues, optimizing for ATS systems, and presenting your achievements in the best light.",
                },
                {
                  q: "Is this a one-time payment?",
                  a: "Yes! GHS 99 once for lifetime access to all premium features. No subscription, no renewals.",
                },
                {
                  q: "Can I upgrade later?",
                  a: "Absolutely! Start with the free plan, get your free CV analysis, and upgrade whenever you're ready.",
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
