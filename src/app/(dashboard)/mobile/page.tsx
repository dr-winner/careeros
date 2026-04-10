"use client";

import Link from "next/link";

export default function MobileAppPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600">
          <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white">Mobile App Coming Soon</h1>
        <p className="mt-4 text-slate-400">
          CareerOS on the go. Apply to jobs, track applications, and get interview reminders from your phone.
        </p>
      </div>

      <div className="rounded-2xl glass-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">What to Expect</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Push Notifications</p>
              <p className="text-sm text-slate-400">Get instant alerts for new jobs and application updates</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Mobile-Optimized UI</p>
              <p className="text-sm text-slate-400">Beautiful, fast experience designed for phones</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500/20">
              <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Offline Resume Access</p>
              <p className="text-sm text-slate-400">Access your CV and notes without internet</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/20">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Interview Reminders</p>
              <p className="text-sm text-slate-400">Calendar integration for interview prep</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl glass-card p-6 text-center">
        <p className="font-medium text-white">Want early access?</p>
        <p className="mt-1 text-sm text-slate-400">
          Join the waitlist and we&apos;ll notify you when the app launches.
        </p>
        <Link
          href="/alerts"
          className="mt-4 inline-block rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-2 text-white hover:opacity-90"
        >
          Get Notified
        </Link>
      </div>

      <div className="mt-8 text-center">
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-300">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
