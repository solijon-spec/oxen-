import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  FileStack,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart,
} from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { StatCard } from "@/components/consulting/StatCard";
import { ChartBar, ChartRing } from "@/components/consulting/ChartBar";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import { useNavigate } from "react-router-dom";
import { fetchKpiProgress, currentPeriod, type KpiProgress } from "@/lib/kpi";
import {
  fetchAnalyticsStats as apiFetchAnalyticsStats,
  fetchAnalyticsMonthlySeries as apiFetchAnalyticsMonthlySeries,
  fetchFinalResultDistribution as apiFetchFinalResultDistribution,
  fetchClientsByDestination as apiFetchClientsByDestination,
  fetchEmployeePerformance as apiFetchEmployeePerformance,
  fetchApplicationStatusDistribution as apiFetchApplicationStatusDistribution,
  fetchClientGroupBy as apiFetchClientGroupBy,
  resolveDateRange,
  type DateRangePreset,
  type DateRange,
  type ApplicationStatus,
} from "@/lib/consulting";
import {
  testFetchAnalyticsStats,
  testFetchAnalyticsMonthlySeries,
  testFetchFinalResultDistribution,
  testFetchClientsByDestination,
  testFetchEmployeePerformance,
  testFetchClientsByPackage,
  testFetchApplicationStatusDistribution,
} from "@/lib/consulting-test-mode";
import { cn } from "@/lib/utils";

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "3months", label: "Last 3 Months" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

const APP_STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: "#0ea5e9",
  documents: "#f59e0b",
  processing: "#fb923c",
  submitted: "#3b82f6",
  approved: "#10b981",
  rejected: "#ef4444",
  completed: "#a855f7",
};

export default function ConsultingAnalytics() {
  const { company, isTestMode } = useConsulting();
  const navigate = useNavigate();
  const companyId = company?.id ?? "";

  const kpiQ = useQuery({
    queryKey: ["kpi-progress", companyId, currentPeriod()],
    queryFn: () => fetchKpiProgress(companyId, currentPeriod()),
    enabled: !!companyId,
  });
  const kpiProgress = kpiQ.data ?? [];

  const [preset, setPreset] = useState<DateRangePreset>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useSEO({ title: "Analytics | OXEN Consulting", description: "Business analytics and insights" });

  const range: DateRange = useMemo(
    () => resolveDateRange(preset, customStart || undefined, customEnd || undefined),
    [preset, customStart, customEnd],
  );

  // ── Stats ──────────────────────────────────────────────
  const testStatsQ = useQuery({
    queryKey: ["consulting-analytics-stats-test", companyId, range.start, range.end],
    queryFn: () => testFetchAnalyticsStats(companyId, range),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });
  const realStatsQ = useQuery({
    queryKey: ["consulting-analytics-stats", companyId, range.start, range.end],
    queryFn: () => apiFetchAnalyticsStats(companyId, range),
    enabled: !!companyId && !isTestMode,
  });
  const stats = isTestMode ? testStatsQ.data : realStatsQ.data;

  // ── Monthly series ─────────────────────────────────────
  const testMonthlyQ = useQuery({
    queryKey: ["consulting-analytics-monthly-test", companyId],
    queryFn: () => testFetchAnalyticsMonthlySeries(companyId, 6),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });
  const realMonthlyQ = useQuery({
    queryKey: ["consulting-analytics-monthly", companyId],
    queryFn: () => apiFetchAnalyticsMonthlySeries(companyId, 6),
    enabled: !!companyId && !isTestMode,
  });
  const monthly = isTestMode ? testMonthlyQ.data : realMonthlyQ.data;

  // ── Final result distribution ──────────────────────────
  const testFinalQ = useQuery({
    queryKey: ["consulting-analytics-final-test", companyId],
    queryFn: () => testFetchFinalResultDistribution(companyId),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });
  const realFinalQ = useQuery({
    queryKey: ["consulting-analytics-final", companyId],
    queryFn: () => apiFetchFinalResultDistribution(companyId),
    enabled: !!companyId && !isTestMode,
  });
  const finalDist = isTestMode ? testFinalQ.data : realFinalQ.data;

  // ── Clients by package ─────────────────────────────────
  const testByPkgQ = useQuery({
    queryKey: ["consulting-analytics-by-pkg-test", companyId],
    queryFn: () => testFetchClientsByPackage(companyId),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });
  const realByPkgQ = useQuery({
    queryKey: ["consulting-analytics-by-pkg", companyId],
    queryFn: () => apiFetchClientGroupBy(companyId, "service_id"),
    enabled: !!companyId && !isTestMode,
  });
  const byPackage = isTestMode ? testByPkgQ.data : realByPkgQ.data;

  // ── Clients by destination ─────────────────────────────
  const testByDestQ = useQuery({
    queryKey: ["consulting-analytics-by-dest-test", companyId],
    queryFn: () => testFetchClientsByDestination(companyId),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });
  const realByDestQ = useQuery({
    queryKey: ["consulting-analytics-by-dest", companyId],
    queryFn: () => apiFetchClientsByDestination(companyId),
    enabled: !!companyId && !isTestMode,
  });
  const byDestination = isTestMode ? testByDestQ.data : realByDestQ.data;

  // ── Employee performance ───────────────────────────────
  const testEmpQ = useQuery({
    queryKey: ["consulting-analytics-emp-test", companyId],
    queryFn: () => testFetchEmployeePerformance(companyId),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });
  const realEmpQ = useQuery({
    queryKey: ["consulting-analytics-emp", companyId],
    queryFn: () => apiFetchEmployeePerformance(companyId),
    enabled: !!companyId && !isTestMode,
  });
  const employeePerf = isTestMode ? testEmpQ.data : realEmpQ.data;

  // ── Application status distribution ────────────────────
  const testAppQ = useQuery({
    queryKey: ["consulting-analytics-app-test", companyId],
    queryFn: () => testFetchApplicationStatusDistribution(companyId),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });
  const realAppQ = useQuery({
    queryKey: ["consulting-analytics-app", companyId],
    queryFn: () => apiFetchApplicationStatusDistribution(companyId),
    enabled: !!companyId && !isTestMode,
  });
  const appDist = isTestMode ? testAppQ.data : realAppQ.data;

  const loading = isTestMode
    ? testStatsQ.isLoading
    : realStatsQ.isLoading;

  const hasNoData = stats && stats.totalClients === 0 && stats.activeApplications === 0;

  return (
    <DashboardShell
      title="Analytics"
      subtitle="Deep dive into your business performance"
    >
      {/* Date range filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex flex-wrap items-center gap-2"
      >
        <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
                preset === p.value ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-xl border border-input bg-background/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-xl border border-input bg-background/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(range.start).toLocaleDateString()} — {new Date(range.end).toLocaleDateString()}
        </span>
      </motion.div>

      {kpiProgress.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mb-5 rounded-2xl p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">This Month's KPI</h3>
            <button onClick={() => navigate("/consulting/kpi")} className="text-[11px] font-semibold text-primary hover:underline">
              Manage targets →
            </button>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {kpiProgress.slice(0, 4).map((p: KpiProgress) => {
              const pct = Math.min(100, p.percent);
              const over = p.percent >= 100;
              return (
                <div key={p.target.id} className="rounded-xl bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate font-semibold text-foreground">{p.label}</span>
                    <span className={cn("font-bold", over ? "text-emerald-400" : "text-amber-300")}>{p.percent}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className={cn("h-full rounded-full", over ? "bg-emerald-400" : "bg-primary")} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {isTestMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200/90"
        >
          <span className="font-bold">Test Mode:</span> Analytics compute from your local test clients. Apply the
          migration and add real clients to see live data here.
        </motion.div>
      )}

      {loading && !stats ? (
        <div className="flex h-40 items-center justify-center">
          <div className="oxen-skeleton-globe" />
        </div>
      ) : hasNoData ? (
        <EmptyState
          icon={BarChart3}
          title="No analytics yet"
          description="Once you have clients, applications, and revenue, this page will show detailed charts and KPIs. Create packages, invite clients, and start processing applications to see your business grow."
        />
      ) : (
        <>
          {/* 10 Stat cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total Clients" value={stats?.totalClients ?? 0} icon={Users} accent="gold" delay={0} />
            <StatCard
              label="New This Period"
              value={stats?.newClientsPeriod ?? 0}
              icon={UserPlus}
              accent="blue"
              delay={0.05}
            />
            <StatCard
              label="Active Applications"
              value={stats?.activeApplications ?? 0}
              icon={FileStack}
              accent="blue"
              delay={0.1}
            />
            <StatCard
              label="Successful"
              value={stats?.successfulClients ?? 0}
              icon={CheckCircle2}
              accent="green"
              delay={0.15}
            />
            <StatCard
              label="Unsuccessful"
              value={stats?.unsuccessfulClients ?? 0}
              icon={XCircle}
              accent="red"
              delay={0.2}
            />
          </div>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Pending"
              value={stats?.pendingClients ?? 0}
              icon={Clock}
              accent="blue"
              delay={0.25}
            />
            <StatCard
              label="Success Rate"
              value={`${(stats?.successRate ?? 0).toFixed(1)}%`}
              icon={TrendingUp}
              accent="green"
              delay={0.3}
            />
            <StatCard
              label="Monthly Revenue"
              value={`$${(stats?.monthlyRevenue ?? 0).toLocaleString()}`}
              icon={DollarSign}
              accent="gold"
              delay={0.35}
            />
            <StatCard
              label="Annual Revenue"
              value={`$${(stats?.annualRevenue ?? 0).toLocaleString()}`}
              icon={DollarSign}
              accent="gold"
              delay={0.4}
            />
            <StatCard
              label="Total Revenue"
              value={`$${(stats?.totalRevenue ?? 0).toLocaleString()}`}
              icon={DollarSign}
              accent="gold"
              delay={0.45}
            />
          </div>

          {/* Charts row 1 — clients by month + success vs unsuccessful */}
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <ChartBar
              title="Clients by Month"
              data={(monthly ?? []).map((m) => ({ label: m.label, value: m.clients }))}
              format="count"
            />
            <ChartBar
              title="Successful vs Unsuccessful"
              data={(monthly ?? []).map((m) => ({
                label: m.label,
                value: m.success,
                secondary: m.unsuccessful,
              }))}
              showSecondary
            />
          </div>

          {/* Charts row 2 — revenue trend + final result ring */}
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <ChartBar
              title="Revenue by Month"
              data={(monthly ?? []).map((m) => ({ label: m.label, value: m.revenue }))}
              format="currency"
            />
            <ChartRing
              title="Final Result Distribution"
              data={finalDist ?? []}
            />
          </div>

          {/* Charts row 3 — clients by package + clients by destination */}
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <ChartBar
              title="Clients by Package"
              data={(byPackage ?? []).slice(0, 6).map((d) => ({ label: d.label, value: d.count }))}
            />
            <ChartBar
              title="Clients by Destination"
              data={(byDestination ?? []).slice(0, 6).map((d) => ({ label: d.label, value: d.count }))}
            />
          </div>

          {/* Charts row 4 — employee performance + application status */}
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <ChartBar
              title="Employee Performance (Clients)"
              data={(employeePerf ?? []).map((e) => ({
                label: e.label,
                value: e.clients,
                secondary: e.successful,
              }))}
              showSecondary
            />
            <ChartRing
              title="Application Status"
              data={(appDist ?? []).map((a) => ({
                label: a.status.replace(/_/g, " "),
                count: a.count,
                color: APP_STATUS_COLORS[a.status] ?? "#94a3b8",
              }))}
            />
          </div>

          {/* Revenue mini-summary */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-bold text-foreground">Revenue Summary</h3>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <RevenueTile label="This Month" value={stats?.monthlyRevenue ?? 0} />
              <RevenueTile label="This Year" value={stats?.annualRevenue ?? 0} />
              <RevenueTile label="All Time" value={stats?.totalRevenue ?? 0} />
            </div>
          </motion.div>
        </>
      )}
    </DashboardShell>
  );
}

function RevenueTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-base font-bold text-primary">${value.toLocaleString()}</p>
    </div>
  );
}
