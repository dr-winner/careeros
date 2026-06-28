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
    const config: Record<string, { bg: string; text: string; border: string; bar: string }> = {
      Applied:   { bg: "bg-cyan-500/15",   text: "text-cyan-400",   border: "border-cyan-500/30",   bar: "bg-cyan-500" },
      Screening: { bg: "bg-amber-500/15",  text: "text-amber-400",  border: "border-amber-500/30",  bar: "bg-amber-500" },
      Interview: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", bar: "bg-purple-500" },
      Offer:     { bg: "bg-green-500/15",  text: "text-green-400",  border: "border-green-500/30",  bar: "bg-green-500" },
      Rejected:  { bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/30",    bar: "bg-red-500" },
      Withdrawn: { bg: "bg-zinc-500/15",   text: "text-zinc-400",   border: "border-zinc-500/30",   bar: "bg-zinc-500" },
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold gradient-text">Analytics</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Track your job search performance</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-8 w-1/2 rounded bg-white/5 mb-2" />
              <div className="h-4 w-2/3 rounded bg-white/5" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="animate-fade-up delay-100 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="stat-card stat-card-purple">
              <div className="section-label mb-2">Applications</div>
              <div className="text-3xl font-bold text-white">{stats.totalApplications}</div>
            </div>
            <div className="stat-card stat-card-cyan">
              <div className="section-label mb-2">Response Rate</div>
              <div className="text-3xl font-bold text-white">{stats.responseRate}%</div>
            </div>
            <div className="stat-card stat-card-amber">
              <div className="section-label mb-2">Saved Jobs</div>
              <div className="text-3xl font-bold text-white">{stats.savedJobs}</div>
            </div>
            <div className="stat-card stat-card-green">
              <div className="section-label mb-2">Active Alerts</div>
              <div className="text-3xl font-bold text-white">{stats.alerts}</div>
            </div>
          </div>

          <div className="animate-fade-up delay-200 grid gap-5 lg:grid-cols-2">
            {/* Application Status breakdown */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
              <p className="section-label">Application Status</p>
              {stats.totalApplications === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-zinc-600">No applications yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.applicationsByStatus).map(([status, count]) => {
                    const config = getStatusConfig(status);
                    const percentage = Math.round((count / stats.totalApplications) * 100);
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <span className={`mono text-[10px] px-2 py-0.5 rounded border flex-shrink-0 w-20 text-center ${config.bg} ${config.border} ${config.text}`}>
                          {status}
                        </span>
                        <div className="flex-1 h-1 rounded-full bg-zinc-900 overflow-hidden">
                          <div className={`h-full rounded-full ${config.bar}`} style={{ width: `${percentage}%` }} />
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="mono text-xs text-white font-medium w-4 text-right">{count}</span>
                          <span className="mono text-xs text-zinc-600 w-8">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Activity overview */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
              <p className="section-label">Activity Overview</p>
              <div className="space-y-3">
                {[
                  { label: "CVs Uploaded", value: stats.resumes },
                  { label: "Avg. Days Active", value: `${stats.avgTimeToResponse}d` },
                  { label: "Offers Received", value: stats.applicationsByStatus["Offer"] || 0 },
                  { label: "Interviews", value: stats.applicationsByStatus["Interview"] || 0 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                    <span className="text-sm text-zinc-400">{item.label}</span>
                    <span className="text-sm font-bold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent applications */}
          <div className="animate-fade-up delay-300 rounded-2xl border border-white/[0.08] bg-[#0d0d18] p-5">
            <p className="section-label">Recent Applications</p>
            {applications.length === 0 ? (
              <div className="flex items-center justify-center h-24">
                <p className="text-sm text-zinc-600">No applications to display</p>
              </div>
            ) : (
              <div className="space-y-2">
                {applications.slice(0, 5).map((app) => {
                  const config = getStatusConfig(app.status);
                  return (
                    <div key={app.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">{app.jobTitle || `Job #${app.jobId.slice(0, 8)}`}</span>
                          <span className={`mono text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${config.bg} ${config.border} ${config.text}`}>
                            {app.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {app.companyName && <span className="mono text-xs text-cyan-400">{app.companyName}</span>}
                          <span className="mono text-xs text-zinc-600">· {formatDate(app.appliedAt)}</span>
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
