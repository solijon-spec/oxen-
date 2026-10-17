import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  DollarSign,
  CalendarDays,
  CalendarRange,
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Percent,
  PieChart,
} from "lucide-react";

import { OwnerShell } from "@/components/consulting/OwnerShell";
import { StatCard } from "@/components/consulting/StatCard";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useSEO } from "@/hooks/use-seo";
import {
  fetchRevenueAnalytics,
  type RevenueAnalytics,
} from "@/lib/owner-admin";
import { CONSULTING_PLANS } from "@/lib/consulting";

const springIn = { type: "spring" as const, stiffness: 260, damping: 26 };

function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const PLAN_LABELS: Record<string, string> = {
  monthly: "1 Month",
  quarterly: "3 Months",
  annual: "1 Year",
};

/**
 * OwnerRevenue — financial analytics for OXEN platform subscription
 * revenue. Consulting company business revenue (POS, Cashier, package
 * sales) is kept fully separate and never counted here.
 */
export default function OwnerRevenue() {
  useSEO({ title: "Revenue | OXEN Owner", description: "Platform subscription revenue analytics." });

  const revQ = useQuery({
    queryKey: ["owner-revenue-analytics"],
    queryFn: () => fetchRevenueAnalytics(),
    staleTime: 30_000,
  });

  const data: RevenueAnalytics | undefined = revQ.data;
  const maxMonthly = Math.max(1, ...(data?.monthlyRevenue ?? []).map((m) => m.amount));
  const maxPlanSales = Math.max(1, ...(data?.planSales ?? []).map((p) => p.count));
  const maxGrowth = Math.max(
    1,
    ...(data?.userGrowth ?? []).map((g) => Math.max(g.ordinary, g.consulting)),
  );

  return (
    <OwnerShell title="Revenue" subtitle="OXEN platform subscription revenue analytics">
      {revQ.isLoading ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Loading revenue analytics…
        </div>
      ) : (
        <>
          {/* Revenue summary cards */}
          <section>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Revenue Summary
            </h3>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <StatCard label="Total Revenue" value={money(data?.totalRevenue ?? 0)} icon={DollarSign} accent="green" delay={0} />
              <StatCard label="Today" value={money(data?.revenueToday ?? 0)} icon={CalendarDays} accent="green" delay={0.05} />
              <StatCard label="This Week" value={money(data?.revenueThisWeek ?? 0)} icon={CalendarRange} accent="green" delay={0.1} />
              <StatCard label="This Month" value={money(data?.revenueThisMonth ?? 0)} icon={Calendar} accent="green" delay={0.15} />
              <StatCard label="This Year" value={money(data?.revenueThisYear ?? 0)} icon={Calendar} accent="green" delay={0.2} />
              <StatCard label="Pending Total" value={money(data?.pendingPaymentTotal ?? 0)} icon={Clock} accent="gold" delay={0.25} />
            </div>
          </section>

          {/* Breakdown cards */}
          <section className="mt-8">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Payment Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="New Sub Revenue" value={money(data?.newSubscriptionRevenue ?? 0)} icon={TrendingUp} accent="green" delay={0} />
              <StatCard label="Renewal Revenue" value={money(data?.renewalRevenue ?? 0)} icon={RefreshCw} accent="blue" delay={0.05} />
              <StatCard label="Refund Total" value={money(data?.refundTotal ?? 0)} icon={TrendingDown} accent="red" delay={0.1} />
              <StatCard label="Confirmed Payments" value={data?.confirmedPaymentsCount ?? 0} icon={CheckCircle2} accent="green" delay={0.15} />
              <StatCard label="Rejected Payments" value={data?.rejectedPaymentsCount ?? 0} icon={XCircle} accent="red" delay={0.2} />
              <StatCard label="Conversion Rate" value={`${(data?.premiumConversionRate ?? 0).toFixed(1)}%`} icon={Percent} accent="gold" delay={0.25} />
              <StatCard label="Active Subs" value={data?.subscriptionStatusCounts.active ?? 0} icon={CheckCircle2} accent="green" delay={0.3} />
              <StatCard label="Expired Subs" value={data?.subscriptionStatusCounts.expired ?? 0} icon={XCircle} accent="red" delay={0.35} />
            </div>
          </section>

          {/* Monthly revenue chart */}
          <section className="mt-8">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Monthly Subscription Revenue
            </h3>
            {data && data.monthlyRevenue.length > 0 && data.totalRevenue === 0 ? (
              <EmptyState icon={TrendingUp} title="No revenue yet" description="When consulting subscriptions are paid, monthly revenue will appear here." />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springIn}
                className="glass rounded-2xl p-5"
              >
                <div className="flex h-48 items-end justify-between gap-2">
                  {data?.monthlyRevenue.map((m, i) => (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="flex w-full items-end justify-center" style={{ height: "140px" }}>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(2, (m.amount / maxMonthly) * 140)}px` }}
                          transition={{ type: "spring", stiffness: 200, damping: 24, delay: i * 0.04 }}
                          className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-amber-500/40 to-amber-400/80"
                          title={money(m.amount)}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{m.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </section>

          {/* Plan sales chart */}
          <section className="mt-8">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Plan Sales — 1 Month vs 3 Months vs 1 Year
            </h3>
            <div className="grid gap-3 lg:grid-cols-3">
              {data?.planSales.map((p, i) => {
                const planInfo = CONSULTING_PLANS.find((pl) => pl.id === p.plan);
                return (
                  <motion.div
                    key={p.plan}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springIn, delay: i * 0.08 }}
                    className="glass rounded-2xl p-5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {PLAN_LABELS[p.plan]}
                        </p>
                        <p className="mt-1 font-display text-3xl font-extrabold text-foreground">{p.count}</p>
                        <p className="text-xs text-muted-foreground">{money(p.revenue)}</p>
                      </div>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                        <PieChart className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.04]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(p.count / maxPlanSales) * 100}%` }}
                        transition={{ type: "spring", stiffness: 200, damping: 24, delay: i * 0.1 }}
                        className="h-full rounded-full bg-gradient-to-r from-amber-500/60 to-amber-400"
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {planInfo ? `${money(planInfo.price)} each` : ""}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* User growth chart */}
          <section className="mt-8">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              New Ordinary vs Consulting Users
            </h3>
            {data && data.userGrowth.every((g) => g.ordinary === 0 && g.consulting === 0) ? (
              <EmptyState icon={TrendingUp} title="No user data yet" description="User growth will appear here as accounts register." />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springIn}
                className="glass rounded-2xl p-5"
              >
                <div className="mb-3 flex items-center gap-4 text-[10px]">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-sky-400" /> Ordinary
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-amber-400" /> Consulting
                  </span>
                </div>
                <div className="flex h-40 items-end justify-between gap-2">
                  {data?.userGrowth.map((g, i) => (
                    <div key={g.month} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex w-full items-end justify-center gap-0.5" style={{ height: "120px" }}>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(0, (g.ordinary / maxGrowth) * 120)}px` }}
                          transition={{ type: "spring", stiffness: 200, damping: 24, delay: i * 0.04 }}
                          className="w-2.5 rounded-t bg-sky-400/70"
                          title={`Ordinary: ${g.ordinary}`}
                        />
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(0, (g.consulting / maxGrowth) * 120)}px` }}
                          transition={{ type: "spring", stiffness: 200, damping: 24, delay: i * 0.04 + 0.02 }}
                          className="w-2.5 rounded-t bg-amber-400/70"
                          title={`Consulting: ${g.consulting}`}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{g.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </section>

          {/* Active vs Expired subscriptions */}
          <section className="mt-8">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Active vs Expired Subscriptions
            </h3>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Active" value={data?.subscriptionStatusCounts.active ?? 0} icon={CheckCircle2} accent="green" delay={0} />
              <StatCard label="Expired" value={data?.subscriptionStatusCounts.expired ?? 0} icon={XCircle} accent="red" delay={0.05} />
              <StatCard label="Suspended" value={data?.subscriptionStatusCounts.suspended ?? 0} icon={Clock} accent="gold" delay={0.1} />
              <StatCard label="Cancelled" value={data?.subscriptionStatusCounts.cancelled ?? 0} icon={XCircle} accent="red" delay={0.15} />
            </div>
          </section>

          {/* Revenue by payment method */}
          {data && data.revenueByPaymentMethod.length > 0 && (
            <section className="mt-8">
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Revenue by Payment Method
              </h3>
              <div className="glass divide-y divide-white/[0.04] rounded-2xl">
                {data.revenueByPaymentMethod.map((m, i) => (
                  <motion.div
                    key={m.method}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ ...springIn, delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3.5"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground">
                      <CreditCard className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{m.method}</p>
                      <p className="text-[11px] text-muted-foreground">{m.count} payments</p>
                    </div>
                    <p className="font-display text-sm font-bold text-emerald-300">{money(m.amount)}</p>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Separation note */}
          <p className="mt-10 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4 text-center text-[11px] text-muted-foreground">
            OXEN platform subscription revenue is shown here. Consulting company business
            revenue (POS, Cashier, package sales) is kept fully separate and not counted as
            OXEN platform revenue.
          </p>
        </>
      )}
    </OwnerShell>
  );
}
