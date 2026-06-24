"use client";

import { useState, useEffect, use } from "react";
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

  const joinRoom = () => {
    if (!displayName.trim()) return;
    setJoined(true);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const jitsiSrc = [
    `https://meet.jit.si/careeros-${roomCode}`,
    `#config.startWithAudioMuted=true`,
    `&config.startWithVideoMuted=false`,
    `&config.prejoinPageEnabled=false`,
    `&config.disableDeepLinking=true`,
    `&userInfo.displayName=${encodeURIComponent(displayName || "Guest")}`,
  ].join("");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          <span className="text-sm text-zinc-400">Loading room...</span>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="h-14 w-14 mx-auto rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Room not found</h1>
          <p className="text-sm text-zinc-500 mb-6">This interview room doesn&apos;t exist or has expired.</p>
          <Link href="/interview" className="text-purple-400 hover:text-purple-300 text-sm">
            ← Back to Interview Prep
          </Link>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white hidden sm:block">CareerOS</span>
            <span className="text-zinc-700 hidden sm:block">·</span>
            <span className="text-sm text-zinc-400">{room?.role}</span>
            {room?.experienceLevel && (
              <span className="mono text-xs text-zinc-600">· {room.experienceLevel}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="mono text-xs font-bold text-purple-400 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                {roomCode}
              </span>
            </div>
            <button onClick={copyLink} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              {copied ? "Copied!" : "Copy link"}
            </button>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="mono text-[10px] text-green-400">Live</span>
            </div>
            <span className={`mono text-[10px] px-2 py-0.5 rounded ${role === "interviewer" ? "bg-purple-500/10 text-purple-400" : "bg-cyan-500/10 text-cyan-400"}`}>
              {role === "interviewer" ? "Interviewer" : "Candidate"}
            </span>
          </div>
        </div>

        {/* Jitsi */}
        <div className="flex-1">
          <iframe
            src={jitsiSrc}
            className="w-full"
            style={{ height: "calc(100vh - 46px)", border: "none" }}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            title="CareerOS Live Interview"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white">CareerOS</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#14141f] p-8">
          <div className="text-center mb-6">
            <div className="h-14 w-14 mx-auto rounded-xl bg-purple-500/20 border border-purple-500/20 flex items-center justify-center mb-4">
              <svg className="h-7 w-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.132a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Live Interview Room</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {room?.role}{room?.experienceLevel ? ` · ${room.experienceLevel}` : ""}
            </p>
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
              <span className="mono text-sm font-bold tracking-widest text-purple-400">{roomCode}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Your name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                placeholder="e.g. John Smith"
                autoFocus
                className="w-full rounded-lg border border-white/10 bg-[#0d0d15] px-4 py-3 text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Your role in this session</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setRole("interviewer")}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    role === "interviewer"
                      ? "border-purple-500/50 bg-purple-500/15 text-purple-300"
                      : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                  }`}
                >
                  <svg className="h-5 w-5 mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Interviewer
                </button>
                <button
                  onClick={() => setRole("candidate")}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    role === "candidate"
                      ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                      : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
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
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Join Interview Room
            </button>

            <button
              onClick={copyLink}
              className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-400 text-sm hover:border-white/20 transition-colors"
            >
              {copied ? "Link copied!" : "Copy room link to share"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-4">
          Powered by Jitsi Meet · No account needed to join
        </p>
      </div>
    </div>
  );
}
