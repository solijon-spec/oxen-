import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  CalendarDays,
  CalendarRange,
  UserCircle,
  FileStack,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  CalendarClock,
  AlertTriangle,
  Ban,
  PauseCircle,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { OwnerShell } from "@/components/consulting/OwnerShell";
import { StatCard } from "@/components/consulting/StatCard";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useSEO } from "@/hooks/use-seo";
import {
  fetchOwnerDashboardStats,
  fetchPaymentRequests,
  fetchAuditLogs,
  type OwnerDashboardStats,
  type PaymentRequest,
} from "@/lib/owner-admin";
import { useAuth } from "@/contexts/AuthContext";

const springIn = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
};

function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

const PAYMENT_STATUS_STYLE: Record<string, string> = {
  pending_verification: "bg-amber-500/15 text-amber-300",
  confirmed: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-destructive/15 text-destructive",
  more_info_required: "bg-sky-500/15 text-sky-300",
  refunded: "bg-purple-500/15 text-purple-300",
  cancelled: "bg-white/[0.06] text-muted-foreground",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending_verification: "Pending",
  confirmed: "Confirmed",
  rejected: "Rejected",
  more_info_required: "More Info",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

/**
 * OwnerDashboard — private admin overview with real platform-wide
 * analytics. Never shows fake values — zeros and empty states when
 * there is no data.
 */
export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  useSEO({ title: "Owner Dashboard | OXEN", description: "Platform owner overview." });

  const statsQ = useQuery({
    queryKey: ["owner-dashboard-stats"],
    queryFn: () => fetchOwnerDashboardStats(),
    staleTime: 30_000,
  });

  const pendingPaymentsQ = useQuery({
    queryKey: ["owner-pending-payments-dashboard"],
    queryFn: () => fetchPaymentRequests("pending_verification"),
    staleTime: 30_000,
  });

  const auditQ = useQuery({
    queryKey: ["owner-audit-recent"],
    queryFn: () => fetchAuditLogs(8),
    staleTime: 30_000,
  });

  const stats: OwnerDashboardStats | undefined = statsQ.data;
  const pendingPayments: PaymentRequest[] = pendingPaymentsQ.data ?? [];
  const auditLogs = auditQ.data ?? [];
  const hasNoData = stats && stats.totalAccounts === 0 && stats.totalActivePremium === 0;

  return (
    <OwnerShell
      title="Owner Dashboard"
      subtitle="Platform-wide analytics and management"
      actions={
        <button
          onClick={() => navigate("/owner-admin/accounts")}
          className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25"
        >
          <Building2 className="h-3.5 w-3.5" /> Manage Accounts
        </button>
      }
    >
      {/* Top summary cards */}
      <section>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Platform Overview
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Accounts" value={stats?.totalAccounts ?? 0} icon={Users} accent="gold" delay={0} />
          <StatCard label="New Today" value={stats?.newUsersToday ?? 0} icon={UserPlus} accent="green" delay={0.05} />
          <StatCard label="New This Week" value={stats?.newUsersThisWeek ?? 0} icon={CalendarDays} accent="blue" delay={0.1} />
          <StatCard label="New This Month" value={stats?.newUsersThisMonth ?? 0} icon={CalendarRange} accent="default" delay={0.15} />
          <StatCard label="Ordinary Users" value={stats?.totalOrdinaryUsers ?? 0} icon={UserCircle} accent="default" delay={0.2} />
          <StatCard label="Consulting Applicants" value={stats?.totalConsultingApplicants ?? 0} icon={FileStack} accent="blue" delay={0.25} />
          <StatCard label="Consulting Accounts" value={stats?.totalConsultingAccounts ?? 0} icon={Building2} accent="gold" delay={0.3} />
          <StatCard label="Active Premium" value={stats?.totalActivePremium ?? 0} icon={CheckCircle2} accent="green" delay={0.35} />
          <StatCard label="Expired Subscriptions" value={stats?.totalExpiredSubscriptions ?? 0} icon={XCircle} accent="red" delay={0.4} />
          <StatCard label="Pending Approvals" value={stats?.pendingConsultingApprovals ?? 0} icon={Clock} accent="gold" delay={0.45} />
          <StatCard label="Total Revenue" value={money(stats?.totalSubscriptionRevenue ?? 0)} icon={DollarSign} accent="green" delay={0.5} />
          <StatCard label="Revenue (Month)" value={money(stats?.revenueThisMonth ?? 0)} icon={TrendingUp} accent="green" delay={0.55} />
          <StatCard label="Revenue (Year)" value={money(stats?.revenueThisYear ?? 0)} icon={TrendingUp} accent="green" delay={0.6} />
        </div>
      </section>

      {/* Subscription summary */}
      <section className="mt-8">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Subscription Summary
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Active Monthly" value={stats?.activeMonthly ?? 0} icon={CalendarClock} accent="default" delay={0} />
          <StatCard label="Active Quarterly" value={stats?.activeQuarterly ?? 0} icon={CalendarClock} accent="default" delay={0.05} />
          <StatCard label="Active Annual" value={stats?.activeAnnual ?? 0} icon={CalendarClock} accent="default" delay={0.1} />
          <StatCard label="Expiring ≤ 7 Days" value={stats?.expiringWithin7Days ?? 0} icon={AlertTriangle} accent="red" delay={0.15} />
          <StatCard label="Expiring ≤ 30 Days" value={stats?.expiringWithin30Days ?? 0} icon={AlertTriangle} accent="gold" delay={0.2} />
          <StatCard label="Cancelled" value={stats?.cancelledSubscriptions ?? 0} icon={Ban} accent="red" delay={0.25} />
          <StatCard label="Suspended" value={stats?.suspendedAccounts ?? 0} icon={PauseCircle} accent="red" delay={0.3} />
        </div>
      </section>

      {/* Pending payment requests */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Pending Payment Requests
          </h3>
          {pendingPayments.length > 0 && (
            <button
              onClick={() => navigate("/owner-admin/payments")}
              className="flex items-center gap-1 text-xs font-semibold text-amber-300 transition hover:text-amber-200"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {pendingPayments.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No pending requests"
            description="All consulting payment requests have been reviewed."
          />
        ) : (
          <div className="space-y-2">
            {pendingPayments.slice(0, 5).map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springIn, delay: i * 0.05 }}
                className="glass rounded-2xl p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06]">
                      {req.user_avatar_url ? (
                        <img src={req.user_avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {req.company_name ?? req.user_name ?? "Unknown"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{req.user_email}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="font-display text-sm font-bold text-foreground">
                        {money(req.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{req.duration_months}mo</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        PAYMENT_STATUS_STYLE[req.verification_status] ?? PAYMENT_STATUS_STYLE.pending_verification
                      }`}
                    >
                      {PAYMENT_STATUS_LABEL[req.verification_status] ?? "Pending"}
                    </span>
                    <button
                      onClick={() => navigate("/owner-admin/payments")}
                      className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25"
                    >
                      Review
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Recent owner activity */}
      <section className="mt-8">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Recent Owner Activity
        </h3>
        {auditLogs.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No activity yet"
            description="Owner actions will appear here as they are performed."
          />
        ) : (
          <div className="glass divide-y divide-white/[0.04] rounded-2xl">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{log.action}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {log.owner_email ?? "Owner"} · {formatDate(log.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Empty state for entire platform */}
      {hasNoData && (
        <section className="mt-8">
          <EmptyState
            icon={Users}
            title="No platform data yet"
            description="When users register and subscribe to Premium Consulting, real analytics will appear here. No demo or fake values are shown."
          />
        </section>
      )}

      {/* Owner identity footer (private — never shown publicly) */}
      <p className="mt-10 text-center text-[10px] text-muted-foreground">
        Signed in as owner: {user?.email}
      </p>
    </OwnerShell>
  );
}
