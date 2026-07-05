"use client";

import { useAuth, UserButton, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import Logo from "@/app/components/logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", color: "purple" },
  { href: "/jobs", label: "Jobs", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z", color: "cyan" },
  { href: "/applications", label: "Applications", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01", color: "purple" },
  { href: "/interview", label: "Interview", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", color: "cyan" },
  { href: "/saved-jobs", label: "Saved", icon: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z", color: "purple" },
  { href: "/resumes", label: "CVs", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color: "cyan" },
  { href: "/profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", color: "purple" },
];

// Bottom nav: the 5 most-reached pages (Saved/CVs still accessible via drawer)
const primaryNav = [navItems[0], navItems[1], navItems[2], navItems[3], navItems[6]];

const colorMap: Record<string, { bg: string; text: string }> = {
  purple: { bg: "bg-purple-500/15", text: "text-purple-400" },
  cyan: { bg: "bg-cyan-500/15", text: "text-cyan-400" },
};

function isNavActive(href: string, pathname: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

// Persistent upsell card shown to free users in the sidebar/drawer —
// premium must be discoverable everywhere, not only when a limit is hit.
function UpgradeCard({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/pricing"
      onClick={onNavigate}
      className="block rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-cyan-500/10 p-3.5 hover:border-purple-500/45 hover:from-purple-500/20 transition-all group"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="h-6 w-6 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-500/30">
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
          Upgrade to Pro
        </span>
      </div>
      <p className="mono text-[10px] text-zinc-500 leading-relaxed">
        Unlimited analyses · AI cover letters<br />GHS 25/mo · pay with MoMo
      </p>
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const [synced, setSynced] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // null = unknown (render nothing) — avoids flashing the upsell at premium users
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/");
    }
  }, [isLoaded, userId, router]);

  useEffect(() => {
    if (userId && !synced) {
      fetch("/api/user/sync", { method: "POST" })
        .then(() => setSynced(true))
        .catch(console.error);
    }
  }, [userId, synced]);

  useEffect(() => {
    if (!userId) return;
    fetch("/api/user/premium")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setIsPremium(Boolean(data.isPremium));
      })
      .catch(() => {});
  }, [userId, pathname]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse">
            <Logo size="lg" variant="mark" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
            <span className="mono text-sm text-zinc-400">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  const isOnboarding = pathname === "/guided-onboarding";

  if (isOnboarding) {
    return (
      <>
        <Toaster position="top-center" />
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] overflow-x-hidden">
      <Toaster position="top-center" />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col w-56 border-r border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="flex h-14 items-center border-b border-white/5 px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Logo size="sm" variant="full" />
          </Link>
        </div>

        <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const active = isNavActive(item.href, pathname);
            const colors = colorMap[item.color] || colorMap.purple;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                  active ? `${colors.bg} ${colors.text}` : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${active ? "bg-white/10" : "bg-white/5 group-hover:bg-white/10"}`}>
                  <svg className={`h-4 w-4 ${active ? colors.text : "text-zinc-500 group-hover:text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {isPremium === false && (
          <div className="p-3">
            <UpgradeCard />
          </div>
        )}
        {isPremium === true && (
          <div className="px-6 py-2 flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 mono">PRO</span>
            <span className="mono text-[10px] text-zinc-600">All features unlocked</span>
          </div>
        )}

        <div className="p-3 border-t border-white/5 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <UserButton />
            <span className="text-xs text-zinc-500 font-medium">Account</span>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="w-full group flex items-center gap-3 rounded-lg px-3 py-2 transition-all text-zinc-600 hover:bg-white/5 hover:text-zinc-400 cursor-pointer text-left"
          >
            <div className="h-6 w-6 rounded flex items-center justify-center bg-white/5 group-hover:bg-white/10">
              <svg className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <span className="text-xs font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size="sm" variant="full" />
          </Link>

          <div className="flex items-center gap-2">
            {isPremium === false && (
              <Link
                href="/pricing"
                className="flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 mono text-[10px] font-bold text-purple-300 hover:bg-purple-500/20 transition-all"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                PRO
              </Link>
            )}
            <UserButton />
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-72 bg-[#0a0a0f]/98 backdrop-blur-xl border-l border-white/5 flex flex-col">
            <div className="flex h-14 items-center justify-between border-b border-white/5 px-4">
              <span className="text-sm font-semibold text-white">Menu</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const active = isNavActive(item.href, pathname);
                const colors = colorMap[item.color] || colorMap.purple;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                      active ? `${colors.bg} ${colors.text}` : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${active ? "bg-white/10" : "bg-white/5 group-hover:bg-white/10"}`}>
                      <svg className={`h-4 w-4 ${active ? colors.text : "text-zinc-500 group-hover:text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {isPremium === false && (
              <div className="p-3">
                <UpgradeCard onNavigate={() => setSidebarOpen(false)} />
              </div>
            )}

            <div className="p-3 border-t border-white/5 space-y-1 mt-auto">
              <div className="flex items-center gap-3 px-3 py-2">
                <UserButton />
                <span className="text-xs text-zinc-500 font-medium">Account</span>
              </div>
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  signOut({ redirectUrl: "/" });
                }}
                className="w-full group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all text-zinc-500 hover:bg-white/5 hover:text-zinc-300 cursor-pointer text-left"
              >
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/5 group-hover:bg-white/10">
                  <svg className="h-4 w-4 text-zinc-500 group-hover:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#0a0a0f]/98 backdrop-blur-xl">
        <div className="flex items-center justify-around px-2 py-1">
          {primaryNav.map((item) => {
            const active = isNavActive(item.href, pathname);
            const colors = colorMap[item.color] || colorMap.purple;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all ${
                  active ? colors.text : "text-zinc-500"
                }`}
              >
                <div className={`p-1.5 rounded-lg ${active ? colors.bg : ""}`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d={item.icon} />
                  </svg>
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="lg:pl-56 pt-14 lg:pt-0 pb-20 lg:pb-6 min-h-screen">
        <div className="p-4 sm:p-6">
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[150px]" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[120px]" />
          </div>
          <div className="relative z-10">{children}</div>
        </div>
      </main>
    </div>
  );
}
