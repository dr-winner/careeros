import Link from "next/link";
import Logo from "@/app/components/logo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <Logo size="sm" variant="full" />
        </div>
        <p className="mono text-xs text-purple-400 mb-2">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-sm text-zinc-500 mb-8">
          That URL doesn&apos;t exist. Head back to jobs or your dashboard.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/dashboard" className="agent-button-primary press-scale">
            Dashboard
          </Link>
          <Link href="/jobs" className="agent-button press-scale">
            Find Jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
