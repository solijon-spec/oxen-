import { useQuery } from "@tanstack/react-query";
import { CreditCard, CalendarClock, CheckCircle2, XCircle, Loader2, History } from "lucide-react";

import { DashboardShell } from "@/components/consulting/DashboardShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import { fetchSubscriptionHistory } from "@/lib/crm-extras";
import { CONSULTING_PLANS, getPlan, type SubscriptionPlan } from "@/lib/consulting";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export default function Subscription() {
  useSEO({ title: "Subscription | OXEN CRM", description: "Manage your agency subscription plan." });
  const { company, subscriptionPlan, subscriptionEndDate, subscriptionAccess } = useConsulting();
  const companyId = company?.id ?? "";

  const { data: history, isLoading } = useQuery({
    queryKey: ["consulting-subscription-history", companyId],
    queryFn: () => fetchSubscriptionHistory(companyId),
    enabled: !!companyId,
    staleTime: 60_000,
    retry: false,
  });

  const plan = subscriptionPlan ? getPlan(subscriptionPlan) : null;
  const isActive = subscriptionAccess === "active";
  const isExpired = subscriptionAccess === "expired";

  return (
    <DashboardShell title="Subscription" subtitle="Your agency subscription plan and history">
      <div className="space-y-6">
        {/* Current plan card */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Plan</p>
              <h3 className="mt-1 font-display text-2xl font-extrabold text-foreground">
                {plan?.name ?? "No Plan"}
              </h3>
              {plan && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  ${plan.price} {plan.currency} / {plan.months} month{plan.months !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
                isActive
                  ? "bg-emerald-500/15 text-emerald-400"
                  : isExpired
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-white/[0.06] text-muted-foreground",
              )}
            >
              {isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {isActive ? "Active" : isExpired ? "Expired" : "None"}
            </span>
          </div>

          {/* Dates */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <CalendarClock className="h-3 w-3" /> Start Date
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {formatDate(company?.subscription_start_date ?? null)}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <CalendarClock className="h-3 w-3" /> Expiration Date
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {formatDate(subscriptionEndDate)}
              </p>
            </div>
          </div>

          {/* Payment notice */}
          <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-3">
            <p className="text-xs text-amber-400/90">
              Online subscription payments are not available yet. To renew or change your plan, please contact OXEN Support.
            </p>
          </div>
        </div>

        {/* Available plans */}
        <div>
          <h3 className="mb-3 font-display text-base font-bold text-foreground">Available Plans</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {CONSULTING_PLANS.map((p) => {
              const isCurrent = p.id === subscriptionPlan;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "glass relative rounded-2xl p-4 transition",
                    isCurrent && "ring-1 ring-primary",
                  )}
                >
                  {p.badge && (
                    <span className="absolute -top-2 left-4 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                      {p.badge}
                    </span>
                  )}
                  <p className="font-display text-sm font-bold text-foreground">{p.name}</p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-foreground">
                    ${p.price}
                    <span className="text-xs font-normal text-muted-foreground">/{p.months}mo</span>
                  </p>
                  {p.savingsLabel && (
                    <p className="mt-0.5 text-[11px] font-semibold text-emerald-400">{p.savingsLabel}</p>
                  )}
                  <ul className="mt-3 space-y-1.5">
                    {p.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent && (
                    <div className="mt-3 rounded-lg bg-primary/10 py-1.5 text-center text-[11px] font-bold text-primary">
                      Current Plan
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription history */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-foreground">
            <History className="h-4 w-4" /> Subscription History
          </h3>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : !history || history.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No subscription history"
              description="Your subscription records will appear here."
            />
          ) : (
            <div className="glass overflow-hidden rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Plan</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Start Date</th>
                      <th className="px-4 py-3 font-semibold">End Date</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row.id} className="border-b border-white/[0.04] last:border-0">
                        <td className="px-4 py-3 font-semibold capitalize text-foreground">{row.plan}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                              row.status === "active"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-white/[0.06] text-muted-foreground",
                            )}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(row.start_date)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(row.end_date)}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {row.amount} {row.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
