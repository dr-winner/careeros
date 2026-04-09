"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/");
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50">
        <div className="text-emerald-800">Loading...</div>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-amber-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-800">
              <span className="text-sm font-bold text-white">C</span>
            </div>
            <span className="text-lg font-semibold text-emerald-900">CareerOS</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-emerald-700 hover:text-emerald-900"
            >
              Dashboard
            </Link>
            <UserButton />
          </div>
        </div>
      </nav>

      <main className="pt-20">{children}</main>
    </div>
  );
}
