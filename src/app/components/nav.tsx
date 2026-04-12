"use client";

import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Logo from "./logo";

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-dark">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <Logo size="sm" variant="icon-only" />
          <span className="text-base font-semibold text-white">CareerOS</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/jobs"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white hover:bg-white/5"
          >
            Jobs
          </Link>
          <Link
            href="/features"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white hover:bg-white/5"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white hover:bg-white/5"
          >
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="agent-button agent-button-secondary !px-4 !py-2 !text-sm">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal" signInFallbackRedirectUrl="/dashboard">
              <button className="agent-button agent-button-primary !px-5 !py-2 !text-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Launch
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <div className="agent-status rounded-full border border-white/10 px-3 py-1.5">
              <div className="status-dot" />
              <span className="mono text-xs text-zinc-400">Agent ready</span>
            </div>
            <Link
              href="/dashboard"
              className="agent-button agent-button-secondary !px-4 !py-2 !text-sm"
            >
              Dashboard
            </Link>
            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  );
}
