"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { INTERVIEW_QUESTIONS, QUESTION_CATEGORIES, ROLE_TYPES, ROLE_SPECIFIC_QUESTIONS } from "@/lib/interview-questions";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";

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
  const posthog = usePostHog();
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
      posthog?.capture("interview_started", {
        role: selectedRole,
        experience_level: experienceLevel,
      });
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

      posthog?.capture("interview_feedback_received", {
        role: selectedRole,
        score: data.score,
        message_count: messages.length,
      });
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
      posthog?.capture("interview_session_ended", {
        role: selectedRole,
        experience_level: experienceLevel,
        message_count: messages.length,
        score: feedback?.score,
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
      posthog?.capture("live_room_created", {
        role: liveRole,
        experience_level: liveExperience,
        room_code: data.room?.roomCode,
      });
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header + tabs */}
      <div className="animate-fade-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Interview Mastery</h1>
          <p className="mono text-xs text-zinc-500 mt-0.5">AI-powered prep and real-time simulation</p>
        </div>

        {/* Tab pills */}
        <div className="tab-pill-container">
          <button
            onClick={() => setActiveTab("bank")}
            className={`tab-pill ${activeTab === "bank" ? "tab-pill-active" : ""}`}
          >
            Question Bank
          </button>
          <button
            onClick={() => setActiveTab("mock")}
            className={`tab-pill ${activeTab === "mock" ? "tab-pill-active" : ""}`}
          >
            AI Mock
          </button>
          <button
            onClick={() => setActiveTab("live")}
            className={`tab-pill flex items-center gap-1.5 ${activeTab === "live" ? "tab-pill-active" : ""}`}
            style={activeTab === "live" ? { background: "rgba(34,197,94,0.2)", color: "#86efac", borderColor: "rgba(34,197,94,0.3)" } : undefined}
          >
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${activeTab === "live" ? "bg-green-400" : "bg-green-500"}`} />
            Live Room
          </button>
        </div>
      </div>

      {/* Question Bank */}
      {activeTab === "bank" && (
        <div className="animate-fade-up space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="section-label">Filter by Role</label>
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value)}
                  className="agent-input"
                >
                  {ROLE_TYPES.map((role) => (
                    <option key={role.id} value={role.id}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div className="pt-5">
                <button onClick={shuffleQuestions} className="agent-button-primary press-scale">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Shuffle
                </button>
              </div>
            </div>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            {QUESTION_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all press-scale ${
                  category === cat.id
                    ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                    : "border-white/[0.06] text-zinc-500 hover:border-white/20 hover:text-zinc-300 bg-white/[0.03]"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* Question cards */}
          <div className="space-y-2.5">
            {filteredQuestions.map((q, index) => {
              const isExpanded = expandedId === q.id;
              const cat = QUESTION_CATEGORIES.find((c) => c.id === q.category);
              return (
                <div
                  key={q.id}
                  className={`rounded-2xl border bg-[#0d0d18] overflow-hidden transition-all duration-300 ${
                    isExpanded ? "border-purple-500/40" : "border-white/[0.08] hover:border-white/[0.14]"
                  }`}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="w-full flex items-center gap-4 p-4 text-left group"
                  >
                    <span className="h-7 w-7 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.06] text-[10px] mono text-zinc-500 group-hover:text-purple-400 group-hover:border-purple-500/30 transition-colors flex-shrink-0">
                      {(index + 1).toString().padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{q.question}</span>
                    <div className={`p-1.5 rounded-full transition-transform duration-300 flex-shrink-0 ${isExpanded ? "rotate-180 text-purple-400" : "text-zinc-600"}`}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-white/[0.06] bg-[#131320]/60">
                      <div className="mb-3 mt-3">
                        <span className="mono text-[10px] uppercase tracking-widest text-zinc-600 bg-white/[0.04] px-2 py-1 rounded border border-white/[0.06]">
                          {cat?.icon} {cat?.label}
                        </span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <span className="section-label">Expert Tips</span>
                          <ul className="space-y-2.5">
                            {q.tips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-400 leading-relaxed">
                                <div className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {q.sampleAnswer && (
                          <div>
                            <span className="section-label">Sample Answer</span>
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] relative">
                              <div className="absolute -top-2 -right-2 bg-[#131320] border border-white/[0.08] rounded-md px-2 py-0.5 text-[8px] mono text-zinc-500">AI RECOMMENDED</div>
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
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-12 text-center">
              <p className="text-sm text-zinc-500 mono">No questions found matching these parameters.</p>
              <button onClick={() => { setCategory("all"); setRoleType("all"); }} className="mt-4 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                Reset all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI Mock Interview */}
      {activeTab === "mock" && (
        <div className="animate-fade-up">
          {!isInterviewing ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-8 text-center max-w-2xl mx-auto">
                <div className="h-16 w-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-5">
                  <svg className="h-8 w-8 text-purple-400 animate-glow-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">AI Mock Interview</h2>
                <p className="text-sm text-zinc-400 mb-7 max-w-md mx-auto leading-relaxed">
                  Practice with our AI interviewer. Get real questions, give your answers, and receive detailed feedback.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-7 text-left">
                  <div className="space-y-1.5">
                    <label className="section-label">Target Role</label>
                    <input
                      type="text"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      placeholder="e.g. Senior Product Manager"
                      className="agent-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="section-label">Experience Level</label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="agent-input cursor-pointer"
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
                  className="agent-button-primary w-full py-3.5 text-sm font-bold press-scale"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Initializing Agent...
                    </>
                  ) : "Start Practice Session"}
                </button>
              </div>

              {/* Past Sessions */}
              {!loadingSessions && pastSessions.length > 0 && (
                <div className="max-w-2xl mx-auto">
                  <p className="section-label">Past Sessions</p>
                  <div className="space-y-2">
                    {pastSessions.map((session) => (
                      <div key={session.id} className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] overflow-hidden">
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
                            <p className="mono text-xs text-zinc-500">
                              {session.experienceLevel} · {session.messageCount} messages · {new Date(session.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {session.score != null && (
                            <span className={`mono text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ${session.score >= 7 ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>
                              {session.score}/10
                            </span>
                          )}
                          <svg className={`h-4 w-4 text-zinc-600 transition-transform flex-shrink-0 ${expandedSession === session.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {expandedSession === session.id && (
                          <div className="border-t border-white/[0.05] bg-[#131320]/60 p-4 space-y-3">
                            <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                              {session.messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                  <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                                    msg.role === "user"
                                      ? "bg-purple-500/10 text-zinc-200 border border-purple-500/20 rounded-tr-none"
                                      : "bg-[#0d0d18] text-zinc-400 border border-white/[0.06] rounded-tl-none"
                                  }`}>
                                    {msg.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-end pt-2 border-t border-white/[0.05]">
                              <button
                                onClick={() => deleteSession(session.id)}
                                className="mono text-[10px] text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1"
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
            <div className="grid lg:grid-cols-[1fr_300px] gap-5">
              {/* Chat window */}
              <div className="flex flex-col h-[580px] rounded-2xl border border-purple-500/20 bg-[#0d0d18] overflow-hidden">
                <div className="p-4 border-b border-white/[0.06] bg-[#131320] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-2 w-2 rounded-full bg-green-500 absolute -top-0.5 -right-0.5 animate-pulse" />
                      <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                        <span className="text-xs text-purple-400 font-bold">AI</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Interview Agent</p>
                      <p className="mono text-[10px] text-zinc-500">{selectedRole} · {experienceLevel}</p>
                    </div>
                  </div>
                  <button
                    onClick={endSession}
                    disabled={isSaving}
                    className="mono text-[10px] text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="h-3 w-3 border border-zinc-500 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : "End Session"}
                  </button>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] p-3.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-purple-500/10 text-zinc-100 border border-purple-500/20 rounded-2xl rounded-tr-none"
                          : "bg-[#131320] border border-white/[0.06] text-zinc-300 rounded-2xl rounded-tl-none border-l-2 border-l-purple-500/40"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#131320] border border-white/[0.06] border-l-2 border-l-purple-500/40 p-4 rounded-2xl rounded-tl-none flex gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.3s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-[#131320] border-t border-white/[0.06]">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      placeholder="Type your response..."
                      className="flex-1 agent-input py-2.5 text-sm"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isLoading || !userInput.trim()}
                      className="p-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 transition-colors press-scale"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <p className="mono text-[10px] text-zinc-600">Enter to send</p>
                    {messages.length >= 2 && messages[messages.length - 1].role === "user" && (
                      <button
                        onClick={getFeedback}
                        disabled={isLoading}
                        className="mono text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Get Feedback
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
                  <p className="section-label flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Live Analysis
                  </p>

                  {feedback ? (
                    <div className="space-y-4 animate-fade-in">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="mono text-[10px] text-zinc-500">SCORE</span>
                          <span className={`mono text-sm font-bold ${feedback.score >= 7 ? "text-green-400" : "text-amber-400"}`}>{feedback.score}/10</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${feedback.score >= 7 ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${feedback.score * 10}%` }} />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="mono text-[10px] text-green-400/70 mb-1.5 uppercase tracking-widest">Strengths</p>
                          <ul className="space-y-1">
                            {feedback.strengths.map((s, i) => (
                              <li key={i} className="text-xs text-zinc-400 leading-tight flex gap-1.5"><span className="text-green-500 flex-shrink-0">✓</span>{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="mono text-[10px] text-red-400/70 mb-1.5 uppercase tracking-widest">Improve</p>
                          <ul className="space-y-1">
                            {feedback.weaknesses.map((w, i) => (
                              <li key={i} className="text-xs text-zinc-400 leading-tight flex gap-1.5"><span className="text-red-500 flex-shrink-0">·</span>{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <button
                        onClick={() => setFeedback(null)}
                        className="w-full py-2 rounded-lg border border-white/[0.08] mono text-[10px] text-zinc-500 hover:text-white hover:border-white/20 transition-all"
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="h-10 w-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                        <svg className="h-5 w-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="mono text-[10px] text-zinc-600">Respond to a question to get real-time analysis.</p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
                  <p className="section-label">Pro Tips</p>
                  <ul className="space-y-2.5">
                    {[
                      "Be specific with examples",
                      "Use the STAR method",
                      "Keep answers under 2 mins",
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-500">
                        <span className="text-purple-500 flex-shrink-0">→</span> {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Room */}
      {activeTab === "live" && (
        <div className="animate-fade-up max-w-2xl mx-auto space-y-5">
          {!createdRoom ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-7">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-green-500/15 border border-green-500/20 flex items-center justify-center">
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
                  <label className="section-label">Role / Position</label>
                  <input
                    type="text"
                    value={liveRole}
                    onChange={(e) => setLiveRole(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className="agent-input"
                  />
                </div>
                <div>
                  <label className="section-label">Experience Level</label>
                  <select
                    value={liveExperience}
                    onChange={(e) => setLiveExperience(e.target.value)}
                    className="agent-input cursor-pointer"
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
                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 press-scale"
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

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.06]" /></div>
                <div className="relative flex justify-center"><span className="bg-[#0d0d18] px-3 mono text-[10px] text-zinc-600 uppercase tracking-wider">or join existing</span></div>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code (ABC123)"
                  maxLength={6}
                  className="flex-1 agent-input mono tracking-widest"
                />
                <a
                  href={joinCode.length === 6 ? `/interview/room/${joinCode}` : undefined}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    joinCode.length === 6
                      ? "bg-purple-600 text-white hover:bg-purple-500"
                      : "bg-white/[0.04] border border-white/[0.08] text-zinc-600 cursor-not-allowed pointer-events-none"
                  }`}
                >
                  Join
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-green-500/20 bg-[#0d0d18] p-7">
              <div className="text-center mb-6">
                <div className="h-12 w-12 mx-auto rounded-xl bg-green-500/15 border border-green-500/20 flex items-center justify-center mb-3">
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-white">Room Ready</h2>
                <p className="text-xs text-zinc-500 mt-1">{createdRoom.role}{createdRoom.experienceLevel ? ` · ${createdRoom.experienceLevel}` : ""}</p>
              </div>

              <div className="stat-card stat-card-green text-center mb-5">
                <p className="section-label">Room Code</p>
                <p className="mono text-3xl font-bold tracking-[0.3em] text-white">{createdRoom.roomCode}</p>
              </div>

              <div className="flex gap-3 mb-5">
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
                  className="agent-button px-4 py-2.5 press-scale"
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
                className="w-full py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] mono text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Create New Room
              </button>
            </div>
          )}

          {/* Info card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
            <p className="section-label">How Live Sessions Work</p>
            <ul className="space-y-2.5">
              {[
                "Create a room and share the link — no account needed to join",
                "Both parties join a private video call via Jitsi Meet",
                "Audio and video are peer-to-peer — CareerOS never sees the call",
                "Use the Question Bank to prepare questions as the interviewer",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-500">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">→</span>
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
