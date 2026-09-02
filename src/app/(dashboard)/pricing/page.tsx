"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";

const FREE_FEATURES = [
  "3 AI credits per month — use on job analyses, cover letters or mock interviews",
  "Full match score with matched and missing skills",
  "Browse jobs from 13 sources across Ghana, Africa and remote",
  "Paste any advert (WhatsApp, agency list) and score it",
  "CV upload, application tracker and daily job alerts",
];

const PREMIUM_FEATURES = [
  "Unlimited job-fit analyses",
  "AI CV optimization tailored to each role",
  "Unlimited AI cover letters",
  "Unlimited AI mock interviews with scored feedback",
  "CV rewrite and role-tailored CV versions",
  "Early access to new features",
];

const FAQS = [
  {
    q: "What payment methods are accepted?",
    a: "MTN Mobile Money, Telecel Cash, AirtelTigo Money, or card — all processed securely by Moolre.",
  },
  {
    q: "What exactly is free?",
    a: "Everything except unlimited AI. Free accounts get 3 AI credits a month (a job-fit analysis, a cover letter or a mock interview each cost one credit). Re-opening a job you've already analysed is always free. Job browsing, pasting adverts, CV storage, the application tracker and job alerts are unlimited.",
  },
  {
    q: "What does Premium add?",
    a: "No credit limit, plus the tools that actually change your outcome: AI CV optimization written for the specific role, a full CV rewrite, unlimited cover letters and unlimited mock interviews with scored feedback.",
  },
  {
    q: "Is this a subscription that charges me automatically?",
    a: "No. You pay for one month or one year up front and nothing is ever debited from your wallet automatically. Before your period ends we email you a renewal link — if you don't renew, you simply drop back to the free plan and keep all your data.",
  },
  {
    q: "Is there a yearly plan?",
    a: "Yes — GHS 199/year, which works out to GHS 16.58/month. That's a 34% saving compared to monthly billing.",
  },
  {
    q: "I paid GHS 99 already — what happens to me?",
    a: "You keep your lifetime access. We honour every early supporter. Your account shows Premium and that won't change.",
  },
];

export default function PricingPage() {
  const { userId, isLoaded } = useAuth();
  const posthog = usePostHog();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verifyExhausted, setVerifyExhausted] = useState(false);
  const [annual, setAnnual] = useState(false);
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

  // Returning from Moolre: actively verify the payment with the ref from
  // the redirect instead of only polling and hoping the webhook landed.
  // Verification is idempotent server-side, so racing the webhook is safe.
  useEffect(() => {
    if (!isSuccess || !userId) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12; // ~45s including backoff

    const tick = async () => {
      if (cancelled) return;
      attempts++;

      if (paymentRef) {
        try {
          const res = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ref: paymentRef }),
          });
          const d = await res.json().catch(() => ({}));
          if (cancelled) return;
          if (d.isPremium) {
            posthog?.capture("premium_activated", { method: "auto_verify", attempts });
            setIsPremium(true);
            return;
          }
          if (res.status === 400) {
            // Terminal: amount mismatch or malformed ref — stop and surface it.
            setVerifyMessage(d.error || d.message || null);
            setVerifyExhausted(true);
            return;
          }
          if (d.pending === false && d.message) {
            setVerifyMessage(d.message);
            setVerifyExhausted(true);
            return;
          }
        } catch {
          // network blip — fall through to retry
        }
      } else {
        const res = await fetch("/api/user/premium").catch(() => null);
        if (res?.ok) {
          const d = await res.json();
          if (cancelled) return;
          if (d.isPremium) {
            posthog?.capture("premium_activated", { method: "auto_poll", attempts });
            setIsPremium(true);
            return;
          }
        }
      }

      if (attempts >= maxAttempts) {
        setVerifyExhausted(true);
        return;
      }
      const delay = attempts < 4 ? 2000 : 5000;
      setTimeout(tick, delay);
    };

    tick();
    return () => { cancelled = true; };
  }, [isSuccess, userId, paymentRef, posthog]);

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
        posthog?.capture("premium_activated", { method: "manual_verify" });
        setIsPremium(true);
        toast.success("Premium activated!");
      } else {
        toast.error(d.error || d.message || "Payment not yet confirmed. Please wait and try again.");
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
      const res = await fetch("/api/payment/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: annual ? "annual" : "monthly" }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Could not start payment. Please try again."); return; }
      posthog?.capture("upgrade_initiated", {
        plan: annual ? "annual" : "monthly",
        amount_ghs: annual ? 199 : 25,
      });
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
            <h1 className="text-2xl font-bold text-white mb-3">
              {verifyExhausted ? "Still confirming your payment" : "Verifying payment…"}
            </h1>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              {verifyMessage
                ? verifyMessage
                : verifyExhausted
                  ? "Moolre hasn't confirmed this payment yet. If money left your wallet, you will be upgraded automatically as soon as it settles — or tap below to check again."
                  : "We're confirming your payment with Moolre. This usually takes a few seconds."}
            </p>
            {paymentRef && (
              <p className="mono text-[10px] text-zinc-600 mb-4 break-all">Reference: {paymentRef}</p>
            )}
            {verifyExhausted && (
              <p className="text-xs text-zinc-500 mb-4">
                Need help? Email <a href={`mailto:support@careeros.live?subject=Payment%20${encodeURIComponent(paymentRef)}`} className="text-purple-400 hover:underline">support@careeros.live</a> with the reference above.
              </p>
            )}
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
          <span className="mono text-xs text-purple-400">Upgrade to Premium</span>
        </div>
        <h1 className="text-3xl font-bold gradient-text mb-3">Simple, honest pricing</h1>
        <p className="text-zinc-400 max-w-md mx-auto mb-6">
          Free gets you started. Premium removes every limit.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-1.5 rounded-lg mono text-xs font-medium transition-all ${
              !annual ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-1.5 rounded-lg mono text-xs font-medium transition-all flex items-center gap-2 ${
              annual ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Annual
            <span className="px-1.5 py-0.5 rounded-md bg-green-500/20 text-green-400 text-[10px]">−34%</span>
          </button>
        </div>
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
            <p className="mono text-xs text-zinc-600 mb-7">No card needed</p>

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
              <p className="text-sm text-zinc-500">You&apos;re on this plan</p>
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
        <div className="relative flex flex-col">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <span className="px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 mono text-[10px] font-bold text-white uppercase tracking-wider">
              Recommended
            </span>
          </div>
          <div className="rounded-2xl border border-purple-500/30 bg-[#0d0d18] overflow-hidden flex flex-col flex-1 relative">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
            <div className="p-7 pt-9">
              <p className="section-label">Premium</p>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-4xl font-bold gradient-text">
                GHS {annual ? "199" : "25"}
              </span>
              <span className="text-zinc-500 text-sm">/{annual ? "year" : "month"}</span>
            </div>
            {annual ? (
              <p className="mono text-xs text-green-400 mb-7">GHS 16.58/month · save GHS 101/year</p>
            ) : (
              <p className="mono text-xs text-zinc-600 mb-7">No auto-renewal · pay with MoMo via Moolre</p>
            )}

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <div className="h-4 w-4 rounded-full bg-zinc-700/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="h-2.5 w-2.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-zinc-400">Everything in Free</span>
              </li>
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
                      Get Premium — GHS {annual ? "199/yr" : "25/mo"}
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
      </div>

      {/* Employer CTA */}
      <div className="animate-fade-up delay-150 rounded-2xl border border-cyan-500/20 bg-[#0d0d18] overflow-hidden">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        <div className="p-6 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Hiring?</p>
              <p className="mono text-xs text-zinc-500">Employer pilot: post a role and reach skill-matched seekers. First 10 employers free.</p>
            </div>
          </div>
          <a
            href="mailto:employers@careeros.live"
            className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-5 py-2.5 text-sm font-medium text-cyan-300 hover:bg-cyan-500/10 transition-all press-scale whitespace-nowrap flex-shrink-0"
          >
            Contact us
          </a>
        </div>
      </div>

      {/* Trust row */}
      <div className="animate-fade-up delay-200 flex flex-wrap items-center justify-center gap-6">
        {[
          { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "Secure payment" },
          { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: "Instant access" },
          { icon: "M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z", label: "No auto-renewal" },
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
