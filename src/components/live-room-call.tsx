"use client";

import { useCallback, useEffect, useRef, useState, type RefObject, type ReactNode } from "react";
import { formatInterviewClock } from "@/lib/interview-live";
import { playLocalPreview, setTrackEnabled, type InterviewMedia } from "@/lib/interview-media";
import { shouldCreateOffer, type InterviewSignal } from "@/lib/interview-signal";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

type CallStatus = "waiting" | "connecting" | "live" | "failed";

export default function LiveRoomCall({
  roomCode,
  displayName,
  seat,
  roleTitle,
  experienceLevel,
  media,
  onLeave,
}: {
  roomCode: string;
  displayName: string;
  seat: "interviewer" | "candidate";
  roleTitle?: string;
  experienceLevel?: string;
  media: InterviewMedia;
  onLeave: () => void;
}) {
  const peerIdRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `p-${Math.random().toString(36).slice(2)}`,
  );
  const lastSeqRef = useRef(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const makingOfferRef = useRef(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [status, setStatus] = useState<CallStatus>("waiting");
  const [elapsed, setElapsed] = useState(0);
  const [micOn, setMicOn] = useState(media.hasAudio);
  const [camOn, setCamOn] = useState(media.hasVideo);
  const [error] = useState(
    media.hasAudio && media.hasVideo ? "" : "One of camera or microphone is unavailable — continuing with what we have.",
  );
  const [remoteName, setRemoteName] = useState("Waiting…");
  const [mediaReady, setMediaReady] = useState(false);
  const startedAtRef = useRef(Date.now());

  const postSignal = useCallback(
    async (type: InterviewSignal["type"], payload: unknown = null) => {
      await fetch(`/api/interview-rooms/${roomCode}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId: peerIdRef.current, type, payload }),
      });
    },
    [roomCode],
  );

  const attachLocal = useCallback((stream: MediaStream) => {
    localStreamRef.current = stream;
    void playLocalPreview(localVideoRef.current, stream);
  }, []);

  const ensurePeer = useCallback(async () => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    const stream = localStreamRef.current;
    stream?.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        postSignal("ice", event.candidate.toJSON()).catch(() => {});
      }
    };
            pc.ontrack = (event) => {
      const [remote] = event.streams;
      if (remoteVideoRef.current && remote) {
        remoteVideoRef.current.srcObject = remote;
        void remoteVideoRef.current.play().catch(() => {});
      }
      setStatus("live");
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setStatus("live");
      if (pc.connectionState === "failed") setStatus("failed");
      if (pc.connectionState === "disconnected") setStatus("waiting");
    };
    return pc;
  }, [postSignal]);

  useEffect(() => {
    attachLocal(media.stream);
    setMediaReady(true);
  }, [attachLocal, media.stream]);

  useEffect(() => {
    const video = localVideoRef.current;
    void playLocalPreview(video, media.stream);
  }, [media.stream, mediaReady]);

  useEffect(() => {
    const tick = window.setInterval(() => setElapsed(Date.now() - startedAtRef.current), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!mediaReady) return;
    let stopped = false;

    const handle = async (signal: InterviewSignal) => {
      if (signal.peerId === peerIdRef.current) return;
      if (signal.type === "hello") {
        const name =
          signal.payload && typeof signal.payload === "object" && "name" in signal.payload
            ? String((signal.payload as { name?: string }).name || "")
            : "";
        if (name) setRemoteName(name);
        if (shouldCreateOffer(peerIdRef.current, signal.peerId) && !makingOfferRef.current) {
          makingOfferRef.current = true;
          setStatus("connecting");
          const pc = await ensurePeer();
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await postSignal("offer", offer);
        }
        return;
      }
      if (signal.type === "offer") {
        setStatus("connecting");
        const pc = await ensurePeer();
        await pc.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await postSignal("answer", answer);
        return;
      }
      if (signal.type === "answer") {
        const pc = pcRef.current;
        if (pc && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
        }
        return;
      }
      if (signal.type === "ice") {
        const pc = await ensurePeer();
        try {
          await pc.addIceCandidate(signal.payload as RTCIceCandidateInit);
        } catch {
          // candidate arrived before remote description
        }
        return;
      }
      if (signal.type === "bye") {
        makingOfferRef.current = false;
        pcRef.current?.close();
        pcRef.current = null;
        setStatus("waiting");
        setRemoteName("They left");
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      }
    };

    const poll = async () => {
      if (stopped) return;
      try {
        const res = await fetch(
          `/api/interview-rooms/${roomCode}/signal?after=${lastSeqRef.current}`,
        );
        const data = await res.json();
        const signals = (data.signals || []) as InterviewSignal[];
        for (const signal of signals) {
          lastSeqRef.current = Math.max(lastSeqRef.current, signal.seq);
          await handle(signal);
        }
      } catch {
        // keep polling
      }
    };

    postSignal("hello", { name: displayName, seat }).catch(() => {});
    const id = window.setInterval(poll, 800);
    poll();

    return () => {
      stopped = true;
      window.clearInterval(id);
      postSignal("bye", null).catch(() => {});
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, [displayName, ensurePeer, mediaReady, postSignal, roomCode, seat]);

  const toggleMic = () => {
    const next = !micOn;
    setTrackEnabled(media.stream, "audio", next);
    setMicOn(next);
  };

  const toggleCam = () => {
    const next = !camOn;
    setTrackEnabled(media.stream, "video", next);
    setCamOn(next);
  };

  const jitsiBackup = `https://meet.jit.si/careeros-${roomCode}`;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 grid lg:grid-cols-2 gap-3 p-3 min-h-0">
        <CallTile
          videoRef={remoteVideoRef}
          label={seat === "candidate" ? "Interviewer" : "Candidate"}
          name={remoteName}
          live={status === "live"}
          placeholder={status === "waiting" ? "Waiting for the other person to join" : status === "connecting" ? "Connecting…" : status === "failed" ? "Connection failed" : ""}
        />
        <CallTile
          videoRef={localVideoRef}
          label="You"
          name={displayName}
          live={camOn}
          mirrored
          muted
        />
      </div>

      {error && (
        <p className="mx-3 mb-2 text-xs text-amber-400">{error}</p>
      )}
      {status === "failed" && (
        <p className="mx-3 mb-2 text-xs text-zinc-400">
          Some mobile networks block peer-to-peer video.{" "}
          <a href={jitsiBackup} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
            Open a backup Jitsi call
          </a>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-white/[0.06] bg-[#0d0d18]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/15 border border-red-500/25">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="mono text-[10px] text-red-300">LIVE</span>
          </span>
          <span className="mono text-sm text-white tabular-nums">{formatInterviewClock(elapsed)}</span>
          <span className="text-xs text-zinc-500 hidden sm:inline">
            {roleTitle}
            {experienceLevel ? ` · ${experienceLevel}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ControlButton onClick={toggleMic} active={micOn} label={micOn ? "Mute" : "Unmute"}>
            {micOn ? "Mic" : "Muted"}
          </ControlButton>
          <ControlButton onClick={toggleCam} active={camOn} label={camOn ? "Camera off" : "Camera on"}>
            {camOn ? "Cam" : "Cam off"}
          </ControlButton>
          <button
            type="button"
            onClick={onLeave}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-500 press-scale"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

function CallTile({
  videoRef,
  label,
  name,
  live,
  placeholder,
  mirrored,
  muted,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  label: string;
  name: string;
  live: boolean;
  placeholder?: string;
  mirrored?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="relative min-h-[220px] rounded-2xl overflow-hidden border border-white/[0.08] bg-[#11111a]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`absolute inset-0 h-full w-full object-cover ${mirrored ? "scale-x-[-1]" : ""}`}
      />
      {placeholder && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="text-sm text-zinc-500">{placeholder}</p>
        </div>
      )}
      <div className="absolute left-3 bottom-3 right-3 flex items-end justify-between gap-2">
        <div>
          <p className="mono text-[10px] uppercase tracking-widest text-zinc-400">{label}</p>
          <p className="text-sm font-medium text-white">{name}</p>
        </div>
        {live && <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_12px_#22c55e]" />}
      </div>
    </div>
  );
}

function ControlButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`px-3 py-2 rounded-xl text-xs font-medium border press-scale ${
        active
          ? "border-white/[0.1] bg-white/[0.05] text-zinc-200"
          : "border-red-500/30 bg-red-500/10 text-red-300"
      }`}
    >
      {children}
    </button>
  );
}
