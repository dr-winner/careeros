"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";

interface RoomInfo {
  roomCode: string;
  role: string;
  experienceLevel?: string;
  status: string;
}

export default function InterviewRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const roomCode = code.toUpperCase();

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"interviewer" | "candidate">("candidate");
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiReady, setApiReady] = useState(() => {
    return typeof window !== "undefined" && typeof (window as unknown as { JitsiMeetExternalAPI?: unknown }).JitsiMeetExternalAPI !== "undefined";
  });
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jitsiApiRef = useRef<any>(null);

  // Load Jitsi script immediately on mount
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).JitsiMeetExternalAPI) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => setApiReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    fetch(`/api/interview-rooms/${roomCode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setNotFound(true);
        else setRoom(data.room);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [roomCode]);

  // Initialize Jitsi External API once joined and script is ready
  useEffect(() => {
    if (!joined || !apiReady || !jitsiContainerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
    if (!JitsiMeetExternalAPI) return;

    jitsiApiRef.current = new JitsiMeetExternalAPI("meet.jit.si", {
      roomName: `careeros-${roomCode}`,
      parentNode: jitsiContainerRef.current,
      width: "100%",
      height: "100%",
      userInfo: { displayName: displayName || "Guest" },
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        disableInviteFunctions: true,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        TOOLBAR_ALWAYS_VISIBLE: false,
      },
    });

    return () => {
      jitsiApiRef.current?.dispose();
      jitsiApiRef.current = null;
    };
  }, [joined, apiReady, roomCode, displayName]);

  const joinRoom = () => {
    if (!displayName.trim()) return;
    setJoined(true);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          <span className="mono text-sm text-zinc-400">Loading room…</span>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="text-center animate-fade-up">
          <div className="empty-state-icon mx-auto mb-5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Room not found</h1>
          <p className="text-sm text-zinc-500 mb-7">This interview room doesn&apos;t exist or has expired.</p>
          <Link
            href="/interview"
            className="inline-flex items-center gap-2 mono text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Interview Prep
          </Link>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
          {/* Live header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#0a0a0f]/95 backdrop-blur-xl flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-white hidden sm:block">CareerOS</span>
              <span className="text-white/20 hidden sm:block">·</span>
              <span className="text-sm text-zinc-400">{room?.role}</span>
              {room?.experienceLevel && (
                <span className="mono text-xs text-zinc-600">· {room.experienceLevel}</span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="mono text-xs font-bold text-purple-300 px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                {roomCode}
              </span>
              <button onClick={copyLink} className="mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors hidden sm:block">
                {copied ? "Copied!" : "Copy link"}
              </button>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="mono text-[10px] text-green-400">Live</span>
              </div>
              <span className={`mono text-[10px] px-2 py-0.5 rounded-lg border ${
                role === "interviewer"
                  ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                  : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
              }`}>
                {role === "interviewer" ? "Interviewer" : "Candidate"}
              </span>
            </div>
          </div>

          {/* Jitsi External API container */}
          <div className="flex-1 relative">
            {!apiReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                  <span className="mono text-sm text-zinc-400">Connecting…</span>
                </div>
              </div>
            )}
            <div
              ref={jitsiContainerRef}
              style={{ height: "calc(100vh - 46px)", width: "100%" }}
            />
          </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[350px] h-[350px] rounded-full bg-green-500/5 blur-[110px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white">CareerOS</span>
        </div>

        {/* Join card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] overflow-hidden animate-fade-up">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
          <div className="p-7">
            {/* Room info */}
            <div className="text-center mb-7">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                <svg className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.132a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">Live Interview Room</h1>
              <p className="text-sm text-zinc-500 mt-1">
                {room?.role}{room?.experienceLevel ? ` · ${room.experienceLevel}` : ""}
              </p>
              <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="mono text-sm font-bold tracking-[0.2em] text-white">{roomCode}</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Name input */}
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Your name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                  placeholder="e.g. John Smith"
                  autoFocus
                  className="agent-input w-full"
                />
              </div>

              {/* Role selection */}
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Your role in this session</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRole("interviewer")}
                    className={`py-3.5 rounded-xl border text-sm font-medium transition-all press-scale ${
                      role === "interviewer"
                        ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                        : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                    }`}
                  >
                    <svg className="h-5 w-5 mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Interviewer
                  </button>
                  <button
                    onClick={() => setRole("candidate")}
                    className={`py-3.5 rounded-xl border text-sm font-medium transition-all press-scale ${
                      role === "candidate"
                        ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                        : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                    }`}
                  >
                    <svg className="h-5 w-5 mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Candidate
                  </button>
                </div>
              </div>

              <button
                onClick={joinRoom}
                disabled={!displayName.trim()}
                className="agent-button-primary w-full justify-center py-3.5 text-sm font-bold press-scale disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.132a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Join Interview Room
              </button>

              <button
                onClick={copyLink}
                className="w-full py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] mono text-xs text-zinc-500 hover:text-zinc-300 hover:border-white/20 transition-all"
              >
                {copied ? "Link copied!" : "Copy room link to share"}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center mono text-xs text-zinc-700 mt-5">
          Powered by Jitsi Meet · No account needed to join
        </p>
      </div>
    </div>
  );
}
