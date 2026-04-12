"use client";

import { useState } from "react";
import { INTERVIEW_QUESTIONS, QUESTION_CATEGORIES, ROLE_TYPES, ROLE_SPECIFIC_QUESTIONS } from "@/lib/interview-questions";

const ALL_QUESTIONS = [...INTERVIEW_QUESTIONS, ...ROLE_SPECIFIC_QUESTIONS];

export default function InterviewPrepPage() {
  const [category, setCategory] = useState("all");
  const [roleType, setRoleType] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shuffledQuestions, setShuffledQuestions] = useState(ALL_QUESTIONS);

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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="agent-card p-6 mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Interview Prep</h1>
            <p className="mono text-xs text-zinc-500">{filteredQuestions.length} questions</p>
          </div>
        </div>
      </div>

      <div className="agent-card p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={roleType}
            onChange={(e) => setRoleType(e.target.value)}
            className="mono text-xs px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 focus:border-purple-500 focus:outline-none"
          >
            {ROLE_TYPES.map((role) => (
              <option key={role.id} value={role.id}>{role.label}</option>
            ))}
          </select>
          <button onClick={shuffleQuestions} className="agent-button-primary inline-flex">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Shuffle
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {QUESTION_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`mono text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              category === cat.id
                ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400"
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredQuestions.map((q, index) => {
          const isExpanded = expandedId === q.id;
          const cat = QUESTION_CATEGORIES.find((c) => c.id === q.category);
          return (
            <div key={q.id} className={`agent-card transition-all ${isExpanded ? "border-purple-500/30" : ""}`}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <span className="h-6 w-6 rounded flex items-center justify-center bg-purple-500/20 text-xs font-bold text-purple-400 flex-shrink-0">
                  {index + 1}
                </span>
                <span className="flex-1 text-sm text-white">{q.question}</span>
                <svg className={`h-4 w-4 text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-zinc-800">
                  <div className="mb-3">
                    <span className="mono text-xs text-zinc-500">
                      {cat?.icon} {cat?.label}
                    </span>
                  </div>

                  <div className="mb-3">
                    <span className="text-xs text-zinc-500">Tips</span>
                    <ul className="mt-2 space-y-1">
                      {q.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                          <span className="text-purple-400 mt-0.5">→</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {q.sampleAnswer && (
                    <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                      <span className="text-xs text-zinc-500">Sample Answer</span>
                      <p className="mt-2 text-xs text-zinc-400 italic">{q.sampleAnswer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredQuestions.length === 0 && (
        <div className="agent-card p-8 text-center">
          <p className="text-sm text-zinc-500">No questions match your filters.</p>
        </div>
      )}

      <div className="agent-card p-5 mt-6">
        <span className="text-sm font-medium text-zinc-400">Interview Tips</span>
        <ul className="mt-3 space-y-2">
          {[
            "Research the company and role beforehand",
            "Use the STAR method for behavioral questions",
            "Practice out loud, not just in your head",
            "Prepare thoughtful questions for the interviewer",
            "Get enough sleep and arrive early",
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="text-green-400">✓</span>
              <span className="mono">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
