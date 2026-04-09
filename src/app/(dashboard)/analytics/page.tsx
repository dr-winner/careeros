"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

interface Application {
  id: string;
  jobId: string;
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
        fetch("/api/jobs?limit=1"),
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
        ["Screening", "Interview", "Offer"].includes(a.status)
      ).length;

      const responseRate = apps.length > 0
        ? Math.round((responses / apps.length) * 100)
        : 0;

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
        savedJobs: savedData.pagination?.total || 0,
        resumes: resumesData.resumes?.length || 0,
        alerts: alertsData.searches?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Applied": return "bg-blue-100 text-blue-700";
      case "Screening": return "bg-amber-100 text-amber-700";
      case "Interview": return "bg-purple-100 text-purple-700";
      case "Offer": return "bg-emerald-100 text-emerald-700";
      case "Rejected": return "bg-red-100 text-red-700";
      case "Withdrawn": return "bg-stone-100 text-stone-700";
      default: return "bg-stone-100 text-stone-700";
    }
  };

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="text-emerald-800">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-950">Analytics</h1>
        <p className="mt-2 text-emerald-700/70">
          Track your job search progress and insights.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-emerald-100 bg-white p-6">
              <div className="h-8 w-1/2 rounded bg-emerald-100"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-emerald-100 bg-white p-6">
              <p className="text-3xl font-bold text-emerald-800">{stats.totalApplications}</p>
              <p className="text-sm text-emerald-600">Total Applications</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-6">
              <p className="text-3xl font-bold text-emerald-800">{stats.responseRate}%</p>
              <p className="text-sm text-emerald-600">Response Rate</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-6">
              <p className="text-3xl font-bold text-emerald-800">{stats.savedJobs}</p>
              <p className="text-sm text-emerald-600">Saved Jobs</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-6">
              <p className="text-3xl font-bold text-emerald-800">{stats.alerts}</p>
              <p className="text-sm text-emerald-600">Active Alerts</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-emerald-100 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-emerald-950">Application Status</h2>
              {stats.totalApplications === 0 ? (
                <p className="text-emerald-600">No applications yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.applicationsByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(status)}`}>
                          {status}
                        </span>
                        <span className="text-sm text-emerald-600">{count}</span>
                      </div>
                      <div className="h-2 w-32 rounded-full bg-emerald-100">
                        <div
                          className="h-2 rounded-full bg-emerald-600"
                          style={{ width: `${(count / stats.totalApplications) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-emerald-100 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-emerald-950">Activity Overview</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                  <span className="text-emerald-700">Resumes Uploaded</span>
                  <span className="font-semibold text-emerald-900">{stats.resumes}</span>
                </div>
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                  <span className="text-emerald-700">Avg. Days Since Application</span>
                  <span className="font-semibold text-emerald-900">{stats.avgTimeToResponse} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700">Success Rate (Offers)</span>
                  <span className="font-semibold text-emerald-900">
                    {stats.applicationsByStatus["Offer"] || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-emerald-100 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-emerald-950">Recent Applications</h2>
            {applications.length === 0 ? (
              <p className="text-emerald-600">Start applying to track your progress!</p>
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex items-center justify-between rounded-lg border border-emerald-100 p-3">
                    <div>
                      <p className="font-medium text-emerald-900">Job #{app.jobId}</p>
                      <p className="text-sm text-emerald-600">
                        Applied {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
