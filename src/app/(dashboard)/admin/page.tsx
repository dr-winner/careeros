import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// ─── Admin guard ──────────────────────────────────────────────────────────────

function isAdmin(email: string): boolean {
  const raw = process.env.ADMIN_EMAILS ?? "";
  if (!raw) return false;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

// Approve or reject a pending employer job submission. Re-checks the
// admin guard — server actions are callable outside this page's render.
async function moderateJob(formData: FormData) {
  "use server";
  const user = await getDbUser();
  if (!user || !isAdmin(user.email)) return;

  const jobId = String(formData.get("jobId") || "");
  const action = String(formData.get("action") || "");
  if (!jobId || !["approve", "reject"].includes(action)) return;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: action === "approve" ? "active" : "rejected" },
  });
  revalidatePath("/admin");
}

// Grant or revoke Premium on any account. Grants use status "comp"
// (admin-comped): the expiry cron only downgrades status "active", so
// comps never lapse, and we deliberately bypass activateSubscription so
// a comp never triggers a referral cash payout.
async function setPremium(formData: FormData) {
  "use server";
  const admin = await getDbUser();
  if (!admin || !isAdmin(admin.email)) return;

  const userId = String(formData.get("userId") || "");
  const action = String(formData.get("action") || "");
  if (!userId || !["grant", "revoke"].includes(action)) return;

  await prisma.user.update({
    where: { id: userId },
    data:
      action === "grant"
        ? {
            isPremium: true,
            premiumSince: new Date(),
            subscriptionStatus: "comp",
            billingCycle: null,
            currentPeriodEnd: null,
          }
        : {
            isPremium: false,
            subscriptionStatus: "cancelled",
            billingCycle: null,
            currentPeriodEnd: null,
          },
  });
  revalidatePath("/admin");
}

// Small grant/revoke button pair used in user rows
function PremiumToggle({ userId, isPremium }: { userId: string; isPremium: boolean }) {
  return (
    <form action={setPremium}>
      <input type="hidden" name="userId" value={userId} />
      {isPremium ? (
        <button
          name="action"
          value="revoke"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-500/20 transition-all mono"
        >
          Revoke Pro
        </button>
      ) : (
        <button
          name="action"
          value="grant"
          className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-[11px] font-bold text-green-400 hover:bg-green-500/20 transition-all mono"
        >
          Grant Pro
        </button>
      )}
    </form>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyRow {
  day: Date;
  count: bigint;
}

interface TopJobRow {
  title: string;
  count: bigint;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number, total: number) {
  if (!total) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

function fmt(n: number) {
  return n.toLocaleString();
}

// Bar chart: array of { label, value } → renders proportional bars
function BarChart({
  data,
  color = "#8b5cf6",
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span
            className="text-xs text-zinc-400 mono truncate"
            style={{ width: 180, flexShrink: 0 }}
            title={d.label}
          >
            {d.label.length > 28 ? d.label.slice(0, 27) + "…" : d.label}
          </span>
          <div className="flex-1 h-5 rounded bg-white/[0.04] overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: color,
                opacity: 0.75,
              }}
            />
          </div>
          <span className="text-xs text-zinc-400 mono w-6 text-right flex-shrink-0">
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// Mini sparkline: last N days as tiny bars
function Sparkline({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-[2px] h-10">
      {data.map((d) => (
        <div
          key={d.day}
          className="flex-1 rounded-sm bg-purple-500/60"
          style={{ height: `${Math.max(4, (d.count / max) * 40)}px` }}
          title={`${d.day}: ${d.count}`}
        />
      ))}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent = "purple",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "purple" | "cyan" | "green" | "amber";
}) {
  const colors = {
    purple: "text-purple-400",
    cyan: "text-cyan-400",
    green: "text-green-400",
    amber: "text-amber-400",
  };
  return (
    <div className="agent-card p-5">
      <p className="text-xs text-zinc-500 mono uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-bold ${colors[accent]} font-display`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getDbUser();
  if (!user || !isAdmin(user.email)) redirect("/dashboard");

  const { q } = await searchParams;
  const userQuery = (q || "").trim();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    premiumUsers,
    newUsersLast7,
    newUsersLast30,
    totalAnalyses,
    totalResumes,
    totalApplications,
    totalCoverLetters,
    totalInterviewSessions,
    avgFitScore,
    subscriptionRows,
    topJobRows,
    dailySignupRows,
    dailyAnalysisRows,
    recentSignups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isPremium: true } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.fitAnalysis.count(),
    prisma.resume.count(),
    prisma.application.count(),
    prisma.coverLetter.count(),
    prisma.interviewSession.count(),
    prisma.fitAnalysis.aggregate({ _avg: { fitScore: true } }),
    // Subscription status breakdown
    prisma.user.groupBy({
      by: ["subscriptionStatus"],
      where: { isPremium: true },
      _count: { id: true },
    }),
    // Top analyzed job titles (raw SQL for join)
    prisma.$queryRaw<TopJobRow[]>`
      SELECT j.title, COUNT(fa.id)::int AS count
      FROM "FitAnalysis" fa
      JOIN "Job" j ON fa."jobId" = j.id
      GROUP BY j.title
      ORDER BY count DESC
      LIMIT 10
    `,
    // Daily signups last 14 days
    prisma.$queryRaw<DailyRow[]>`
      SELECT DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC') AS day,
             COUNT(*)::int AS count
      FROM "User"
      WHERE "createdAt" >= ${fourteenDaysAgo}
      GROUP BY day
      ORDER BY day ASC
    `,
    // Daily analyses last 14 days
    prisma.$queryRaw<DailyRow[]>`
      SELECT DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC') AS day,
             COUNT(*)::int AS count
      FROM "FitAnalysis"
      WHERE "createdAt" >= ${fourteenDaysAgo}
      GROUP BY day
      ORDER BY day ASC
    `,
    // Latest 8 signups
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        fullName: true,
        email: true,
        isPremium: true,
        createdAt: true,
        subscriptionStatus: true,
        _count: { select: { fitAnalyses: true, resumes: true } },
      },
    }),
  ]);

  // Account lookup for premium management
  const foundUsers = userQuery
    ? await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: userQuery, mode: "insensitive" } },
            { fullName: { contains: userQuery, mode: "insensitive" } },
          ],
        },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          email: true,
          isPremium: true,
          subscriptionStatus: true,
          premiumSince: true,
        },
      })
    : [];

  // Employer submissions awaiting review (created via the public form)
  const pendingJobs = await prisma.job.findMany({
    where: { externalSource: "employer", status: "pending_review" },
    orderBy: { postedAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      companyName: true,
      location: true,
      applicationUrl: true,
      description: true,
      postedAt: true,
    },
  });

  // ── Derived numbers ──────────────────────────────────────────────────────────

  const conversionRate = pct(premiumUsers, totalUsers);
  const avgScore = avgFitScore._avg.fitScore
    ? `${(avgFitScore._avg.fitScore * 100).toFixed(0)}%`
    : "—";

  // Revenue estimate: active monthly × 25 + active annual × 199
  const activeMonthly = subscriptionRows.find(
    (r) => r.subscriptionStatus === "active"
  )?._count.id ?? 0;
  // For annual we'd need to split by billingCycle — approximate as actives
  const estimatedMRR = activeMonthly * 25;

  // Subscription breakdown for display
  const subBreakdown = [
    {
      label: "Active",
      count:
        subscriptionRows.find((r) => r.subscriptionStatus === "active")?._count.id ?? 0,
      color: "text-green-400",
    },
    {
      label: "Lifetime (GHS 99)",
      count:
        subscriptionRows.find((r) => r.subscriptionStatus === null)?._count.id ?? 0,
      color: "text-cyan-400",
    },
    {
      label: "Comped (admin)",
      count:
        subscriptionRows.find((r) => r.subscriptionStatus === "comp")?._count.id ?? 0,
      color: "text-purple-400",
    },
    {
      label: "Expired",
      count:
        subscriptionRows.find((r) => r.subscriptionStatus === "expired")?._count.id ?? 0,
      color: "text-amber-400",
    },
    {
      label: "Cancelled",
      count:
        subscriptionRows.find((r) => r.subscriptionStatus === "cancelled")?._count.id ?? 0,
      color: "text-red-400",
    },
  ];

  // Normalise daily rows into a full 14-day map (fill gaps with 0)
  function buildDailyData(rows: DailyRow[]) {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const key = new Date(r.day).toISOString().slice(0, 10);
      map.set(key, Number(r.count));
    });
    const result: { day: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      result.push({ day: key, count: map.get(key) ?? 0 });
    }
    return result;
  }

  const signupSparkline = buildDailyData(dailySignupRows);
  const analysisSparkline = buildDailyData(dailyAnalysisRows);

  const topJobs = topJobRows.map((r) => ({
    label: r.title,
    value: Number(r.count),
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Admin Dashboard</h1>
          <p className="text-sm text-zinc-500 mono mt-1">
            {now.toUTCString()} · live from DB
          </p>
        </div>
        <span className="agent-status text-xs">
          <span className="status-dot bg-green-400" />
          operational
        </span>
      </div>

      {/* Row 1: Core KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={fmt(totalUsers)} accent="purple" />
        <StatCard
          label="Premium Users"
          value={fmt(premiumUsers)}
          sub={`${conversionRate} conversion`}
          accent="cyan"
        />
        <StatCard label="Total Analyses" value={fmt(totalAnalyses)} accent="purple" />
        <StatCard label="CVs Uploaded" value={fmt(totalResumes)} accent="green" />
      </div>

      {/* Row 2: Activity KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Applications Tracked" value={fmt(totalApplications)} accent="purple" />
        <StatCard label="Cover Letters" value={fmt(totalCoverLetters)} accent="purple" />
        <StatCard label="Interview Sessions" value={fmt(totalInterviewSessions)} accent="cyan" />
        <StatCard
          label="Est. MRR"
          value={`GHS ${fmt(estimatedMRR)}`}
          sub="active monthly subs × 25"
          accent="amber"
        />
      </div>

      {/* Row 3: Growth sparklines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="agent-card p-5 space-y-3">
          <p className="text-xs text-zinc-500 mono uppercase tracking-widest">
            New Signups
          </p>
          <Sparkline data={signupSparkline} />
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-white font-bold">{newUsersLast7}</span>
              <span className="text-zinc-500 ml-1">last 7d</span>
            </div>
            <div>
              <span className="text-white font-bold">{newUsersLast30}</span>
              <span className="text-zinc-500 ml-1">last 30d</span>
            </div>
          </div>
        </div>

        <div className="agent-card p-5 space-y-3">
          <p className="text-xs text-zinc-500 mono uppercase tracking-widest">
            Analyses Run
          </p>
          <Sparkline data={analysisSparkline} />
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-white font-bold">{avgScore}</span>
              <span className="text-zinc-500 ml-1">avg fit score</span>
            </div>
            <div>
              <span className="text-white font-bold">{fmt(totalAnalyses)}</span>
              <span className="text-zinc-500 ml-1">all time</span>
            </div>
          </div>
        </div>

        <div className="agent-card p-5 space-y-3">
          <p className="text-xs text-zinc-500 mono uppercase tracking-widest">
            Subscriptions
          </p>
          <div className="space-y-2 pt-1">
            {subBreakdown.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{s.label}</span>
                <span className={`font-bold mono ${s.color}`}>{s.count}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 pt-1">
            {premiumUsers} premium of {totalUsers} total
          </p>
        </div>
      </div>

      {/* Account lookup: grant/revoke premium */}
      <div className="agent-card p-5">
        <p className="text-xs text-zinc-500 mono uppercase tracking-widest mb-4">
          Manage Premium Access
        </p>
        <form method="GET" className="flex gap-2 mb-4">
          <input
            type="text"
            name="q"
            defaultValue={userQuery}
            placeholder="Search by email or name…"
            className="agent-input flex-1"
          />
          <button className="agent-button-primary px-5 text-sm">Search</button>
        </form>
        {userQuery && foundUsers.length === 0 && (
          <p className="text-sm text-zinc-600">No accounts match “{userQuery}”.</p>
        )}
        <div className="space-y-2">
          {foundUsers.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5"
            >
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{u.fullName || "—"}</p>
                <p className="text-xs text-zinc-500 truncate mono">{u.email}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full mono ${
                    u.isPremium
                      ? "bg-purple-500/20 text-purple-300"
                      : "bg-white/5 text-zinc-500"
                  }`}
                >
                  {u.isPremium ? (u.subscriptionStatus || "PRO").toUpperCase() : "FREE"}
                </span>
                <PremiumToggle userId={u.id} isPremium={u.isPremium} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employer job moderation queue */}
      {pendingJobs.length > 0 && (
        <div className="agent-card p-5 border border-amber-500/20">
          <p className="text-xs text-amber-400 mono uppercase tracking-widest mb-4">
            Employer Jobs Awaiting Review ({pendingJobs.length})
          </p>
          <div className="space-y-4">
            {pendingJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {job.title}{" "}
                      <span className="text-zinc-500 font-normal">
                        at {job.companyName} · {job.location}
                      </span>
                    </p>
                    <a
                      href={job.applicationUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono text-xs text-cyan-400 break-all"
                    >
                      {job.applicationUrl}
                    </a>
                    <p className="text-xs text-zinc-500 mt-2 line-clamp-3 whitespace-pre-wrap">
                      {(job.description || "").slice(0, 400)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <form action={moderateJob}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <button
                        name="action"
                        value="approve"
                        className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-bold text-green-400 hover:bg-green-500/20 transition-all"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={moderateJob}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <button
                        name="action"
                        value="reject"
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 4: Top jobs + Recent signups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="agent-card p-5">
          <p className="text-xs text-zinc-500 mono uppercase tracking-widest mb-4">
            Top Analyzed Job Roles
          </p>
          {topJobs.length > 0 ? (
            <BarChart data={topJobs} />
          ) : (
            <p className="text-sm text-zinc-600">No analyses yet.</p>
          )}
        </div>

        <div className="agent-card p-5">
          <p className="text-xs text-zinc-500 mono uppercase tracking-widest mb-4">
            Latest Signups
          </p>
          <div className="space-y-3">
            {recentSignups.map((u) => (
              <div
                key={u.email}
                className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">
                    {u.fullName || "—"}
                  </p>
                  <p className="text-xs text-zinc-500 truncate mono">{u.email}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <div className="text-right text-xs text-zinc-500">
                    <p>{u._count.fitAnalyses} analyses</p>
                    <p>{u._count.resumes} CVs</p>
                  </div>
                  {u.isPremium ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 mono">
                      PRO
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-zinc-500 mono">
                      FREE
                    </span>
                  )}
                  <PremiumToggle userId={u.id} isPremium={u.isPremium} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
