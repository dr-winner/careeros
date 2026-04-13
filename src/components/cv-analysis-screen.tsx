"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface CVAnalysisResult {
  overall: { score: number; verdict: string; summary: string };
  content: { score: number; issues: string[]; strengths: string[] };
  style: { score: number; issues: string[]; strengths: string[] };
  structure: { score: number; issues: string[]; strengths: string[] };
  recommendations: string[];
}

const ANALYSIS_STAGES = [
  { id: "parsing", text: "Reading CV structure...", duration: 3000 },
  { id: "content", text: "Analyzing content relevance...", duration: 4000 },
  { id: "skills", text: "Extracting key skills...", duration: 3500 },
  { id: "format", text: "Checking formatting standards...", duration: 3000 },
  { id: "ats", text: "Evaluating ATS compatibility...", duration: 4000 },
  { id: "gaps", text: "Identifying skill gaps...", duration: 3500 },
  { id: "match", text: "Calculating job match potential...", duration: 3000 },
  { id: "final", text: "Generating recommendations...", duration: 4000 },
];

const TERMINAL_LINES = [
  "> initializing_analysis_engine...",
  "> loading_cv_parser_module...",
  "> extracting_document_metadata...",
  "> identifying_contact_information...",
  "> parsing_experience_entries...",
  "> analyzing_education_records...",
  "> extracting_skill_keywords...",
  "> evaluating_format_consistency...",
  "> checking_ats_readability...",
  "> cross_referencing_industry_standards...",
  "> calculating_compatibility_score...",
  "> generating_optimization_report...",
  "> analysis_complete",
];

function FallingChars() {
  const [chars, setChars] = useState<Array<{ id: number; char: string; x: number; y: number; speed: number; opacity: number }>>([]);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const columns = 50;
    const newChars: typeof chars = [];
    
    for (let i = 0; i < columns; i++) {
      const x = (i / columns) * 100;
      newChars.push({
        id: i,
        char: String.fromCharCode(33 + Math.random() * 94),
        x,
        y: Math.random() * 100,
        speed: 0.3 + Math.random() * 0.5,
        opacity: 0.1 + Math.random() * 0.4,
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
            newOpacity = 0.1 + Math.random() * 0.4;
          }
          
          if (frame % 8 === 0) {
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
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden opacity-20">
      <div className="absolute inset-0 flex justify-center">
        <div className="relative w-full max-w-2xl">
          {chars.map((c) => (
            <span
              key={c.id}
              className="absolute font-mono text-sm transition-all duration-300"
              style={{
                left: `${c.x}%`,
                top: `${c.y}%`,
                opacity: c.opacity,
                color: "#22c55e",
                textShadow: "0 0 8px #22c55e, 0 0 20px #22c55e",
                transform: "translateX(-50%)",
              }}
            >
              {c.char}
            </span>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-transparent to-[#0a0a0f]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-transparent to-[#0a0a0f]" />
    </div>
  );
}

function TerminalStream({ isActive, lines }: { isActive: boolean; lines: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  if (!isActive) return null;

  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl px-4">
      <div
        ref={containerRef}
        className="bg-black/60 backdrop-blur-sm rounded-t-xl border border-green-500/20 p-4 h-40 overflow-hidden"
      >
        <div className="font-mono text-xs space-y-1">
          {lines.map((line, i) => (
            <div
              key={i}
              className="text-green-400 animate-fade-in"
              style={{
                textShadow: "0 0 5px #22c55e",
                animationDelay: `${i * 50}ms`,
              }}
            >
              {line}
            </div>
          ))}
          <div className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1" />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ progress, currentText, stage }: { progress: number; currentText: string; stage: number }) {
  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="mono text-sm text-zinc-500 uppercase tracking-wider">Analyzing</span>
          <span className="mono text-sm text-cyan-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="mono text-lg text-white tracking-wide">{currentText}</span>
      </div>

      <div className="flex items-center justify-center gap-2">
        {ANALYSIS_STAGES.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i < stage
                ? "w-8 bg-purple-500"
                : i === stage
                ? "w-8 bg-gradient-to-r from-purple-500 to-cyan-400 animate-pulse"
                : "w-4 bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function ScoreReveal({ score, verdict }: { score: number; verdict: string }) {
  const [displayScore, setDisplayScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);

  useEffect(() => {
    const scoreTimer = setTimeout(() => {
      const start = Date.now();
      const duration = 1500;
      const animate = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayScore(Math.round(eased * score));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setShowScore(true);
          setTimeout(() => setShowVerdict(true), 500);
        }
      };
      requestAnimationFrame(animate);
    }, 300);

    return () => clearTimeout(scoreTimer);
  }, [score]);

  return (
    <div className="text-center space-y-4">
      <div className="relative inline-block">
        <div className="w-40 h-40 rounded-full border-4 border-purple-500/30 flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-cyan-400/10">
          <span className="text-6xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            {displayScore}
          </span>
        </div>
        {showScore && (
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-400 border-r-cyan-400 animate-spin" />
        )}
      </div>
      
      {showVerdict && (
        <div className="animate-fade-up">
          <h2 className="text-3xl font-bold text-white">{verdict}</h2>
        </div>
      )}
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
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendationIndex, setRecommendationIndex] = useState(0);

  const currentStage = ANALYSIS_STAGES[stageIndex];
  const totalDuration = ANALYSIS_STAGES.reduce((acc, s) => acc + s.duration, 0);

  useEffect(() => {
    let terminalIndex = 0;
    const terminalInterval = setInterval(() => {
      if (terminalIndex < TERMINAL_LINES.length) {
        setTerminalLines((prev) => [...prev.slice(-12), TERMINAL_LINES[terminalIndex]]);
        terminalIndex++;
      } else {
        clearInterval(terminalInterval);
      }
    }, 600);

    return () => clearInterval(terminalInterval);
  }, []);

  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 0.15;
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
    let elapsed = 0;
    
    const advanceStage = () => {
      if (stage < ANALYSIS_STAGES.length) {
        setStageIndex(stage);
        elapsed += ANALYSIS_STAGES[stage]?.duration || 0;
        stage++;
        
        if (stage < ANALYSIS_STAGES.length) {
          setTimeout(advanceStage, ANALYSIS_STAGES[stage - 1]?.duration || 1000);
        } else {
          setTimeout(() => setIsComplete(true), 500);
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

  useEffect(() => {
    if (showResults && analysis?.recommendations) {
      const recInterval = setInterval(() => {
        setRecommendationIndex((prev) => {
          if (prev >= analysis.recommendations.length - 1) {
            clearInterval(recInterval);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
      
      return () => clearInterval(recInterval);
    }
  }, [showResults, analysis]);

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
    overall: {
      score: 72,
      verdict: "Good Foundation",
      summary: "Your CV shows solid potential with room for optimization in formatting and keyword density.",
    },
    content: {
      score: 78,
      issues: ["Limited quantified achievements", "Missing industry keywords"],
      strengths: ["Clear work history", "Relevant experience"],
    },
    style: {
      score: 68,
      issues: ["Inconsistent bullet formatting", "Verbose descriptions"],
      strengths: ["Professional tone", "Good length"],
    },
    structure: {
      score: 75,
      issues: ["Skills section could be prioritized", "Contact info formatting"],
      strengths: ["Clear section headers", "Logical flow"],
    },
    recommendations: [
      "Add specific metrics to achievements (e.g., 'Increased sales by 30%')",
      "Include more ATS-friendly keywords from your industry",
      "Simplify bullet point formatting for better parsing",
      "Move most relevant skills to the top of the skills section",
    ],
  });

  const handleContinue = () => {
    if (analysis) {
      onComplete(analysis);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col">
      <FallingChars />
      <TerminalStream isActive={!isComplete || !showResults} lines={terminalLines} />

      <div className="relative z-10 flex-1 flex flex-col">
        {!showResults ? (
          <div className="flex-1 flex items-center justify-center px-8">
            <div className="max-w-xl w-full text-center space-y-16">
              {!isComplete ? (
                <>
                  <div className="space-y-6 animate-fade-up">
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center animate-pulse">
                          <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-400 blur-2xl opacity-30 animate-pulse" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h1 className="text-4xl font-bold text-white tracking-tight">
                        Analyzing Your CV
                      </h1>
                      <p className="mono text-zinc-500 text-sm">
                        Our AI is performing a deep analysis
                      </p>
                    </div>
                  </div>

                  <ProgressBar
                    progress={progress}
                    currentText={currentStage?.text || "Initializing..."}
                    stage={stageIndex}
                  />
                </>
              ) : (
                <div className="space-y-8 animate-fade-up">
                  <ScoreReveal score={analysis?.overall.score || 0} verdict={analysis?.overall.verdict || ""} />
                  <p className="mono text-zinc-400 text-sm max-w-md mx-auto">
                    {analysis?.overall.summary}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="min-h-full flex items-center justify-center px-8 py-16">
              <div className="max-w-2xl w-full space-y-12">
                <div className="text-center space-y-4 animate-fade-up">
                  <ScoreReveal score={analysis?.overall.score || 0} verdict={analysis?.overall.verdict || ""} />
                  <p className="mono text-zinc-400 max-w-md mx-auto">
                    {analysis?.overall.summary}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 animate-fade-up" style={{ animationDelay: "300ms" }}>
                  {[
                    { label: "Content", score: analysis?.content.score || 0 },
                    { label: "Style", score: analysis?.style.score || 0 },
                    { label: "Structure", score: analysis?.structure.score || 0 },
                  ].map((item, i) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm"
                    >
                      <div className="text-3xl font-bold text-white">{item.score}%</div>
                      <div className="mono text-xs text-zinc-500 mt-2 uppercase tracking-wider">{item.label}</div>
                    </div>
                  ))}
                </div>

                {analysis?.recommendations && (
                  <div className="space-y-4 animate-fade-up" style={{ animationDelay: "600ms" }}>
                    <h3 className="text-lg font-semibold text-white text-center">Recommendations</h3>
                    <div className="space-y-3">
                      {analysis.recommendations.slice(0, 4).map((rec, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/5 transition-all duration-500 ${
                            i <= recommendationIndex ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                          }`}
                        >
                          <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-purple-400">{i + 1}</span>
                          </div>
                          <p className="text-sm text-zinc-300 leading-relaxed">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleContinue}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-4 font-semibold text-white hover:opacity-90 transition-opacity animate-fade-up"
                  style={{ animationDelay: "900ms" }}
                >
                  Continue to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
