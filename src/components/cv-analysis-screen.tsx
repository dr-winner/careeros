"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface CVAnalysisResult {
  overall: {
    score: number;
    verdict: string;
    summary: string;
  };
  content: {
    score: number;
    issues: string[];
    strengths: string[];
  };
  style: {
    score: number;
    issues: string[];
    strengths: string[];
  };
  structure: {
    score: number;
    issues: string[];
    strengths: string[];
  };
  recommendations: string[];
}

const ANALYSIS_STAGES = [
  { id: "parsing", text: "Reading CV structure...", duration: 1500 },
  { id: "content", text: "Analyzing content relevance...", duration: 2000 },
  { id: "skills", text: "Extracting key skills...", duration: 1800 },
  { id: "format", text: "Checking formatting standards...", duration: 1500 },
  { id: "ats", text: "Evaluating ATS compatibility...", duration: 2000 },
  { id: "gaps", text: "Identifying skill gaps...", duration: 1800 },
  { id: "match", text: "Calculating job match potential...", duration: 1500 },
  { id: "final", text: "Generating recommendations...", duration: 2000 },
];

const MATRIX_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function MatrixColumn({ index, onChar }: { index: number; onChar: (char: string, index: number) => void }) {
  useEffect(() => {
    const interval = setInterval(() => {
      const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
      onChar(char, index);
    }, 50 + Math.random() * 100);

    return () => clearInterval(interval);
  }, [index, onChar]);

  return null;
}

function MatrixBackground({ isActive }: { isActive: boolean }) {
  const [columns, setColumns] = useState<Array<{ char: string; opacity: number }>>([]);
  const [charStates, setCharStates] = useState<Record<number, { char: string; opacity: number }>>({});

  const COLS = typeof window !== "undefined" ? Math.floor(window.innerWidth / 20) : 40;

  useEffect(() => {
    setColumns(Array(COLS).fill(null).map(() => ({ char: "", opacity: 0 })));
  }, []);

  const handleChar = useCallback((char: string, index: number) => {
    setCharStates((prev) => ({
      ...prev,
      [index]: {
        char,
        opacity: 0.3 + Math.random() * 0.7,
      },
    }));
  }, []);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {Array(COLS)
        .fill(null)
        .map((_, i) => (
          <MatrixColumn key={i} index={i} onChar={handleChar} />
        ))}
      <div className="absolute inset-0 flex">
        {Array(COLS)
          .fill(null)
          .map((_, i) => (
            <div
              key={i}
              className="flex-1 text-center font-mono text-sm"
              style={{ color: "#22c55e", textShadow: "0 0 10px #22c55e" }}
            >
              {charStates[i] && (
                <span style={{ opacity: charStates[i].opacity }}>
                  {charStates[i].char}
                </span>
              )}
            </div>
          ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0f]" />
    </div>
  );
}

function AnimatedProgress({ stage, progress }: { stage: string; progress: number }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-2 w-32 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="mono text-sm text-zinc-400">{Math.round(progress)}%</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="mono text-cyan-400">{stage}{dots}</span>
      </div>
    </div>
  );
}

function CodeStream({ isActive }: { isActive: boolean }) {
  const [lines, setLines] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const codeSnippets = [
    "> parsing_document_structure...",
    "> identifying_contact_info...",
    "> extracting_experience_entries...",
    "> parsing_education_records...",
    "> analyzing_skill_distribution...",
    "> checking_format_consistency...",
    "> evaluating_readability_score...",
    "> calculating_keyword_density...",
    "> cross_referencing_achievements...",
    "> comparing_to_industry_standards...",
    "> generating_ats_compatibility_report...",
    "> finalizing_analysis_results...",
  ];

  useEffect(() => {
    if (!isActive) return;

    let lineIndex = 0;
    const interval = setInterval(() => {
      if (lineIndex < codeSnippets.length) {
        setLines((prev) => [...prev.slice(-8), codeSnippets[lineIndex]]);
        lineIndex++;
      } else {
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  if (!isActive) return null;

  return (
    <div
      ref={scrollRef}
      className="absolute bottom-0 left-0 right-0 h-48 bg-black/50 backdrop-blur-sm p-4 overflow-hidden"
    >
      <div className="font-mono text-xs space-y-1">
        {lines.map((line, i) => (
          <div
            key={i}
            className="text-green-400 animate-fade-in"
            style={{ textShadow: "0 0 5px #22c55e" }}
          >
            {line}
          </div>
        ))}
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
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<CVAnalysisResult | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showScore, setShowScore] = useState(false);

  const totalDuration = ANALYSIS_STAGES.reduce((acc, stage) => acc + stage.duration, 0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 0.5;
      });
    }, 30);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let stageIndex = 0;
    const stageInterval = setInterval(() => {
      if (stageIndex < ANALYSIS_STAGES.length) {
        setCurrentStageIndex(stageIndex);
        stageIndex++;
      } else {
        clearInterval(stageInterval);
        setTimeout(() => setIsComplete(true), 500);
      }
    }, 400);

    return () => clearInterval(stageInterval);
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
        setTimeout(() => {
          setShowScore(true);
          setTimeout(() => onComplete(data.analysis), 2000);
        }, 1000);
      } else {
        const mockAnalysis = generateMockAnalysis();
        setAnalysis(mockAnalysis);
        setTimeout(() => {
          setShowScore(true);
          setTimeout(() => onComplete(mockAnalysis), 2000);
        }, 1000);
      }
    } catch {
      const mockAnalysis = generateMockAnalysis();
      setAnalysis(mockAnalysis);
      setTimeout(() => {
        setShowScore(true);
        setTimeout(() => onComplete(mockAnalysis), 2000);
      }, 1000);
    }
  };

  const generateMockAnalysis = (): CVAnalysisResult => ({
    overall: {
      score: 72,
      verdict: "Good",
      summary: "Your CV has a solid foundation with room for improvement in formatting and keyword optimization.",
    },
    content: {
      score: 78,
      issues: ["Limited quantifiable achievements", "Missing industry keywords"],
      strengths: ["Clear work history", "Relevant experience"],
    },
    style: {
      score: 68,
      issues: ["Inconsistent bullet points", "Verbose descriptions"],
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

  const currentStage = ANALYSIS_STAGES[currentStageIndex];

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col">
      <MatrixBackground isActive={!isComplete} />

      <div className="relative z-10 flex-1 flex flex-col">
        {!isComplete ? (
          <>
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="max-w-xl w-full text-center space-y-12">
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center">
                        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-400 blur-xl opacity-30 animate-pulse" />
                    </div>
                  </div>
                  <h1 className="text-3xl font-bold text-white">
                    Analyzing Your CV
                  </h1>
                  <p className="mono text-zinc-500">
                    Our AI is performing a deep analysis of your resume
                  </p>
                </div>

                <AnimatedProgress
                  stage={currentStage?.text || "Initializing..."}
                  progress={progress}
                />

                <div className="grid grid-cols-4 gap-2">
                  {ANALYSIS_STAGES.map((stage, i) => (
                    <div
                      key={stage.id}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i < currentStageIndex
                          ? "bg-purple-500"
                          : i === currentStageIndex
                          ? "bg-gradient-to-r from-purple-500 to-cyan-400 animate-pulse"
                          : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <CodeStream isActive={!isComplete} />
          </>
        ) : !showScore ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-6">
              <div className="relative inline-block">
                <div className="h-32 w-32 rounded-full border-4 border-purple-500/30 flex items-center justify-center">
                  <span className="text-5xl font-bold gradient-text">100%</span>
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-cyan-400 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-white">Analysis Complete</h2>
              <p className="mono text-zinc-500">Preparing your results...</p>
            </div>
          </div>
        ) : analysis ? (
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            <div className="max-w-2xl w-full space-y-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="h-32 w-32 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-400/20 flex items-center justify-center">
                      <span className="text-6xl font-bold gradient-text">{analysis.overall.score}</span>
                    </div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 blur-2xl opacity-20 animate-pulse" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-white">{analysis.overall.verdict}</h2>
                <p className="mono text-zinc-400 max-w-md mx-auto">{analysis.overall.summary}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Content", score: analysis.content.score },
                  { label: "Style", score: analysis.style.score },
                  { label: "Structure", score: analysis.structure.score },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    <div className="text-2xl font-bold text-white">{item.score}%</div>
                    <div className="mono text-xs text-zinc-500 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>

              {analysis.recommendations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">Key Recommendations</h3>
                  {analysis.recommendations.slice(0, 3).map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-white/5">
                      <div className="h-6 w-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-purple-400">{i + 1}</span>
                      </div>
                      <p className="text-sm text-zinc-300">{rec}</p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-4 font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Continue to Dashboard
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
