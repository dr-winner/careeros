"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

interface Application {
  id: string;
  jobId: string;
  jobTitle?: string | null;
  companyName?: string | null;
  location?: string | null;
  workMode?: string | null;
  status: string;
  appliedAt: string | null;
}

interface DashboardStats {
  totalApplications: number;
  applicationsByStatus: Record<string, number>;
  responseRate: number;
  avgTimeToResponse: number;
  savedJobs: number;
  resumes: number;
  alerts: number;
}

export default function AnalyticsPage() {
  const { userId, isLoaded } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    applicationsByStatus: {},
    responseRate: 0,
    avgTimeToResponse: 0,
    savedJobs: 0,
    resumes: 0,
    alerts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const fetchData = async () => {
    try {
      const [appsRes, savedRes, resumesRes, alertsRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/saved-jobs"),
        fetch("/api/user/resumes"),
        fetch("/api/searches"),
      ]);

      const appsData = await appsRes.json();
      const savedData = await savedRes.json();
      const resumesData = await resumesRes.json();
      const alertsData = await alertsRes.json();

      const apps: Application[] = appsData.applications || [];

      const statusCounts: Record<string, number> = {};
      apps.forEach((app: Application) => {
        statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
      });

      const responses = apps.filter((a: Application) =>
        ["Screening", "Interview", "Offer"].includes(a.status),
      ).length;

      const responseRate =
        apps.length > 0 ? Math.round((responses / apps.length) * 100) : 0;

      let avgTime = 0;
      if (apps.length > 0) {
        const now = new Date();
        const totalDays = apps.reduce((sum: number, app: Application) => {
          if (app.appliedAt) {
            const applied = new Date(app.appliedAt);
            return sum + Math.floor((now.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24));
          }
          return sum;
        }, 0);
        avgTime = Math.round(totalDays / apps.length);
      }

      setApplications(apps);
      setStats({
        totalApplications: apps.length,
        applicationsByStatus: statusCounts,
        responseRate,
        avgTimeToResponse: avgTime,
        savedJobs: savedData.savedJobs?.length || 0,
        resumes: resumesData.resumes?.length || 0,
        alerts: alertsData.searches?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { bg: string; text: string; border: string }> = {
      Applied: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30" },
      Screening: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
      Interview: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
      Offer: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
      Rejected: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
      Withdrawn: { bg: "bg-zinc-500/20", text: "text-zinc-400", border: "border-zinc-500/30" },
    };
    return config[status] || config.Applied;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          <span className="mono text-sm text-zinc-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="agent-card p-6 mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Analytics</h1>
            <p className="mono text-xs text-zinc-500">job_search_metrics</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="agent-card p-5">
              <div className="animate-pulse">
                <div className="h-8 w-1/2 rounded bg-zinc-800 mb-2" />
                <div className="h-4 w-2/3 rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {[
              { label: "applications", value: stats.totalApplications, color: "purple" },
              { label: "response_rate", value: `${stats.responseRate}%`, color: "cyan" },
              { label: "saved_jobs", value: stats.savedJobs, color: "amber" },
              { label: "alerts", value: stats.alerts, color: "green" },
            ].map((item, i) => (
              <div key={i} className="agent-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="mono text-xs text-zinc-500 uppercase tracking-wider">{item.label}</span>
                  <div className={`h-2 w-2 rounded-full ${item.color === "purple" ? "bg-purple-400" : item.color === "cyan" ? "bg-cyan-400" : item.color === "amber" ? "bg-amber-400" : "bg-green-400"}`} />
                </div>
                <div className="text-2xl font-bold text-white">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <div className="agent-card p-5">
              <span className="mono text-xs text-zinc-500 uppercase tracking-wider">application_status</span>
              {stats.totalApplications === 0 ? (
                <p className="mono text-xs text-zinc-600 mt-4">no_data</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {Object.entries(stats.applicationsByStatus).map(([status, count]) => {
                    const config = getStatusConfig(status);
                    const percentage = Math.round((count / stats.totalApplications) * 100);
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`mono text-xs px-2 py-0.5 rounded border ${config.bg} ${config.border} ${config.text}`}>
                            {status}
                          </span>
                          <span className="mono text-xs text-zinc-500">{count}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-zinc-900 overflow-hidden">
                            <div className={`h-full rounded-full ${config.text.replace("text-", "bg-")}`} style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="mono text-xs text-zinc-600 w-8">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="agent-card p-5">
              <span className="mono text-xs text-zinc-500 uppercase tracking-wider">activity_overview</span>
              <div className="mt-4 space-y-3">
                {[
                  { label: "resumes_uploaded", value: stats.resumes },
                  { label: "avg_days_active", value: `${stats.avgTimeToResponse}d` },
                  { label: "offers_received", value: stats.applicationsByStatus["Offer"] || 0 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                    <span className="mono text-xs text-zinc-500">{item.label}</span>
                    <span className="mono text-sm font-medium text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="agent-card p-5">
            <span className="mono text-xs text-zinc-500 uppercase tracking-wider">recent_applications</span>
            {applications.length === 0 ? (
              <p className="mono text-xs text-zinc-600 mt-4">no_data</p>
            ) : (
              <div className="mt-4 space-y-2">
                {applications.slice(0, 5).map((app) => {
                  const config = getStatusConfig(app.status);
                  return (
                    <div key={app.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-900/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">{app.jobTitle || `Job #${app.jobId.slice(0, 8)}`}</span>
                          <span className={`mono text-xs px-1.5 py-0.5 rounded border ${config.bg} ${config.border} ${config.text}`}>
                            {app.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {app.companyName && <span className="mono text-xs text-cyan-400">{app.companyName}</span>}
                          <span className="mono text-xs text-zinc-600">• {formatDate(app.appliedAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
