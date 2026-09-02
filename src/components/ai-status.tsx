"use client";

import { useEffect, useState } from "react";

export type AiStatus = "ready" | "degraded" | "unconfigured" | "unknown";

type AiStatusPayload = {
  status: Exclude<AiStatus, "unknown">;
  since: string | null;
  reasons?: string[];
};

// Polls the token-free health endpoint once per mount. "degraded" means every
// provider failed in the last 10 minutes, so features should fall back
// visibly rather than pretend.
export function useAiStatus(): { status: AiStatus; reasons: string[] } {
  const [status, setStatus] = useState<AiStatus>("unknown");
  const [reasons, setReasons] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/status", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<AiStatusPayload>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        setStatus(data.status);
        setReasons(data.reasons ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, reasons };
}

export function AiStatusBadge({ status }: { status: AiStatus }) {
  if (status === "degraded" || status === "unconfigured") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span className="mono text-xs text-amber-300">AI unavailable</span>
      </div>
    );
  }
  if (status === "ready") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
        <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span className="mono text-xs text-cyan-400">AI Ready</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08]">
      <div className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
      <span className="mono text-xs text-zinc-500">Checking AI…</span>
    </div>
  );
}

export function AiOutageNotice({
  status,
  reasons,
  message,
}: {
  status: AiStatus;
  reasons?: string[];
  message: string;
}) {
  if (status !== "degraded" && status !== "unconfigured") return null;
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-100">
      <p className="font-medium">Our AI is temporarily unavailable.</p>
      <p className="mt-0.5 text-xs text-amber-200/80">
        {message} Nothing you do here spends a credit while the AI is down.
      </p>
      {reasons && reasons.length > 0 && (
        <details className="mt-2">
          <summary className="mono cursor-pointer text-[11px] text-amber-300/70">Technical detail</summary>
          <ul className="mono mt-1 space-y-0.5 text-[11px] text-amber-200/70">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
