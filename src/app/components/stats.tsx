"use client";

import { useEffect, useState } from "react";

export default function Stats() {
  const [countersVisible, setCountersVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setCountersVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/5 via-transparent to-purple-400/5 p-12 md:p-16">
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[100px]" />

          <div className="relative z-10 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              Numbers that speak{" "}
              <span className="text-gradient">for themselves</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
              CareerOS is designed to give you an unfair advantage in your job
              search.
            </p>

            <div className="mt-12 grid gap-8 md:grid-cols-4">
              {[
                { value: "10x", label: "Faster job matching", color: "cyan" },
                { value: "80%", label: "Less application time", color: "blue" },
                { value: "3x", label: "More interview callbacks", color: "purple" },
                { value: "100%", label: "Honest feedback", color: "green" },
              ].map((stat, index) => (
                <div
                  key={stat.label}
                  className="text-center"
                  style={{
                    animationDelay: `${index * 150}ms`,
                    opacity: countersVisible ? 1 : 0,
                    transform: countersVisible ? "translateY(0)" : "translateY(20px)",
                    transition: `all 0.6s ease ${index * 150}ms`,
                  }}
                >
                  <div
                    className={`text-4xl font-bold sm:text-5xl md:text-6xl ${
                      stat.color === "cyan"
                        ? "text-cyan-400"
                        : stat.color === "blue"
                          ? "text-blue-400"
                          : stat.color === "purple"
                            ? "text-purple-400"
                            : "text-green-400"
                    }`}
                  >
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm text-slate-400 sm:text-base">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="text-slate-300">
                <span className="font-semibold text-white">
                  Join thousands of African job seekers
                </span>{" "}
                who are already using CareerOS to transform their job search.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
