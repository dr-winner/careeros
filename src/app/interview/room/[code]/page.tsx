"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import LiveRoomCall from "@/components/live-room-call";
import { acquireInterviewMedia, mediaErrorMessage, stopInterviewMedia, type InterviewMedia } from "@/lib/interview-media";

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
  const [media, setMedia] = useState<InterviewMedia | null>(null);
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("role");
    if (q === "interviewer" || q === "candidate") setRole(q);
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

  const joinRoom = async () => {
    if (!displayName.trim() || joining) return;
    setJoinError("");
    setJoining(true);
    try {
      const next = await acquireInterviewMedia();
      setMedia(next);
      setJoined(true);
    } catch (err) {
      setJoinError(mediaErrorMessage(err));
    } finally {
      setJoining(false);
    }
  };

  const leaveRoom = () => {
    stopInterviewMedia(media?.stream);
    setMedia(null);
    setJoined(false);
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

  if (joined && media) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
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
            <span className={`mono text-[10px] px-2 py-0.5 rounded-lg border ${
              role === "interviewer"
                ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
            }`}>
              {role === "interviewer" ? "Interviewer" : "Candidate"}
            </span>
          </div>
        </div>

        <LiveRoomCall
          roomCode={roomCode}
          displayName={displayName}
          seat={role}
          roleTitle={room?.role}
          experienceLevel={room?.experienceLevel}
          media={media}
          onLeave={leaveRoom}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[350px] h-[350px] rounded-full bg-green-500/5 blur-[110px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white">CareerOS</span>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] overflow-hidden animate-fade-up">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
          <div className="p-7">
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
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Your name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                  placeholder="e.g. Ama Mensah"
                  autoFocus
                  className="agent-input w-full"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Your seat in this call</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRole("interviewer")}
                    className={`py-3.5 rounded-xl border text-sm font-medium transition-all press-scale ${
                      role === "interviewer"
                        ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                        : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                    }`}
                  >
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
                    Candidate
                  </button>
                </div>
              </div>

              {joinError && (
                <p className="text-xs text-amber-400">{joinError}</p>
              )}

              <button
                onClick={joinRoom}
                disabled={!displayName.trim() || joining}
                className="agent-button-primary w-full justify-center py-3.5 text-sm font-bold press-scale disabled:opacity-40"
              >
                {joining ? "Starting camera & mic…" : "Join live interview"}
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
          Camera and mic stay in your browser · no account needed to join
        </p>
      </div>
    </div>
  );
}
