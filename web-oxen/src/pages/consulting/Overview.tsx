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
  Briefcase,
} from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { StatCard } from "@/components/consulting/StatCard";
import { ChartBar, ChartRing } from "@/components/consulting/ChartBar";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import {
  fetchDashboardStats,
  fetchMonthlySeries,
  fetchClientGroupBy,
  fetchApplicationStatusDistribution,
  fetchMembers,
  type ApplicationStatus,
} from "@/lib/consulting";
import { cn } from "@/lib/utils";

type DateFilter = "today" | "week" | "month" | "3months" | "year" | "custom";

const FILTERS: { id: DateFilter; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "3months", label: "Last 3 Months" },
  { id: "year", label: "This Year" },
  { id: "custom", label: "Custom" },
];

const APP_STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: "#38bdf8",
  documents: "#fbbf24",
  processing: "#fb923c",
  submitted: "#60a5fa",
  approved: "#34d399",
  rejected: "#f87171",
  completed: "#fbbf24",
};

export default function ConsultingOverview() {
  const { company } = useConsulting();
  const [filter, setFilter] = useState<DateFilter>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useSEO({ title: "Dashboard | OXEN Consulting", description: "Consulting business overview" });

  const companyId = company?.id ?? "";

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["consulting-stats", companyId],
    queryFn: () => fetchDashboardStats(companyId),
    enabled: !!companyId,
  });

  const { data: monthly } = useQuery({
    queryKey: ["consulting-monthly", companyId],
    queryFn: () => fetchMonthlySeries(companyId, 6),
    enabled: !!companyId,
  });

  const { data: byPackage } = useQuery({
    queryKey: ["consulting-by-package", companyId],
    queryFn: () => fetchClientGroupBy(companyId, "service_id"),
    enabled: !!companyId,
  });

  const { data: byDestination } = useQuery({
    queryKey: ["consulting-by-destination", companyId],
    queryFn: () => fetchClientGroupBy(companyId, "destination_country"),
    enabled: !!companyId,
  });

  const { data: appDist } = useQuery({
    queryKey: ["consulting-app-dist", companyId],
    queryFn: () => fetchApplicationStatusDistribution(companyId),
    enabled: !!companyId,
  });

  const { data: members } = useQuery({
    queryKey: ["consulting-members", companyId],
    queryFn: () => fetchMembers(companyId),
    enabled: !!companyId,
  });

  const deltaWeek = useMemo(() => {
    if (!stats || stats.previousNewThisWeek === 0) return null;
    return ((stats.newThisWeek - stats.previousNewThisWeek) / stats.previousNewThisWeek) * 100;
  }, [stats]);

  const deltaMonth = useMemo(() => {
    if (!stats || stats.previousNewThisMonth === 0) return null;
    return ((stats.newThisMonth - stats.previousNewThisMonth) / stats.previousNewThisMonth) * 100;
  }, [stats]);

  const monthlyChartData = useMemo(
    () => (monthly ?? []).map((m) => ({ label: m.label, value: m.clients, secondary: m.revenue })),
    [monthly],
  );

  const revenueChartData = useMemo(
    () => (monthly ?? []).map((m) => ({ label: m.label, value: m.revenue })),
    [monthly],
  );

  const successData = useMemo(
    () => [
      { label: "Success", count: stats?.successfulClients ?? 0, color: "#34d399" },
      { label: "Unsuccessful", count: stats?.unsuccessfulClients ?? 0, color: "#f87171" },
      { label: "Pending", count: stats?.pendingClients ?? 0, color: "#fbbf24" },
    ],
    [stats],
  );

  const appDistData = useMemo(
    () =>
      (appDist ?? []).map((a) => ({
        label: a.status.replace(/_/g, " "),
        count: a.count,
        color: APP_STATUS_COLORS[a.status] ?? "#94a3b8",
      })),
    [appDist],
  );

  const employeePerfData = useMemo(() => {
    return (members ?? [])
      .filter((m) => m.status === "active")
      .slice(0, 6)
      .map((m) => ({
        label: (m.profile?.name ?? "User").split(" ")[0] ?? "?",
        value: 0, // Phase 2 will compute real per-employee client counts via a view
      }));
  }, [members]);

  const hasData = (stats?.totalClients ?? 0) > 0;

  return (
    <DashboardShell title="Dashboard" subtitle="Business overview">
      {/* Date filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex flex-wrap items-center gap-2"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "glass text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
        {filter === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-input bg-background/50 px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-input bg-background/50 px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        )}
      </motion.div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Clients"
          value={stats?.totalClients ?? 0}
          icon={Users}
          accent="gold"
          delay={0}
        />
        <StatCard
          label="New This Week"
          value={stats?.newThisWeek ?? 0}
          icon={UserPlus}
          accent="green"
          delta={deltaWeek}
          delay={0.05}
        />
        <StatCard
          label="New This Month"
          value={stats?.newThisMonth ?? 0}
          icon={Calendar}
          accent="blue"
          delta={deltaMonth}
          delay={0.1}
        />
        <StatCard
          label="Active Applications"
          value={stats?.activeApplications ?? 0}
          icon={FileStack}
          accent="gold"
          delay={0.15}
        />
        <StatCard
          label="Successful"
          value={stats?.successfulClients ?? 0}
          icon={CheckCircle2}
          accent="green"
          delay={0.2}
        />
        <StatCard
          label="Unsuccessful"
          value={stats?.unsuccessfulClients ?? 0}
          icon={XCircle}
          accent="red"
          delay={0.25}
        />
        <StatCard
          label="Pending"
          value={stats?.pendingClients ?? 0}
          icon={Clock}
          accent="blue"
          delay={0.3}
        />
        <StatCard
          label="Total Revenue"
          value={`$${(stats?.totalRevenue ?? 0).toLocaleString()}`}
          icon={DollarSign}
          accent="gold"
          delay={0.35}
        />
        <StatCard
          label="Monthly Revenue"
          value={`$${(stats?.monthlyRevenue ?? 0).toLocaleString()}`}
          icon={TrendingUp}
          accent="green"
          delay={0.4}
        />
        <StatCard
          label="Annual Revenue"
          value={`$${(stats?.annualRevenue ?? 0).toLocaleString()}`}
          icon={TrendingUp}
          accent="gold"
          delay={0.45}
        />
      </div>

      {/* Charts */}
      {statsLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass h-48 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : !hasData ? (
        <EmptyState
          icon={Briefcase}
          title="No data yet"
          description="Your dashboard will populate as you add clients, applications, and tour packages. Start by publishing your first tour package."
          action={{ label: "Publish a package", onClick: () => (window.location.href = "/consulting/posts") }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ChartBar
            title="Clients by Month"
            data={monthlyChartData}
            format="count"
            showSecondary
          />
          <ChartBar
            title="Revenue by Month"
            data={revenueChartData}
            format="currency"
          />
          <ChartRing
            title="Successful vs Unsuccessful"
            data={successData}
          />
          <ChartBar
            title="Clients by Service Package"
            data={(byPackage ?? []).slice(0, 6).map((p) => ({ label: p.label.slice(0, 10), value: p.count }))}
          />
          <ChartBar
            title="Clients by Destination"
            data={(byDestination ?? []).slice(0, 6).map((p) => ({ label: p.label.slice(0, 10), value: p.count }))}
          />
          <ChartRing
            title="Application Status"
            data={appDistData}
          />
          <ChartBar
            title="Employee Performance"
            data={employeePerfData}
            className="sm:col-span-2 lg:col-span-1"
          />
          {/* Conversion/success rate card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="glass rounded-2xl p-5"
          >
            <h3 className="mb-4 font-display text-sm font-bold">Rates</h3>
            <div className="space-y-3">
              <RateRow
                label="Conversion (lead → paid)"
                value={
                  stats && stats.totalClients > 0
                    ? `${(((stats.totalClients - stats.pendingClients) / stats.totalClients) * 100).toFixed(0)}%`
                    : "—"
                }
              />
              <RateRow
                label="Success rate"
                value={
                  stats && stats.totalClients > 0
                    ? `${((stats.successfulClients / stats.totalClients) * 100).toFixed(0)}%`
                    : "—"
                }
              />
              <RateRow
                label="Refund rate"
                value="0%"
              />
            </div>
          </motion.div>
        </div>
      )}
    </DashboardShell>
  );
}

function RateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-display text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}
