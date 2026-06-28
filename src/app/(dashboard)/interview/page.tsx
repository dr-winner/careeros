"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { INTERVIEW_QUESTIONS, QUESTION_CATEGORIES, ROLE_TYPES, ROLE_SPECIFIC_QUESTIONS } from "@/lib/interview-questions";
import { toast } from "sonner";

const ALL_QUESTIONS = [...INTERVIEW_QUESTIONS, ...ROLE_SPECIFIC_QUESTIONS];

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Feedback {
  score: number;
  strengths: string[];
  weaknesses: string[];
  improvementTips: string[];
  betterSampleAnswer: string;
}

interface PastSession {
  id: string;
  role: string;
  experienceLevel?: string;
  score?: number;
  messageCount: number;
  messages: Message[];
  createdAt: string;
}

export default function InterviewPrepPage() {
  const [activeTab, setActiveTab] = useState<"bank" | "mock" | "live">("bank");
  const [category, setCategory] = useState("all");
  const [roleType, setRoleType] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shuffledQuestions, setShuffledQuestions] = useState(ALL_QUESTIONS);

  // Mock Interview State
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [selectedRole, setSelectedRole] = useState("Software Engineer");
  const [experienceLevel, setExperienceLevel] = useState("Mid-level");
  const [isSaving, setIsSaving] = useState(false);

  // Past Sessions
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Live Session state
  const [liveRole, setLiveRole] = useState("Software Engineer");
  const [liveExperience, setLiveExperience] = useState("Mid-level");
  const [createdRoom, setCreatedRoom] = useState<{ roomCode: string; role: string; experienceLevel?: string } | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/user/interview-sessions");
      const data = await res.json();
      if (!data.error) setPastSessions(data.sessions || []);
    } catch {
      // silently ignore
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filteredQuestions = shuffledQuestions.filter((q) => {
    const categoryMatch = category === "all" || q.category === category;
    const roleMatch =
      roleType === "all" ||
      !q.roleType ||
      q.roleType.includes("all") ||
      q.roleType.includes(roleType);
    return categoryMatch && roleMatch;
  });

  const shuffleQuestions = () => {
    const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5);
    setShuffledQuestions(shuffled);
    setExpandedId(null);
  };

  const startInterview = async () => {
    setIsLoading(true);
    setIsInterviewing(true);
    setMessages([]);
    setFeedback(null);

    try {
      const response = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", role: selectedRole, experienceLevel }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMessages([{ role: "assistant", content: data.text }]);
    } catch {
      toast.error("Failed to start interview");
      setIsInterviewing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: userInput }];
    setMessages(newMessages);
    setUserInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "respond", role: selectedRole, history: newMessages }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMessages([...newMessages, { role: "assistant", content: data.text }]);
    } catch {
      toast.error("Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  const getFeedback = async () => {
    if (messages.length < 2 || isLoading) return;

    // Find the last user message, then find the assistant message immediately before it
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") { lastUserIdx = i; break; }
    }
    if (lastUserIdx < 0) return;
    const lastUserMsg = messages[lastUserIdx];
    let lastAssistantMsg: typeof messages[0] | undefined;
    for (let i = lastUserIdx - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") { lastAssistantMsg = messages[i]; break; }
    }

    if (!lastUserMsg || !lastAssistantMsg) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "feedback",
          role: selectedRole,
          currentQuestion: lastAssistantMsg.content,
          userResponse: lastUserMsg.content,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setFeedback(data);
    } catch {
      toast.error("Failed to get feedback");
    } finally {
      setIsLoading(false);
    }
  };

  const endSession = async () => {
    if (messages.length < 2) {
      setIsInterviewing(false);
      setMessages([]);
      setFeedback(null);
      return;
    }

    setIsSaving(true);
    try {
      await fetch("/api/user/interview-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          experienceLevel,
          messages,
          score: feedback?.score,
        }),
      });
      await fetchSessions();
      toast.success("Session saved");
    } catch {
      // silently ignore save failure
    } finally {
      setIsSaving(false);
      setIsInterviewing(false);
      setMessages([]);
      setFeedback(null);
    }
  };

  const createRoom = async () => {
    setIsCreatingRoom(true);
    try {
      const res = await fetch("/api/interview-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: liveRole, experienceLevel: liveExperience }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCreatedRoom(data.room);
    } catch {
      toast.error("Failed to create room");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await fetch(`/api/user/interview-sessions/${id}`, { method: "DELETE" });
      setPastSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast.error("Failed to delete session");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white gradient-text">Interview Mastery</h1>
          <p className="mono text-xs text-zinc-500 mt-1">AI-powered prep and real-time simulation</p>
        </div>
        <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab("bank")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === "bank" ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Question Bank
          </button>
          <button
            onClick={() => setActiveTab("mock")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === "mock" ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            AI Mock Interview
          </button>
          <button
            onClick={() => setActiveTab("live")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "live" ? "bg-green-600 text-white shadow-lg shadow-green-900/20" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${activeTab === "live" ? "bg-white" : "bg-green-500"}`} />
            Live Session
          </button>
        </div>
      </div>

      {activeTab === "bank" ? (
        <div className="animate-fade-up">
          <div className="agent-card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] mono text-zinc-500 uppercase mb-1.5 ml-1">Filter by Role</label>
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value)}
                  className="w-full mono text-xs px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 focus:border-purple-500 focus:outline-none transition-colors"
                >
                  {ROLE_TYPES.map((role) => (
                    <option key={role.id} value={role.id}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div className="pt-5">
                <button onClick={shuffleQuestions} className="agent-button-primary inline-flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Shuffle Questions
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {QUESTION_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`mono text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg border transition-all ${
                  category === cat.id
                    ? "bg-purple-500/10 border-purple-500/50 text-purple-400"
                    : "border-zinc-800/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400 bg-zinc-900/30"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            {filteredQuestions.map((q, index) => {
              const isExpanded = expandedId === q.id;
              const cat = QUESTION_CATEGORIES.find((c) => c.id === q.category);
              return (
                <div key={q.id} className={`agent-card group transition-all duration-300 ${isExpanded ? "border-purple-500/40 ring-1 ring-purple-500/20" : "hover:border-zinc-700"}`}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="w-full flex items-center gap-4 p-5 text-left"
                  >
                    <span className="h-8 w-8 rounded-lg flex items-center justify-center bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-500 group-hover:text-purple-400 group-hover:border-purple-500/30 transition-colors">
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{q.question}</span>
                    <div className={`p-1.5 rounded-full bg-zinc-900/50 border border-zinc-800 transition-transform duration-300 ${isExpanded ? "rotate-180 border-purple-500/30 text-purple-400" : "text-zinc-500"}`}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-6 pt-2 border-t border-zinc-800/50 bg-zinc-900/20">
                      <div className="mb-4">
                        <span className="mono text-[10px] uppercase tracking-widest text-zinc-600 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                          {cat?.icon} {cat?.label}
                        </span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <span className="text-[10px] mono uppercase text-zinc-500 mb-3 block">Expert Tips</span>
                          <ul className="space-y-3">
                            {q.tips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-3 text-xs text-zinc-400 leading-relaxed">
                                <div className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {q.sampleAnswer && (
                          <div className="space-y-3">
                            <span className="text-[10px] mono uppercase text-zinc-500 block">Sample High-Quality Answer</span>
                            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/50 relative">
                              <div className="absolute -top-2 -right-2 bg-zinc-900 border border-zinc-800 rounded-md px-2 py-0.5 text-[8px] mono text-zinc-500">AI RECOMMENDED</div>
                              <p className="text-xs text-zinc-400 leading-relaxed italic">&quot;{q.sampleAnswer}&quot;</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredQuestions.length === 0 && (
            <div className="agent-card p-12 text-center border-dashed">
              <p className="text-sm text-zinc-500 mono">No questions found matching these parameters.</p>
              <button onClick={() => { setCategory("all"); setRoleType("all"); }} className="mt-4 text-xs text-purple-400 hover:text-purple-300 underline underline-offset-4">Reset all filters</button>
            </div>
          )}
        </div>
      ) : activeTab === "mock" ? (
        <div className="animate-fade-up">
          {!isInterviewing ? (
            <div className="space-y-6">
              <div className="agent-card p-8 text-center max-w-2xl mx-auto">
                <div className="h-16 w-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-6">
                  <svg className="h-8 w-8 text-purple-400 animate-glow-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Ready for your AI Simulation?</h2>
                <p className="text-sm text-zinc-500 mb-8 max-w-md mx-auto">
                  Practice with our expert AI interviewer. Get real-time questions, give your answers, and receive detailed feedback.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] mono text-zinc-500 uppercase ml-1">Target Role</label>
                    <input
                      type="text"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      placeholder="e.g. Senior Product Manager"
                      className="w-full agent-input text-sm py-3"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] mono text-zinc-500 uppercase ml-1">Experience Level</label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full agent-input text-sm py-3"
                    >
                      <option>Junior</option>
                      <option>Mid-level</option>
                      <option>Senior</option>
                      <option>Lead / Principal</option>
                      <option>Executive</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={startInterview}
                  disabled={isLoading}
                  className="agent-button-primary w-full py-4 text-sm font-bold flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Initializing Agent...
                    </>
                  ) : (
                    "Start Practice Session"
                  )}
                </button>
              </div>

              {/* Past Sessions */}
              {!loadingSessions && pastSessions.length > 0 && (
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-xs font-bold text-zinc-400 mono uppercase tracking-wider mb-3">Past Sessions</h3>
                  <div className="space-y-2">
                    {pastSessions.map((session) => (
                      <div key={session.id} className="agent-card overflow-hidden">
                        <button
                          onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                          className="w-full flex items-center gap-4 p-4 text-left"
                        >
                          <div className="h-9 w-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{session.role}</p>
                            <p className="text-[11px] mono text-zinc-500">
                              {session.experienceLevel} · {session.messageCount} messages · {new Date(session.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {session.score != null && (
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${session.score >= 7 ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                              {session.score}/10
                            </span>
                          )}
                          <svg className={`h-4 w-4 text-zinc-600 transition-transform flex-shrink-0 ${expandedSession === session.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {expandedSession === session.id && (
                          <div className="border-t border-zinc-800/50 bg-zinc-900/30 p-4 space-y-3">
                            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                              {session.messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                  <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                                    msg.role === "user"
                                      ? "bg-purple-600/30 text-zinc-200 border border-purple-500/20"
                                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                  }`}>
                                    {msg.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-end pt-2 border-t border-zinc-800/50">
                              <button
                                onClick={() => deleteSession(session.id)}
                                className="text-[10px] mono text-red-400/70 hover:text-red-400 transition-colors flex items-center gap-1"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete session
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr,320px] gap-6">
              <div className="flex flex-col h-[600px] agent-card p-0 overflow-hidden border-purple-500/20 ring-1 ring-purple-500/10">
                <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-2 w-2 rounded-full bg-green-500 absolute -top-0.5 -right-0.5 animate-pulse" />
                      <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                        <span className="text-xs text-purple-400">AI</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Interview Agent</p>
                      <p className="text-[10px] mono text-zinc-500">{selectedRole} · {experienceLevel}</p>
                    </div>
                  </div>
                  <button
                    onClick={endSession}
                    disabled={isSaving}
                    className="text-[10px] mono text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="h-3 w-3 border border-zinc-500 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : "End Session"}
                  </button>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-purple-600 text-white rounded-tr-none shadow-lg shadow-purple-900/20"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl rounded-tl-none flex gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.3s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-zinc-900/50 border-t border-zinc-800">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      placeholder="Type your response..."
                      className="flex-1 agent-input py-3 text-sm"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isLoading || !userInput.trim()}
                      className="p-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-lg shadow-purple-900/20"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[10px] mono text-zinc-600">Press Enter to send</p>
                    {messages.length >= 2 && messages[messages.length - 1].role === "user" && (
                      <button
                        onClick={getFeedback}
                        disabled={isLoading}
                        className="text-[10px] mono text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Get Real-time Feedback
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="agent-card p-5 border-purple-500/20">
                  <h3 className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                    <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Live Analysis
                  </h3>

                  {feedback ? (
                    <div className="space-y-4 animate-fade-up">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] mono text-zinc-500">SCORE</span>
                          <span className={`text-xs font-bold ${feedback.score >= 7 ? "text-green-400" : "text-yellow-400"}`}>{feedback.score}/10</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${feedback.score >= 7 ? "bg-green-500" : "bg-yellow-500"}`} style={{ width: `${feedback.score * 10}%` }} />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] mono text-green-500/70 mb-1.5">STRENGTHS</p>
                          <ul className="space-y-1">
                            {feedback.strengths.map((s, i) => (
                              <li key={i} className="text-[11px] text-zinc-400 leading-tight">• {s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-[10px] mono text-red-500/70 mb-1.5">AREAS TO IMPROVE</p>
                          <ul className="space-y-1">
                            {feedback.weaknesses.map((w, i) => (
                              <li key={i} className="text-[11px] text-zinc-400 leading-tight">• {w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <button
                        onClick={() => setFeedback(null)}
                        className="w-full py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] mono text-zinc-500 hover:text-white hover:border-zinc-700 transition-all"
                      >
                        Dismiss Analysis
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3">
                        <svg className="h-5 w-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-[10px] mono text-zinc-600">Awaiting your first response to provide analysis.</p>
                    </div>
                  )}
                </div>

                <div className="agent-card p-5">
                  <h3 className="text-xs font-bold text-white mb-3">Pro Tips</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2 text-[11px] text-zinc-500">
                      <span className="text-purple-500">→</span> Be specific with examples
                    </li>
                    <li className="flex items-start gap-2 text-[11px] text-zinc-500">
                      <span className="text-purple-500">→</span> Use the STAR method
                    </li>
                    <li className="flex items-start gap-2 text-[11px] text-zinc-500">
                      <span className="text-purple-500">→</span> Keep answers under 2 mins
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-up max-w-2xl mx-auto space-y-6">
          {/* Create Room */}
          {!createdRoom ? (
            <div className="agent-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-green-500/20 border border-green-500/20 flex items-center justify-center">
                  <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.132a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Start a Live Interview</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Create a room and share the link with your interviewer or candidate</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs text-zinc-400 mb-2">Role / Position</label>
                  <input
                    type="text"
                    value={liveRole}
                    onChange={(e) => setLiveRole(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className="w-full agent-input text-sm py-3"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-2">Experience Level</label>
                  <select
                    value={liveExperience}
                    onChange={(e) => setLiveExperience(e.target.value)}
                    className="w-full agent-input text-sm py-3"
                  >
                    <option>Junior</option>
                    <option>Mid-level</option>
                    <option>Senior</option>
                    <option>Lead / Principal</option>
                    <option>Executive</option>
                  </select>
                </div>
              </div>

              <button
                onClick={createRoom}
                disabled={isCreatingRoom || !liveRole.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCreatingRoom ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Room...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Interview Room
                  </>
                )}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                <div className="relative flex justify-center"><span className="bg-[#14141f] px-3 text-xs text-zinc-600">or join existing</span></div>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code (e.g. ABC123)"
                  maxLength={6}
                  className="flex-1 agent-input text-sm py-3 mono tracking-widest"
                />
                <a
                  href={joinCode.length === 6 ? `/interview/room/${joinCode}` : undefined}
                  className={`px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                    joinCode.length === 6
                      ? "bg-purple-600 text-white hover:bg-purple-500"
                      : "bg-white/5 border border-white/10 text-zinc-600 cursor-not-allowed pointer-events-none"
                  }`}
                >
                  Join
                </a>
              </div>
            </div>
          ) : (
            <div className="agent-card p-8">
              <div className="text-center mb-6">
                <div className="h-12 w-12 mx-auto rounded-xl bg-green-500/20 border border-green-500/20 flex items-center justify-center mb-3">
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-white">Room Ready</h2>
                <p className="text-xs text-zinc-500 mt-1">{createdRoom.role}{createdRoom.experienceLevel ? ` · ${createdRoom.experienceLevel}` : ""}</p>
              </div>

              <div className="bg-zinc-900/50 rounded-xl border border-white/10 p-4 mb-6 text-center">
                <p className="text-xs text-zinc-500 mb-2">Room Code</p>
                <p className="mono text-3xl font-bold tracking-[0.3em] text-white">{createdRoom.roomCode}</p>
              </div>

              <div className="flex gap-3 mb-6">
                <input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/interview/room/${createdRoom.roomCode}`}
                  className="flex-1 agent-input text-xs py-2.5 text-zinc-400"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/interview/room/${createdRoom.roomCode}`);
                    toast.success("Link copied!");
                  }}
                  className="px-4 py-2.5 rounded-lg border border-white/20 bg-white/5 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
                >
                  Copy
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <a
                  href={`/interview/room/${createdRoom.roomCode}?role=interviewer`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 rounded-xl border border-purple-500/30 bg-purple-500/10 text-center text-sm text-purple-300 hover:bg-purple-500/20 transition-colors font-medium"
                >
                  Join as Interviewer
                </a>
                <a
                  href={`/interview/room/${createdRoom.roomCode}?role=candidate`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-center text-sm text-cyan-300 hover:bg-cyan-500/20 transition-colors font-medium"
                >
                  Join as Candidate
                </a>
              </div>

              <button
                onClick={() => setCreatedRoom(null)}
                className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Create New Room
              </button>
            </div>
          )}

          {/* Info */}
          <div className="agent-card p-5">
            <h3 className="text-xs font-bold text-white mb-3">How Live Sessions Work</h3>
            <ul className="space-y-2">
              {[
                "Create a room and share the link — no account needed to join",
                "Both parties join a private video call via Jitsi Meet",
                "Audio and video are peer-to-peer — CareerOS never sees the call",
                "Use the Question Bank to prepare questions as the interviewer",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-500">
                  <span className="text-green-500 mt-0.5">→</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
