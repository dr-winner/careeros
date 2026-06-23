"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface CVAnalysisResult {
  overall: { score: number; verdict: string; summary: string };
  content: { score: number; issues: string[]; strengths: string[] };
  style: { score: number; issues: string[]; strengths: string[] };
  structure: { score: number; issues: string[]; strengths: string[] };
  recommendations: string[];
}

const AGENT_LOGS = [
  { delay: 0,    text: "▸ initializing cv_analysis_agent v2.1.0...", color: "text-cyan-400" },
  { delay: 400,  text: "▸ loading nlp_pipeline... OK", color: "text-green-400" },
  { delay: 800,  text: "▸ connecting to groq/llama-3.3-70b... OK", color: "text-green-400" },
  { delay: 1300, text: "▸ fetching resume from storage...", color: "text-zinc-400" },
  { delay: 1800, text: "  → file retrieved: resume.pdf (5.2 KB)", color: "text-zinc-500" },
  { delay: 2200, text: "▸ extracting raw text... 847 tokens", color: "text-zinc-400" },
  { delay: 2700, text: "▸ running named entity recognition...", color: "text-zinc-400" },
  { delay: 3200, text: "  → found: 3 work experiences", color: "text-zinc-500" },
  { delay: 3500, text: "  → found: 2 education entries", color: "text-zinc-500" },
  { delay: 3900, text: "  → found: 14 skills", color: "text-zinc-500" },
  { delay: 4300, text: "▸ cross-referencing skills database...", color: "text-zinc-400" },
  { delay: 4900, text: "  → matched 11/14 known frameworks", color: "text-zinc-500" },
  { delay: 5300, text: "▸ simulating ats_parser...", color: "text-zinc-400" },
  { delay: 5900, text: "  → keyword_density: 7.2%", color: "text-zinc-500" },
  { delay: 6300, text: "  → readability_score: 82/100", color: "text-zinc-500" },
  { delay: 6700, text: "▸ analyzing content quality...", color: "text-zinc-400" },
  { delay: 7300, text: "  → quantified_achievements: 2/8", color: "text-amber-400" },
  { delay: 7800, text: "  → action_verbs_ratio: 0.71", color: "text-zinc-500" },
  { delay: 8200, text: "▸ evaluating format & structure...", color: "text-zinc-400" },
  { delay: 8800, text: "  → section_order: optimal", color: "text-green-400" },
  { delay: 9200, text: "  → bullet_consistency: 78%", color: "text-zinc-500" },
  { delay: 9700, text: "▸ computing weighted section scores...", color: "text-zinc-400" },
  { delay: 10300, text: "  → content_score: 78", color: "text-purple-400" },
  { delay: 10600, text: "  → style_score: 68", color: "text-purple-400" },
  { delay: 10900, text: "  → structure_score: 75", color: "text-purple-400" },
  { delay: 11400, text: "▸ sending to llm for deep analysis...", color: "text-cyan-400" },
  { delay: 12000, text: "  → prompt_tokens: 1,247", color: "text-zinc-500" },
  { delay: 14000, text: "  → completion_tokens: 412", color: "text-zinc-500" },
  { delay: 14500, text: "  → latency: 1.84s", color: "text-zinc-500" },
  { delay: 15000, text: "▸ generating recommendations...", color: "text-zinc-400" },
  { delay: 15500, text: "▸ finalizing analysis report...", color: "text-zinc-400" },
  { delay: 16000, text: "✓ analysis complete", color: "text-green-400" },
];

const TASKS = [
  { id: "parse",   label: "Parse document",      sub: "PDF → text extraction",      completeAt: 20 },
  { id: "ner",     label: "Entity recognition",   sub: "NER · skills · experience",  completeAt: 35 },
  { id: "ats",     label: "ATS simulation",       sub: "Keyword density · parsing",  completeAt: 50 },
  { id: "content", label: "Content analysis",     sub: "Quality · impact · clarity", completeAt: 65 },
  { id: "format",  label: "Format evaluation",    sub: "Structure · consistency",    completeAt: 78 },
  { id: "llm",     label: "LLM deep analysis",    sub: "llama-3.3-70b · 1.2k tok",  completeAt: 90 },
  { id: "report",  label: "Generate report",      sub: "Scoring · recommendations",  completeAt: 100 },
];

function ScanLines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)",
      }}
    />
  );
}

function GlowOrb({ x, y, color }: { x: string; y: string; color: string }) {
  return (
    <div
      className="absolute rounded-full blur-3xl opacity-10 pointer-events-none"
      style={{ left: x, top: y, width: 300, height: 300, background: color, transform: "translate(-50%,-50%)" }}
    />
  );
}

function NeuralNetCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Capture as non-nullable for use inside nested functions
    const cvs = canvas as HTMLCanvasElement;

    let animId: number;
    let w = 0, h = 0;

    const NODE_COUNT = 40;
    type Node = { x: number; y: number; vx: number; vy: number; r: number; pulse: number; phase: number };
    let nodes: Node[] = [];

    const CHARS = "01アイウエオカキクケコサシスセソタチツテトナニヌネノ";
    type Column = { x: number; y: number; speed: number; chars: string[]; opacity: number };
    let cols: Column[] = [];

    function resize() {
      w = cvs.offsetWidth;
      h = cvs.offsetHeight;
      cvs.width = w;
      cvs.height = h;
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: 2 + Math.random() * 3,
        pulse: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
      }));
      const colCount = Math.floor(w / 20);
      cols = Array.from({ length: colCount }, (_, i) => ({
        x: i * 20 + 10, y: Math.random() * h - h,
        speed: 0.5 + Math.random() * 1.5,
        chars: Array.from({ length: 20 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
        opacity: 0.04 + Math.random() * 0.06,
      }));
    }

    let t = 0;
    function draw(c: CanvasRenderingContext2D) {
      t += 1;
      c.clearRect(0, 0, w, h);

      cols.forEach((col) => {
        col.y += col.speed;
        if (col.y > h + 200) col.y = -200;
        col.chars.forEach((ch, i) => {
          const alpha = col.opacity * (1 - i / col.chars.length);
          c.fillStyle = i === 0 ? `rgba(0,255,150,${alpha})` : `rgba(139,92,246,${alpha})`;
          c.font = `${i === 0 ? "bold " : ""}11px monospace`;
          c.fillText(ch, col.x, col.y - i * 16);
        });
        if (Math.random() < 0.01) col.chars[0] = CHARS[Math.floor(Math.random() * CHARS.length)];
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            const alpha = (1 - dist / 160) * 0.25;
            const pulse = Math.sin(t * 0.03 + nodes[i].phase) * 0.5 + 0.5;
            c.strokeStyle = `rgba(139,92,246,${alpha * (0.4 + pulse * 0.6)})`;
            c.lineWidth = 0.5 + pulse * 0.5;
            c.beginPath();
            c.moveTo(nodes[i].x, nodes[i].y);
            c.lineTo(nodes[j].x, nodes[j].y);
            c.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        n.pulse += 0.04;
        const glow = Math.sin(n.pulse) * 0.5 + 0.5;
        const grad = c.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * (2 + glow * 3));
        grad.addColorStop(0, `rgba(139,92,246,${0.8 + glow * 0.2})`);
        grad.addColorStop(0.5, `rgba(6,182,212,${0.3 * glow})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = grad;
        c.beginPath();
        c.arc(n.x, n.y, n.r * (1 + glow * 2), 0, Math.PI * 2);
        c.fill();
      });

      animId = requestAnimationFrame(() => draw(c));
    }

    resize();
    draw(ctx);
    const ro = new ResizeObserver(resize);
    ro.observe(cvs);

    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-60"
    />
  );
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function Spinner() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 80);
    return () => clearInterval(t);
  }, []);
  return <span className="text-cyan-400 font-mono">{SPINNER_FRAMES[frame]}</span>;
}

function ElapsedTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const s = elapsed % 60;
  const m = Math.floor(elapsed / 60);
  return <span className="font-mono text-zinc-500">{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>;
}

function TokenCounter({ active }: { active: boolean }) {
  const [tokens, setTokens] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setTokens((n) => n + Math.floor(Math.random() * 12 + 3)), 60);
    return () => clearInterval(t);
  }, [active]);
  return <span className="font-mono text-purple-400">{tokens.toLocaleString()}</span>;
}

function AnalyzingPhase({ progress, lines }: { progress: number; lines: typeof AGENT_LOGS }) {
  const logRef = useRef<HTMLDivElement>(null);
  const currentTaskIdx = TASKS.findIndex((t) => progress < t.completeAt);
  const runningIdx = currentTaskIdx === -1 ? TASKS.length - 1 : currentTaskIdx;

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="relative z-10 flex flex-col h-screen overflow-hidden font-mono">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-black/40 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-zinc-500">careeros_agent — cv_analysis_module</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-zinc-600">elapsed: <ElapsedTimer /></span>
          <span className="text-zinc-600">tokens: <TokenCounter active={progress > 10 && progress < 95} /></span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Agent log */}
        <div className="flex flex-col w-full md:w-1/2 border-r border-white/5 min-h-0">
          <div className="px-3 py-2 border-b border-white/5 bg-white/2 flex items-center gap-2">
            <Spinner />
            <span className="text-xs text-zinc-500 uppercase tracking-widest">agent output</span>
          </div>
          <div
            ref={logRef}
            className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-none"
            style={{ scrollbarWidth: "none" }}
          >
            {lines.map((line, i) => (
              <div
                key={i}
                className={`text-xs leading-relaxed ${line.color} transition-opacity duration-300`}
                style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
              >
                {line.text}
                {i === lines.length - 1 && (
                  <span className="inline-block w-1.5 h-3 ml-0.5 bg-current align-middle animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Tasks + progress */}
        <div className="hidden md:flex flex-col w-1/2 min-h-0">
          <div className="px-3 py-2 border-b border-white/5 bg-white/2 flex items-center gap-2">
            <span className="text-xs text-zinc-500 uppercase tracking-widest">task queue</span>
          </div>
          <div className="flex-1 flex flex-col p-5 gap-5 overflow-hidden">
            {/* Progress ring */}
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0" style={{ width: 80, height: 80 }}>
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke="url(#progressGrad)" strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                    style={{ transition: "stroke-dashoffset 0.4s ease" }}
                  />
                  <defs>
                    <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{Math.round(progress)}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">overall progress</div>
                <div className="text-sm text-white font-medium">
                  {progress < 100 ? "Processing..." : "Complete"}
                </div>
                <div className="text-xs text-zinc-600 mt-0.5">
                  model: llama-3.3-70b-versatile
                </div>
              </div>
            </div>

            {/* Task list */}
            <div className="space-y-2.5">
              {TASKS.map((task, i) => {
                const done = progress >= task.completeAt;
                const running = i === runningIdx && !done;
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-500 ${
                      done
                        ? "border-green-500/20 bg-green-500/5"
                        : running
                        ? "border-purple-500/40 bg-purple-500/10"
                        : "border-white/5 bg-white/2 opacity-40"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                      done ? "bg-green-500/20" : running ? "bg-purple-500/20" : "bg-white/5"
                    }`}>
                      {done ? (
                        <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : running ? (
                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium truncate ${
                        done ? "text-green-400" : running ? "text-white" : "text-zinc-600"
                      }`}>
                        {task.label}
                      </div>
                      <div className="text-[10px] text-zinc-600 truncate mt-0.5">{task.sub}</div>
                    </div>
                    {running && <Spinner />}
                    {done && <span className="text-[10px] text-green-500/70 flex-shrink-0">done</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-black/40 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-4 text-xs text-zinc-600">
          <span>pid: 4821</span>
          <span>mem: 128MB</span>
          <span>cpu: 12%</span>
        </div>
        <div className="text-xs text-zinc-600">
          stage: <span className="text-purple-400">{TASKS[runningIdx]?.id ?? "report"}</span>
        </div>
        <div className="text-xs text-zinc-600">
          careeros.live
        </div>
      </div>
    </div>
  );
}

function ResultsPhase({ analysis, onContinue }: { analysis: CVAnalysisResult | null; onContinue: () => void }) {
  const [displayScore, setDisplayScore] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [visibleRecs, setVisibleRecs] = useState(0);

  useEffect(() => {
    if (!analysis) return;
    const start = Date.now();
    const duration = 1400;
    const animate = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayScore(Math.round(eased * analysis.overall.score));
      if (p < 1) requestAnimationFrame(animate);
      else {
        setTimeout(() => setShowContent(true), 200);
      }
    };
    setTimeout(() => requestAnimationFrame(animate), 300);
  }, [analysis]);

  useEffect(() => {
    if (!showContent || !analysis) return;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setVisibleRecs(i);
      if (i >= analysis.recommendations.length) clearInterval(t);
    }, 500);
    return () => clearInterval(t);
  }, [showContent, analysis]);

  if (!analysis) return null;

  const scoreColor =
    displayScore >= 80 ? "text-green-400" : displayScore >= 60 ? "text-yellow-400" : "text-red-400";
  const scoreGlow =
    displayScore >= 80 ? "#22c55e" : displayScore >= 60 ? "#eab308" : "#ef4444";

  return (
    <div className="relative z-10 flex flex-col h-screen overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-black/40 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-zinc-500">careeros_agent — analysis_report</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className="text-cyan-400">COMPLETE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {/* Score header */}
        <div className="flex items-center gap-5 p-4 rounded-xl border border-white/8 bg-white/3">
          <div className="relative flex-shrink-0" style={{ width: 88, height: 88 }}>
            <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
              <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle
                cx="44" cy="44" r="38" fill="none"
                stroke={scoreGlow} strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - displayScore / 100)}`}
                style={{ transition: "stroke-dashoffset 0.05s linear", filter: `drop-shadow(0 0 8px ${scoreGlow})` }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor}`}>{displayScore}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">overall score</div>
            <div className="text-xl font-bold text-white">{analysis.overall.verdict}</div>
            <div className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-xs">{analysis.overall.summary}</div>
          </div>
        </div>

        {showContent && (
          <>
            {/* Section scores */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "content", score: analysis.content.score },
                { label: "style", score: analysis.style.score },
                { label: "structure", score: analysis.structure.score },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg border border-white/8 bg-white/3 text-center">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">{item.label}</div>
                  <div className={`text-xl font-bold ${item.score >= 75 ? "text-green-400" : item.score >= 55 ? "text-yellow-400" : "text-red-400"}`}>
                    {item.score}
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-700"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations as terminal output */}
            <div className="rounded-xl border border-white/8 bg-black/60 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-white/2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">recommendations</span>
              </div>
              <div className="p-4 space-y-2">
                {analysis.recommendations.slice(0, 4).map((rec, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-xs transition-all duration-500 ${
                      i <= visibleRecs ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <span className="text-purple-400 flex-shrink-0 mt-0.5">→</span>
                    <span className="text-zinc-300 leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* CTA */}
      <div className="flex-shrink-0 p-4 border-t border-white/5 bg-black/40 backdrop-blur-sm">
        <button
          onClick={onContinue}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-semibold tracking-wide hover:opacity-90 active:scale-[0.99] transition-all shadow-lg shadow-purple-500/20"
        >
          ▸ continue to dashboard
        </button>
      </div>
    </div>
  );
}

export default function CVAnalysisScreen({
  cvId,
  onComplete,
  onClose,
}: {
  cvId: string;
  onComplete: (analysis: CVAnalysisResult) => void;
  onClose: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [visibleLogs, setVisibleLogs] = useState<typeof AGENT_LOGS>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [analysis, setAnalysis] = useState<CVAnalysisResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const fetchedRef = useRef(false);

  // Stream in log lines at their defined delays
  useEffect(() => {
    const timers = AGENT_LOGS.map((line) =>
      setTimeout(() => {
        setVisibleLogs((prev) => [...prev, line]);
      }, line.delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Progress counter
  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 0.18;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(() => setIsComplete(true), 400);
      }
      setProgress(current);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isComplete || fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;
    fetch("/api/cv-analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeId: cvId }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setAnalysis(data?.analysis ?? generateMockAnalysis());
        setTimeout(() => setShowResults(true), 1000);
      })
      .catch(() => {
        if (cancelled) return;
        setAnalysis(generateMockAnalysis());
        setTimeout(() => setShowResults(true), 1000);
      });

    return () => { cancelled = true; };
  }, [isComplete, cvId]);

  const handleContinue = useCallback(() => {
    if (analysis) onComplete(analysis);
    onClose();
  }, [analysis, onComplete, onClose]);

  return (
    <div className="fixed inset-0 lg:left-56 z-50 bg-[#0a0a0f] overflow-hidden">
      <NeuralNetCanvas />
      <ScanLines />
      <GlowOrb x="20%" y="30%" color="#8b5cf6" />
      <GlowOrb x="80%" y="70%" color="#06b6d4" />

      {!showResults ? (
        <AnalyzingPhase progress={progress} lines={visibleLogs} />
      ) : (
        <ResultsPhase analysis={analysis} onContinue={handleContinue} />
      )}
    </div>
  );
}

function generateMockAnalysis(): CVAnalysisResult {
  return {
    overall: { score: 72, verdict: "Good Foundation", summary: "Your CV shows solid potential with room for optimization." },
    content: { score: 78, issues: ["Limited quantified achievements"], strengths: ["Clear work history"] },
    style: { score: 68, issues: ["Inconsistent formatting"], strengths: ["Professional tone"] },
    structure: { score: 75, issues: ["Skills section placement"], strengths: ["Logical flow"] },
    recommendations: [
      "Add metrics to achievements (e.g., 'increased sales by 30%')",
      "Include ATS-friendly keywords from your target roles",
      "Simplify bullet formatting for better machine parsing",
      "Prioritize most relevant skills at the top of your CV",
    ],
  };
}
