import { useMemo } from "react";
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
  TrendingDown,
  AlertTriangle,
  PackagePlus,
  Building2,
  UserPlus as InviteIcon,
  ArrowRight,
  Sparkles,
  Activity as ActivityIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { StatCard } from "@/components/consulting/StatCard";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import {
  fetchAnalyticsStats as apiFetchAnalyticsStats,
  fetchActivityLogs as apiFetchActivityLogs,
} from "@/lib/consulting";
import {
  testFetchAnalyticsStats,
  testFetchActivityLogs,
} from "@/lib/consulting-test-mode";
import {
  fetchDashboardFinanceStats,
  type DashboardFinanceStats,
} from "@/lib/consulting-pos";

const springIn = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
};

/**
 * DashboardHome — consulting dashboard overview.
 *
 * Shows real stats sourced from fetchAnalyticsStats (with test-mode fallback)
 * and a recent activity feed. No fake numbers anywhere — new companies see
 * real zeros with polished empty states + bootstrap action cards.
 */
export default function DashboardHome() {
  const { company, isTestMode } = useConsulting();
  const navigate = useNavigate();
  const companyId = company?.id ?? "";

  useSEO({
    title: "Dashboard | OXEN Consulting",
    description: "Your consulting business overview.",
  });

  // Stats
  const testStatsQ = useQuery({
    queryKey: ["consulting-analytics-stats-test-home", companyId],
    queryFn: () => testFetchAnalyticsStats(companyId),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });
  const realStatsQ = useQuery({
    queryKey: ["consulting-analytics-stats-home", companyId],
    queryFn: () => apiFetchAnalyticsStats(companyId),
    enabled: !!companyId && !isTestMode,
  });
  const stats = isTestMode ? testStatsQ.data : realStatsQ.data;

  // Finance stats from POS + Cashier (real data, never fake)
  const financeQ = useQuery({
    queryKey: ["consulting-finance-stats", companyId],
    queryFn: () => fetchDashboardFinanceStats(companyId),
    enabled: !!companyId,
    staleTime: 0,
  });
  const finance = financeQ.data;

  // Recent activity (latest 5)
  const testActivityQ = useQuery({
    queryKey: ["consulting-activity-test-home", companyId],
    queryFn: () => testFetchActivityLogs(companyId, { limit: 5 }),
    enabled: !!companyId && isTestMode,
    staleTime: 0,
  });
  const realActivityQ = useQuery({
    queryKey: ["consulting-activity-home", companyId],
    queryFn: () => apiFetchActivityLogs(companyId, { limit: 5 }),
    enabled: !!companyId && !isTestMode,
  });
  const activity = isTestMode ? (testActivityQ.data ?? []) : (realActivityQ.data ?? []);

  const loading = isTestMode ? testStatsQ.isLoading : realStatsQ.isLoading;

  const actions = useMemo(
    () => [
      {
        icon: PackagePlus,
        title: "Publish your first tour package",
        description: "Publish a visa, travel, or consultation package so clients can find and buy it.",
        cta: "Create package",
        to: "/consulting/posts",
      },
      {
        icon: Building2,
        title: "Complete your company profile",
        description: "Add your logo, description, working hours, and destination countries.",
        cta: "Edit profile",
        to: "/consulting/company-profile",
      },
      {
        icon: InviteIcon,
        title: "Invite your first employee",
        description: "Add consultants and managers to help handle client applications.",
        cta: "Invite employee",
        to: "/consulting/employees",
      },
    ],
    [],
  );

  const hasNoData =
    !loading &&
    finance &&
    finance.totalClients === 0 &&
    finance.activeApplications === 0 &&
    finance.totalRevenue === 0;

  return (
    <DashboardShell
      title="Dashboard"
      subtitle="Business overview"
      actions={
        <button
          onClick={() => navigate("/consulting/analytics")}
          className="hidden items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-white/[0.1] sm:inline-flex"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          View analytics
        </button>
      }
    >
      {isTestMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200/90"
        >
          <span className="font-bold">Test Mode:</span> Your onboarding was saved locally. The Supabase consulting
          tables are not connected yet, so the dashboard shows real zero values. Apply the migration to start storing
          real data.
        </motion.div>
      )}

      {/* Stat cards — real zeros when no data */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Clients" value={finance?.totalClients ?? 0} icon={Users} accent="gold" delay={0} />
        <StatCard
          label="New This Month"
          value={finance?.newClientsThisMonth ?? 0}
          icon={UserPlus}
          accent="blue"
          delay={0.05}
        />
        <StatCard
          label="Active Applications"
          value={finance?.activeApplications ?? 0}
          icon={FileStack}
          accent="blue"
          delay={0.1}
        />
        <StatCard
          label="Successful"
          value={finance?.successfulCases ?? 0}
          icon={CheckCircle2}
          accent="green"
          delay={0.15}
        />
        <StatCard
          label="Unsuccessful"
          value={finance?.unsuccessfulCases ?? 0}
          icon={XCircle}
          accent="red"
          delay={0.2}
        />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Pending" value={finance?.pendingCases ?? 0} icon={Clock} accent="blue" delay={0.25} />
        <StatCard
          label="Success Rate"
          value={`${(finance?.successRate ?? 0).toFixed(1)}%`}
          icon={TrendingUp}
          accent="green"
          delay={0.3}
        />
        <StatCard
          label="Monthly Revenue"
          value={`${finance?.currency ?? "USD"} ${(finance?.monthlyRevenue ?? 0).toLocaleString()}`}
          icon={DollarSign}
          accent="gold"
          delay={0.35}
        />
        <StatCard
          label="Annual Revenue"
          value={`${finance?.currency ?? "USD"} ${(finance?.annualRevenue ?? 0).toLocaleString()}`}
          icon={DollarSign}
          accent="gold"
          delay={0.4}
        />
        <StatCard
          label="Total Revenue"
          value={`${finance?.currency ?? "USD"} ${(finance?.totalRevenue ?? 0).toLocaleString()}`}
          icon={DollarSign}
          accent="gold"
          delay={0.45}
        />
      </div>

      {/* Optional financial cards from POS/Cashier */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Outstanding Payments"
          value={`${finance?.currency ?? "USD"} ${(finance?.outstandingPayments ?? 0).toLocaleString()}`}
          icon={AlertTriangle}
          accent="gold"
          delay={0.5}
        />
        <StatCard
          label="Month Expenses"
          value={`${finance?.currency ?? "USD"} ${(finance?.monthExpenses ?? 0).toLocaleString()}`}
          icon={TrendingDown}
          accent="red"
          delay={0.55}
        />
        <StatCard
          label="Net Profit"
          value={`${finance?.currency ?? "USD"} ${(finance?.netProfit ?? 0).toLocaleString()}`}
          icon={DollarSign}
          accent={(finance?.netProfit ?? 0) >= 0 ? "green" : "red"}
          delay={0.6}
        />
        <StatCard
          label="Active Tour Sales"
          value={finance?.activeTourSales ?? 0}
          icon={FileStack}
          accent="blue"
          delay={0.65}
        />
      </div>

      {/* Welcome / empty-state actions */}
      {hasNoData && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springIn, delay: 0.1 }}
            className="glass mb-6 rounded-3xl p-6"
          >
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-lg font-extrabold text-foreground">
                Welcome{company ? `, ${company.name}` : ""} 👋
              </h3>
              <p className="text-sm text-muted-foreground">
                Your dashboard is ready. Start by setting up the three building blocks below — every section fills
                with real data as your business grows.
              </p>
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {actions.map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.button
                  key={a.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springIn, delay: 0.15 + i * 0.07 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(a.to)}
                  className="glass group flex flex-col items-start gap-3 rounded-3xl p-5 text-left transition hover:bg-white/[0.05]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <h4 className="font-display text-sm font-bold text-foreground">{a.title}</h4>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary transition group-hover:gap-2">
                    {a.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </motion.button>
              );
            })}
          </div>
        </>
      )}

      {/* Recent activity */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.3 }}
        className="glass mt-6 rounded-3xl p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold text-foreground">Recent activity</h3>
          </div>
          <button
            onClick={() => navigate("/consulting/activity")}
            className="text-[11px] font-semibold text-primary transition hover:gap-1.5"
          >
            View all →
          </button>
        </div>
        {activity.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No activity yet. Actions like inviting employees, creating clients, and publishing packages will appear here.
          </p>
        ) : (
          <ul className="space-y-2">
            {activity.map((log) => (
              <li
                key={log.id}
                className="flex items-center gap-3 rounded-xl bg-white/[0.02] px-3 py-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ActivityIcon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {log.action.replace(/_/g, " ")}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {log.actor?.name ?? "System"} · {new Date(log.created_at).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      {/* Getting-started checklist */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.4 }}
        className="glass mt-6 rounded-3xl p-6"
      >
        <h3 className="mb-4 font-display text-sm font-bold text-foreground">Getting started</h3>
        <ul className="space-y-2.5">
          {[
            { label: "Complete your company profile", to: "/consulting/company-profile" },
            { label: "Publish your first tour package", to: "/consulting/posts" },
            { label: "Invite team members", to: "/consulting/employees" },
            { label: "Publish your public profile", to: "/consulting/company-profile" },
            { label: "Explore your analytics", to: "/consulting/analytics" },
          ].map((step) => (
            <li key={step.label}>
              <button
                onClick={() => navigate(step.to)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/[0.04]"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 text-transparent">
                  <CheckCircle2 className="h-3 w-3" />
                </span>
                <span className="text-foreground">{step.label}</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </motion.div>
    </DashboardShell>
  );
}
