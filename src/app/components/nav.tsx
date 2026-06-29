"use client";

import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Logo from "./logo";

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-dark">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <Logo size="sm" variant="icon-only" />
          <span className="text-lg font-bold text-white">CareerOS</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/dashboard"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white hover:bg-white/5"
          >
            Dashboard
          </Link>
          <Link
            href="/jobs"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white hover:bg-white/5"
          >
            Find Jobs
          </Link>
          <Link
            href="/employers"
            className="rounded-lg px-4 py-2 text-sm font-medium text-cyan-400/70 transition-colors hover:text-cyan-300 hover:bg-cyan-500/5"
          >
            For Employers
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white hover:bg-white/5">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal" signInFallbackRedirectUrl="/dashboard">
              <button className="agent-button agent-button-primary !px-5 !py-2.5 !text-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Launch
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  );
}
