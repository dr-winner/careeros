"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatInterviewClock } from "@/lib/interview-live";
import {
  playLocalPreview,
  setTrackEnabled,
  type InterviewMedia,
} from "@/lib/interview-media";
import {
  canUseSpeechRecognition,
  canUseSpeechSynthesis,
  createSpeechRecognition,
  speakInterviewLine,
  stopInterviewSpeech,
  type SpeechRecognitionLike,
} from "@/lib/speech";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Feedback = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  improvementTips: string[];
  betterSampleAnswer: string;
};

export default function LiveAiInterview({
  role,
  experienceLevel,
  media,
  messages,
  isLoading,
  feedback,
  onSend,
  onFeedback,
  onEnd,
  saving,
}: {
  role: string;
  experienceLevel: string;
  media: InterviewMedia;
  messages: ChatMessage[];
  isLoading: boolean;
  feedback: Feedback | null;
  onSend: (text: string) => Promise<void>;
  onFeedback: () => void;
  onEnd: () => void;
  saving: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const setVideoNode = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      void playLocalPreview(node, media.stream);
    },
    [media.stream],
  );
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false);
  const lastSpokenRef = useRef("");
  const silenceTimerRef = useRef<number | null>(null);
  const draftRef = useRef("");
  const levelRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [elapsed, setElapsed] = useState(0);
  const [camOn, setCamOn] = useState(media.hasVideo);
  const [micOn, setMicOn] = useState(media.hasAudio);
  const [listening, setListening] = useState(false);
  const [draft, setDraft] = useState("");
  const [interim, setInterim] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [typedOpen, setTypedOpen] = useState(false);
  const [speechOk, setSpeechOk] = useState(false);
  const [ttsOk, setTtsOk] = useState(false);
  const [level, setLevel] = useState(0);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    const rec = canUseSpeechRecognition();
    setSpeechOk(rec);
    setTtsOk(canUseSpeechSynthesis());
    setTypedOpen(!rec);
  }, []);

  useEffect(() => {
    const tick = window.setInterval(() => setElapsed(Date.now() - startedAtRef.current), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    void playLocalPreview(video, media.stream);
    return () => {
      recRef.current?.abort();
      stopInterviewSpeech();
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, [media.stream]);

  useEffect(() => {
    if (!media.hasAudio) return;
    let raf = 0;
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(media.stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      levelRef.current = analyser;
      const data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      const loop = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setLevel(Math.min(1, avg / 80));
        raf = window.requestAnimationFrame(loop);
      };
      void ctx.resume();
      loop();
    } catch {
      // metre is optional
    }
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [media.hasAudio, media.stream]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.content || "";
  const waitingOnYou = !isLoading && !speaking && messages.at(-1)?.role === "assistant";

  useEffect(() => {
    if (!lastAssistant || voiceMuted || !ttsOk) return;
    if (lastSpokenRef.current === lastAssistant) return;
    lastSpokenRef.current = lastAssistant;
    let cancelled = false;
    setSpeaking(true);
    speakInterviewLine(lastAssistant).finally(() => {
      if (!cancelled) setSpeaking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [lastAssistant, ttsOk, voiceMuted]);

  const submitDraft = useCallback(async () => {
    const text = (draftRef.current || draft).trim();
    if (!text || isLoading || speaking) return;
    draftRef.current = "";
    setDraft("");
    setInterim("");
    listeningRef.current = false;
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
    await onSend(text);
  }, [draft, isLoading, onSend, speaking]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!speechOk || !micOn || isLoading || speaking || listeningRef.current) return;
    recRef.current?.abort();
    const rec = createSpeechRecognition();
    if (!rec) {
      setTypedOpen(true);
      return;
    }
    recRef.current = rec;
    listeningRef.current = true;
    setListening(true);
    rec.onresult = (event) => {
      let finalText = "";
      let live = "";
      for (let i = 0; i < event.results.length; i++) {
        const piece = event.results[i];
        if (piece.isFinal) finalText += piece[0].transcript;
        else live += piece[0].transcript;
      }
      if (finalText) {
        setDraft((prev) => {
          const next = `${prev} ${finalText}`.trim();
          draftRef.current = next;
          return next;
        });
      }
      setInterim(live);
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = window.setTimeout(() => {
        if (draftRef.current.trim()) void submitDraft();
      }, 1600);
    };
    rec.onerror = (event) => {
      if (event.error === "not-allowed") setTypedOpen(true);
    };
    rec.onend = () => {
      if (listeningRef.current) {
        try {
          rec.start();
        } catch {
          listeningRef.current = false;
          setListening(false);
        }
      }
    };
    try {
      rec.start();
    } catch {
      setTypedOpen(true);
      listeningRef.current = false;
      setListening(false);
    }
  }, [isLoading, micOn, speaking, speechOk, submitDraft]);

  useEffect(() => {
    if (waitingOnYou && micOn && speechOk) startListening();
    if (!waitingOnYou || !micOn) stopListening();
  }, [waitingOnYou, micOn, speechOk, startListening, stopListening]);

  const toggleCam = () => {
    const next = !camOn;
    setTrackEnabled(media.stream, "video", next);
    setCamOn(next);
  };

  const toggleMic = () => {
    const next = !micOn;
    setTrackEnabled(media.stream, "audio", next);
    setMicOn(next);
    if (!next) stopListening();
  };

  return (
    <div className="rounded-2xl border border-red-500/20 bg-[#0d0d18] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#131320]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/15 border border-red-500/25">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="mono text-[10px] text-red-300">LIVE</span>
          </span>
          <span className="mono text-sm text-white tabular-nums">{formatInterviewClock(elapsed)}</span>
          <span className="text-xs text-zinc-500 hidden sm:inline">
            {role} · {experienceLevel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {ttsOk && (
            <button
              type="button"
              onClick={() => {
                setVoiceMuted((v) => !v);
                stopInterviewSpeech();
                setSpeaking(false);
              }}
              className="mono text-[10px] text-zinc-500 hover:text-zinc-300"
            >
              {voiceMuted ? "Interviewer muted" : "Mute interviewer"}
            </button>
          )}
          <button
            type="button"
            onClick={onEnd}
            disabled={saving}
            className="mono text-[10px] text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            {saving ? "Saving…" : "End live interview"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-3 p-3">
        <div className="relative min-h-[240px] rounded-2xl overflow-hidden border border-white/[0.08] bg-[#11111a]">
          <div
            className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(139,92,246,0.28),transparent_55%)] ${
              speaking ? "animate-glow-pulse" : ""
            }`}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div
              className={`h-20 w-20 rounded-full border-2 flex items-center justify-center mb-3 ${
                speaking ? "border-purple-400 shadow-[0_0_40px_rgba(139,92,246,0.45)]" : "border-purple-500/40"
              }`}
            >
              <span className="text-sm font-bold text-purple-200">AI</span>
            </div>
            <p className="mono text-[10px] uppercase tracking-widest text-zinc-500">Interviewer</p>
            <p className="text-sm text-zinc-300 mt-1">
              {speaking ? "Speaking" : listening ? "Listening to you" : isLoading ? "Thinking" : "On the call"}
            </p>
          </div>
          {lastAssistant && (
            <div className="absolute left-3 right-3 bottom-3 rounded-xl bg-black/55 border border-white/[0.06] p-3">
              <p className="text-xs text-zinc-200 leading-relaxed line-clamp-4">{lastAssistant}</p>
            </div>
          )}
        </div>

        <div className="relative min-h-[240px] rounded-2xl overflow-hidden border border-white/[0.08] bg-[#11111a]">
          <video
            ref={setVideoNode}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 h-full w-full object-cover scale-x-[-1] ${camOn ? "" : "opacity-0"}`}
          />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <p className="text-sm text-zinc-500">{media.hasVideo ? "Camera off" : "No camera"}</p>
            </div>
          )}
          <div className="absolute left-3 right-3 bottom-3 flex items-end justify-between gap-2">
            <div>
              <p className="mono text-[10px] uppercase tracking-widest text-zinc-400">You</p>
              <p className="text-sm font-medium text-white">Candidate</p>
            </div>
            <div className="flex items-end gap-0.5 h-6" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-green-400"
                  style={{
                    height: `${Math.max(12, micOn ? level * (40 + i * 8) : 12)}%`,
                    opacity: micOn ? 0.5 + level : 0.2,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {(draft || interim) && (
          <p className="text-sm text-zinc-300 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
            {draft} {interim && <span className="text-zinc-500">{interim}</span>}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleMic}
            disabled={!media.hasAudio}
            className={`flex-1 min-w-[140px] py-3.5 rounded-xl text-sm font-bold press-scale disabled:opacity-40 ${
              micOn ? "bg-green-600 text-white" : "bg-red-600 text-white"
            }`}
          >
            {micOn ? (listening ? "Mic live · listening" : "Mic on") : "Mic muted"}
          </button>
          <button
            type="button"
            onClick={toggleCam}
            disabled={!media.hasVideo}
            className="px-3 py-3 rounded-xl border border-white/[0.08] text-xs text-zinc-300 hover:border-white/20 disabled:opacity-40"
          >
            {camOn ? "Camera off" : "Camera on"}
          </button>
          <button
            type="button"
            onClick={() => setTypedOpen((v) => !v)}
            className="px-3 py-3 rounded-xl border border-white/[0.08] text-xs text-zinc-300 hover:border-white/20"
          >
            {typedOpen ? "Hide keyboard" : "Type instead"}
          </button>
          {draft && (
            <button
              type="button"
              onClick={submitDraft}
              disabled={isLoading}
              className="px-3 py-3 rounded-xl bg-purple-600 text-white text-xs font-medium disabled:opacity-40"
            >
              Send answer
            </button>
          )}
        </div>

        {typedOpen && (
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                draftRef.current = e.target.value;
              }}
              placeholder="Type your answer…"
              rows={2}
              className="flex-1 agent-input text-sm py-2.5 resize-none"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={submitDraft}
              disabled={isLoading || !draft.trim()}
              className="px-4 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-40"
            >
              Send
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="mono text-[10px] text-zinc-600">
            Camera and mic stay on this device. Pause after you speak and your answer is sent.
          </p>
          {messages.some((m) => m.role === "user") && (
            <button
              type="button"
              onClick={onFeedback}
              disabled={isLoading}
              className="mono text-[10px] text-purple-400 hover:text-purple-300"
            >
              Score last answer
            </button>
          )}
        </div>

        {feedback && (
          <div className="rounded-xl border border-white/[0.08] bg-[#131320] p-4">
            <p className="mono text-xs text-white mb-2">Last answer · {feedback.score}/10</p>
            <p className="text-xs text-zinc-400">{feedback.strengths[0]}</p>
          </div>
        )}
      </div>
    </div>
  );
}
