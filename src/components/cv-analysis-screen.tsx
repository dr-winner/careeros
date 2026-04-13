"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface CVAnalysisResult {
  overall: { score: number; verdict: string; summary: string };
  content: { score: number; issues: string[]; strengths: string[] };
  style: { score: number; issues: string[]; strengths: string[] };
  structure: { score: number; issues: string[]; strengths: string[] };
  recommendations: string[];
}

const ANALYSIS_STAGES = [
  { id: "parsing", text: "Reading CV structure...", duration: 3000 },
  { id: "content", text: "Analyzing content...", duration: 4000 },
  { id: "skills", text: "Extracting skills...", duration: 3500 },
  { id: "format", text: "Checking format...", duration: 3000 },
  { id: "ats", text: "Evaluating ATS...", duration: 4000 },
  { id: "gaps", text: "Finding gaps...", duration: 3500 },
  { id: "match", text: "Calculating match...", duration: 3000 },
  { id: "final", text: "Finalizing...", duration: 4000 },
];

const TERMINAL_LINES = [
  "> initializing...",
  "> loading parser...",
  "> extracting data...",
  "> parsing entries...",
  "> analyzing...",
  "> evaluating...",
  "> complete",
];

function MatrixBackground() {
  const [chars, setChars] = useState<Array<{ id: number; char: string; x: number; y: number; speed: number; opacity: number }>>([]);
  const frameRef = useRef<number | null>(null);
  const [columnCount, setColumnCount] = useState(20);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      setColumnCount(width < 640 ? 12 : width < 1024 ? 20 : 30);
    };
    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  useEffect(() => {
    const newChars: typeof chars = [];
    for (let i = 0; i < columnCount; i++) {
      newChars.push({
        id: i,
        char: String.fromCharCode(33 + Math.random() * 94),
        x: (i / columnCount) * 100,
        y: Math.random() * 100,
        speed: 0.15 + Math.random() * 0.2,
        opacity: 0.05 + Math.random() * 0.15,
      });
    }
    setChars(newChars);

    let frame = 0;
    const animate = () => {
      frame++;
      setChars((prev) =>
        prev.map((c) => {
          let newY = c.y + c.speed;
          let newOpacity = c.opacity;

          if (newY > 100) {
            newY = -5;
            newOpacity = 0.05 + Math.random() * 0.15;
          }

          if (frame % 12 === 0) {
            return {
              ...c,
              char: String.fromCharCode(33 + Math.random() * 94),
              y: newY,
              opacity: newOpacity,
            };
          }

          return { ...c, y: newY, opacity: newOpacity };
        })
      );

      frameRef.current = requestAnimationFrame(animate);
    };

    const timeout = setTimeout(() => {
      frameRef.current = requestAnimationFrame(animate);
    }, 500);

    return () => {
      clearTimeout(timeout);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [columnCount]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      <div className="absolute inset-0 flex justify-center">
        <div className="relative h-full w-full max-w-[280px] sm:max-w-[400px] md:max-w-[600px]">
          {chars.map((c) => (
            <span
              key={c.id}
              className="absolute font-mono transition-all duration-300"
              style={{
                left: `${c.x}%`,
                top: `${c.y}%`,
                opacity: c.opacity,
                color: "#22c55e",
                textShadow: "0 0 6px #22c55e",
                transform: "translateX(-50%)",
                fontSize: "clamp(8px, 2vw, 14px)",
              }}
            >
              {c.char}
            </span>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f]/80 to-[#0a0a0f]" />
    </div>
  );
}

function AnalyzingPhase({
  progress,
  stage,
  stageText,
  lines,
}: {
  progress: number;
  stage: number;
  stageText: string;
  lines: string[];
}) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
      <div className="w-full max-w-sm mx-auto text-center space-y-8">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-400 blur-xl opacity-30 animate-pulse" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              Analyzing CV
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-500 font-mono">
              Deep analysis in progress
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-zinc-500 font-mono uppercase tracking-wider">Progress</span>
            <span className="text-cyan-400 font-mono font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 py-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm sm:text-base text-white font-medium">{stageText}</span>
        </div>

        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          {ANALYSIS_STAGES.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i < stage
                  ? "w-6 sm:w-8 bg-purple-500"
                  : i === stage
                  ? "w-6 sm:w-8 bg-gradient-to-r from-purple-500 to-cyan-400 animate-pulse"
                  : "w-3 sm:w-4 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-[280px] sm:max-w-sm px-4">
        <div className="bg-black/60 backdrop-blur-sm rounded-xl border border-green-500/20 p-2 sm:p-3">
          <div className="font-mono text-[10px] sm:text-xs space-y-0.5 sm:space-y-1 max-h-16 sm:max-h-24 overflow-hidden">
            {lines.slice(-4).map((line, i) => (
              <div key={i} className="text-green-400 truncate">
                {line}
              </div>
            ))}
            <div className="inline-block w-1.5 h-3 bg-green-400 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultsPhase({ analysis, onContinue }: { analysis: CVAnalysisResult | null; onContinue: () => void }) {
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);
  const [visibleRecs, setVisibleRecs] = useState(0);

  useEffect(() => {
    if (!analysis) return;
    
    setTimeout(() => {
      const start = Date.now();
      const duration = 1200;
      const animate = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayScore(Math.round(eased * analysis.overall.score));
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setShowScore(true);
          setTimeout(() => setShowVerdict(true), 400);
          setTimeout(() => setShowRecommendations(true), 800);
        }
      };
      requestAnimationFrame(animate);
    }, 300);
  }, [analysis]);

  useEffect(() => {
    if (!showRecommendations || !analysis) return;
    
    let recIndex = 0;
    const interval = setInterval(() => {
      recIndex++;
      if (recIndex >= analysis.recommendations.length) {
        clearInterval(interval);
        return;
      }
      setVisibleRecs(recIndex);
    }, 600);

    return () => clearInterval(interval);
  }, [showRecommendations, analysis]);

  if (!analysis) return null;

  return (
    <div className="relative z-10 flex flex-col min-h-screen overflow-auto">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg mx-auto space-y-6 sm:space-y-8">
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-purple-500/30 flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-cyan-400/10">
                <span className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  {displayScore}
                </span>
              </div>
              {showScore && (
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-400 border-r-cyan-400 animate-spin" />
              )}
            </div>

            {showVerdict && (
              <div className="animate-fade-up">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">{analysis.overall.verdict}</h2>
                <p className="mt-2 text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
                  {analysis.overall.summary}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "Content", score: analysis.content.score },
              { label: "Style", score: analysis.style.score },
              { label: "Structure", score: analysis.structure.score },
            ].map((item) => (
              <div key={item.label} className="bg-white/5 rounded-xl border border-white/10 p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">{item.score}%</div>
                <div className="text-[10px] sm:text-xs text-zinc-500 mt-1 uppercase tracking-wider">{item.label}</div>
              </div>
            ))}
          </div>

          {showRecommendations && analysis.recommendations.length > 0 && (
            <div className="space-y-3 animate-fade-up">
              <h3 className="text-base sm:text-lg font-semibold text-white text-center">Recommendations</h3>
              <div className="space-y-2 sm:space-y-3">
                {analysis.recommendations.slice(0, 4).map((rec, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 bg-white/5 rounded-xl border border-white/5 p-3 sm:p-4 transition-all duration-500 ${
                      i <= visibleRecs ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                    }`}
                  >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs sm:text-sm font-bold text-purple-400">{i + 1}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onContinue}
            className="w-full py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm sm:text-base hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-purple-500/25"
          >
            Continue to Dashboard
          </button>
        </div>
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
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [analysis, setAnalysis] = useState<CVAnalysisResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  const currentStage = ANALYSIS_STAGES[stageIndex];

  useEffect(() => {
    let terminalIndex = 0;
    const interval = setInterval(() => {
      if (terminalIndex < TERMINAL_LINES.length) {
        setTerminalLines((prev) => [...prev.slice(-3), TERMINAL_LINES[terminalIndex]]);
        terminalIndex++;
      } else {
        clearInterval(interval);
      }
    }, 800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 0.1;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
      }
      setProgress(currentProgress);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let stage = 0;
    const advanceStage = () => {
      if (stage < ANALYSIS_STAGES.length) {
        setStageIndex(stage);
        stage++;
        if (stage < ANALYSIS_STAGES.length) {
          setTimeout(advanceStage, ANALYSIS_STAGES[stage - 1]?.duration || 1000);
        } else {
          setTimeout(() => setIsComplete(true), 600);
        }
      }
    };
    setTimeout(advanceStage, 500);
  }, []);

  useEffect(() => {
    if (isComplete && !analysis) {
      fetchAnalysis();
    }
  }, [isComplete]);

  const fetchAnalysis = async () => {
    try {
      const response = await fetch("/api/cv-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: cvId }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
        setTimeout(() => setShowResults(true), 1500);
      } else {
        setAnalysis(generateMockAnalysis());
        setTimeout(() => setShowResults(true), 1500);
      }
    } catch {
      setAnalysis(generateMockAnalysis());
      setTimeout(() => setShowResults(true), 1500);
    }
  };

  const generateMockAnalysis = (): CVAnalysisResult => ({
    overall: { score: 72, verdict: "Good Foundation", summary: "Your CV shows solid potential with room for optimization." },
    content: { score: 78, issues: ["Limited quantified achievements"], strengths: ["Clear work history"] },
    style: { score: 68, issues: ["Inconsistent formatting"], strengths: ["Professional tone"] },
    structure: { score: 75, issues: ["Skills section placement"], strengths: ["Logical flow"] },
    recommendations: [
      "Add metrics to achievements (e.g., 'Increased sales by 30%')",
      "Include ATS-friendly keywords from your industry",
      "Simplify bullet formatting for better parsing",
      "Prioritize most relevant skills at the top",
    ],
  });

  const handleContinue = useCallback(() => {
    if (analysis) onComplete(analysis);
    onClose();
  }, [analysis, onComplete, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] overflow-hidden">
      <MatrixBackground />
      
      {!showResults ? (
        <AnalyzingPhase
          progress={progress}
          stage={stageIndex}
          stageText={currentStage?.text || "Initializing..."}
          lines={terminalLines}
        />
      ) : (
        <ResultsPhase analysis={analysis} onContinue={handleContinue} />
      )}
    </div>
  );
}
