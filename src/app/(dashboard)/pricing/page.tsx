"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

const FREE_FEATURES = [
  "CV upload and storage",
  "Free CV analysis (diagnosis only)",
  "Job listings browse",
  "Basic job matching",
  "Application tracking",
];

const PREMIUM_FEATURES = [
  "Everything in Free",
  "Professional CV regeneration",
  "ATS-optimized CV format",
  "Job fit analysis (CV vs Job)",
  "Skills gap identification",
  "Cover letter generation",
  "Interview preparation tips",
  "Priority job alerts",
];

const FAQS = [
  {
    q: "What payment methods are accepted?",
    a: "MTN Mobile Money, Telecel Cash, AirtelTigo Money, or card — all processed securely by Moolre, Ghana's digital payment platform.",
  },
  {
    q: "What do I get with the free CV analysis?",
    a: "A complete diagnosis including content, style, and structure scores with specific improvement recommendations.",
  },
  {
    q: "What does CV regeneration include?",
    a: "AI rewrites and formats your CV professionally, fixing all identified issues and optimising for ATS systems.",
  },
  {
    q: "Is this a one-time payment?",
    a: "Yes — GHS 99 once for lifetime access. No subscription, no renewals.",
  },
  {
    q: "Can I upgrade later?",
    a: "Absolutely. Start free, get your CV analysis, and upgrade whenever you're ready.",
  },
];

export default function PricingPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const isSuccess = searchParams.get("success") === "true";
  const paymentRef = searchParams.get("ref") || "";

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

  useEffect(() => { checkPremium(); }, [checkPremium]);

  useEffect(() => {
    if (!isSuccess) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const res = await fetch("/api/user/premium").catch(() => null);
      if (res?.ok) {
        const d = await res.json();
        if (d.isPremium) { setIsPremium(true); clearInterval(interval); }
      }
      if (attempts >= 8) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [isSuccess]);

  const handleManualVerify = async () => {
    if (!paymentRef) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: paymentRef }),
      });
      const d = await res.json();
      if (d.isPremium) {
        setIsPremium(true);
        toast.success("Premium activated!");
      } else {
        toast.error(d.message || "Payment not yet confirmed. Please wait and try again.");
      }
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleUpgrade = async () => {
    if (!userId) { toast.error("Please sign in first"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/payment/create-link", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Could not start payment. Please try again."); return; }
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

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto py-20 text-center animate-fade-up">
        <div className={`h-20 w-20 rounded-2xl mx-auto mb-6 flex items-center justify-center border ${
          isPremium
            ? "bg-purple-500/10 border-purple-500/30"
            : "bg-white/[0.04] border-white/[0.08]"
        }`}>
          {isPremium ? (
            <svg className="h-10 w-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <div className="h-7 w-7 rounded-full border-2 border-purple-500/40 border-t-purple-500 animate-spin" />
          )}
        </div>

        {isPremium ? (
          <>
            <h1 className="text-3xl font-bold gradient-text mb-3">You&apos;re Premium!</h1>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              Payment confirmed. All premium features are now unlocked — enjoy.
            </p>
            <Link href="/dashboard" className="agent-button-primary press-scale">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Go to Dashboard
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-3">Verifying payment…</h1>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              Your payment is being confirmed. This usually takes a few seconds.
            </p>
            {paymentRef && (
              <button
                onClick={handleManualVerify}
                disabled={verifying}
                className="agent-button-primary press-scale mb-4 disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Checking…
                  </>
                ) : "Check payment status"}
              </button>
            )}
            <button onClick={() => router.push("/dashboard")} className="block mx-auto mono text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-3">
              Continue to Dashboard
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="animate-fade-up text-center pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
          <div className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="mono text-xs text-purple-400">Unlock Premium Features</span>
        </div>
        <h1 className="text-3xl font-bold gradient-text mb-3">Simple, honest pricing</h1>
        <p className="text-zinc-400 max-w-xl mx-auto">
          Start free. Upgrade when you&apos;re ready. Pay once, keep forever.
        </p>
      </div>

      {/* Plan cards */}
      <div className="animate-fade-up delay-100 grid gap-5 md:grid-cols-2">
        {/* Free */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] overflow-hidden">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-500/40 to-transparent" />
          <div className="p-7">
            <p className="section-label">Free</p>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-4xl font-bold text-white">GHS 0</span>
              <span className="text-zinc-500 text-sm">/forever</span>
            </div>
            <p className="mono text-xs text-zinc-600 mb-7">No credit card needed</p>

            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="h-4 w-4 rounded-full bg-zinc-700/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="h-2.5 w-2.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-zinc-400">{f}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
              <p className="text-sm text-zinc-500">You&apos;re already on this plan</p>
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 mt-2 mono text-xs text-purple-400 hover:text-purple-300 transition-colors">
                Go to Dashboard
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Premium */}
        <div className="rounded-2xl border border-purple-500/30 bg-[#0d0d18] overflow-hidden relative">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 mono text-[10px] font-bold text-white uppercase tracking-wider">
              Recommended
            </span>
          </div>
          <div className="p-7 pt-9">
            <p className="section-label">Premium</p>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-4xl font-bold gradient-text">GHS 99</span>
              <span className="text-zinc-500 text-sm">/one-time</span>
            </div>
            <p className="mono text-xs text-zinc-600 mb-7">Lifetime access · no renewals</p>

            <ul className="space-y-3 mb-8">
              {PREMIUM_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="h-4 w-4 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="h-2.5 w-2.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-zinc-300">{f}</span>
                </li>
              ))}
            </ul>

            {isPremium ? (
              <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-green-400 font-medium">You&apos;re already Premium</p>
                </div>
                <Link href="/dashboard" className="mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  Go to Dashboard →
                </Link>
              </div>
            ) : (
              <>
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="agent-button-primary w-full justify-center py-3.5 text-sm font-bold press-scale disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Preparing checkout…
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Pay with Mobile Money / Card
                    </>
                  )}
                </button>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <svg className="h-3 w-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="mono text-[10px] text-zinc-600">Secure checkout by</span>
                  <span className="mono text-[10px] font-bold text-purple-400">Moolre</span>
                  <span className="mono text-[10px] text-zinc-700">· MTN · Telecel · AirtelTigo · Card</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Trust row */}
      <div className="animate-fade-up delay-200 flex flex-wrap items-center justify-center gap-6">
        {[
          { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "Secure payment" },
          { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: "Instant access" },
          { icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", label: "Lifetime access" },
        ].map((t) => (
          <div key={t.label} className="flex items-center gap-2">
            <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={t.icon} />
            </svg>
            <span className="mono text-xs text-zinc-500">{t.label}</span>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="animate-fade-up delay-300 rounded-2xl border border-white/[0.08] bg-[#0d0d18] overflow-hidden">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        <div className="p-7">
          <p className="section-label">Frequently Asked Questions</p>
          <div className="space-y-5">
            {FAQS.map((faq, i) => (
              <div key={i} className={`pb-5 ${i < FAQS.length - 1 ? "border-b border-white/[0.06]" : ""}`}>
                <p className="text-sm font-medium text-white mb-1.5">{faq.q}</p>
                <p className="text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pb-6" />
    </div>
  );
}
