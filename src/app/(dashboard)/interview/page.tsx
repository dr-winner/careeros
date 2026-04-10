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
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Interview Prep</h1>
        <p className="mt-2 text-slate-400">
          Practice common interview questions and prepare for your next opportunity.
        </p>
      </div>

      <div className="mb-6 rounded-xl glass-card p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={roleType}
            onChange={(e) => setRoleType(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
          >
            {ROLE_TYPES.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>

          <button
            onClick={shuffleQuestions}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-white hover:opacity-90"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Shuffle Questions
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {QUESTION_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              category === cat.id
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400 text-white"
                : "border border-slate-700 text-slate-400 hover:bg-slate-800"
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredQuestions.map((q, index) => {
          const isExpanded = expandedId === q.id;
          return (
            <div
              key={q.id}
              className="rounded-xl glass-card transition"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
                className="flex w-full items-center gap-4 p-6 text-left"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-medium text-emerald-400">
                  {index + 1}
                </span>
                <span className="flex-1 text-lg font-medium text-white">
                  {q.question}
                </span>
                <svg
                  className={`h-5 w-5 text-slate-500 transition ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-700 px-6 pb-6 pt-4">
                  <div className="mb-4">
                    <span className="mb-2 inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                      {QUESTION_CATEGORIES.find((c) => c.id === q.category)?.icon}{" "}
                      {QUESTION_CATEGORIES.find((c) => c.id === q.category)?.label}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h4 className="mb-2 font-semibold text-white">Tips:</h4>
                    <ul className="space-y-1">
                      {q.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                          <span className="mt-1 text-emerald-400">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {q.sampleAnswer && (
                    <div className="rounded-lg bg-slate-800 p-4">
                      <h4 className="mb-2 font-semibold text-white">Sample Answer:</h4>
                      <p className="text-sm italic text-slate-300">{q.sampleAnswer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredQuestions.length === 0 && (
        <div className="rounded-xl glass-card p-12 text-center">
          <p className="text-slate-400">No questions match your filters. Try different criteria.</p>
        </div>
      )}

      <div className="mt-8 rounded-xl glass-card p-6">
        <h3 className="text-lg font-semibold text-white">Interview Tips</h3>
        <ul className="mt-4 space-y-2 text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Research the company and role beforehand</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Use the STAR method for behavioral questions (Situation, Task, Action, Result)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Practice out loud, not just in your head</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Prepare thoughtful questions for the interviewer</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Get enough sleep and arrive early</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
