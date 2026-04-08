"use client";

import { useState, FormEvent, useEffect } from "react";
import confetti from "canvas-confetti";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "success") {
      const duration = 2000;
      const end = Date.now() + duration;

      const colors = ["#22c55e", "#3b82f6", "#f59e0b"];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [status]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    if (!email || !email.includes("@")) {
      setStatus("error");
      setMessage("Enter a valid email address");
      return;
    }

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmittedEmail(email);
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.message || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setMessage("Connection failed. Try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-emerald-900">You&apos;re on the list!</h3>
        <p className="mt-2 text-emerald-700">
          Check your inbox at <strong>{submittedEmail}</strong> for a confirmation email.
        </p>
        <p className="mt-4 text-sm text-emerald-600">
          Make sure you entered the correct email address.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          disabled={status === "loading"}
          className="flex-1 rounded-xl border border-emerald-200 bg-white px-5 py-3.5 text-emerald-900 placeholder:text-emerald-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-xl bg-emerald-800 px-8 py-3.5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {status === "loading" ? "Joining..." : "Join waitlist"}
        </button>
      </div>
      {status === "error" && message && (
        <p className="mt-2 text-sm text-red-600">{message}</p>
      )}
    </form>
  );
}
