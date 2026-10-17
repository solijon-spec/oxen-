import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PauseCircle,
  Ban,
  Search,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { OwnerShell } from "@/components/consulting/OwnerShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useSEO } from "@/hooks/use-seo";
import {
  fetchAllSubscriptions,
  type OwnerSubscriptionRow,
  type SubscriptionDisplayStatus,
} from "@/lib/owner-admin";
import { cn } from "@/lib/utils";

const springIn = { type: "spring" as const, stiffness: 260, damping: 26 };

const STATUS_STYLE: Record<SubscriptionDisplayStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  active: "bg-emerald-500/15 text-emerald-300",
  expiring_soon: "bg-orange-500/15 text-orange-300",
  expired: "bg-destructive/15 text-destructive",
  suspended: "bg-sky-500/15 text-sky-300",
  cancelled: "bg-white/[0.06] text-muted-foreground",
};

const STATUS_ICON: Record<SubscriptionDisplayStatus, typeof CheckCircle2> = {
  pending: CalendarClock,
  active: CheckCircle2,
  expiring_soon: AlertTriangle,
  expired: XCircle,
  suspended: PauseCircle,
  cancelled: Ban,
};

const STATUS_LABEL: Record<SubscriptionDisplayStatus, string> = {
  pending: "Pending",
  active: "Active",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  suspended: "Suspended",
  cancelled: "Cancelled",
};

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
  { value: "suspended", label: "Suspended" },
  { value: "cancelled", label: "Cancelled" },
];

const PLAN_LABELS: Record<string, string> = {
  monthly: "1 Month",
  quarterly: "3 Months",
  annual: "1 Year",
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

/**
 * OwnerSubscriptions — all consulting subscriptions across all companies.
 * Owner can view subscription status, plan, dates, and navigate to
 * the account details page for management actions.
 */
export default function OwnerSubscriptions() {
  const navigate = useNavigate();
  useSEO({ title: "Subscriptions | OXEN Owner", description: "All consulting subscriptions." });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const subsQ = useQuery({
    queryKey: ["owner-subscriptions", statusFilter],
    queryFn: () => fetchAllSubscriptions(statusFilter),
    staleTime: 15_000,
  });

  const allSubs = subsQ.data ?? [];
  const filtered = search.trim()
    ? allSubs.filter((s) =>
        s.company_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.owner_email ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (s.owner_name ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : allSubs;

  return (
    <OwnerShell title="Subscriptions" subtitle="All Premium Consulting subscriptions">
      {/* Search + filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, owner name, or email…"
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-500/40 focus:outline-none"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              statusFilter === opt.value
                ? "bg-amber-500/20 text-amber-300"
                : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {subsQ.isLoading ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Loading subscriptions…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No subscriptions found"
          description={search ? "Try a different search term." : "No subscriptions match this filter."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((sub, i) => {
            const Icon = STATUS_ICON[sub.display_status];
            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springIn, delay: i * 0.03 }}
                className="glass rounded-2xl p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Company info */}
                  <div className="flex items-center gap-3">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", STATUS_STYLE[sub.display_status])}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-bold text-foreground">
                        {sub.company_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {sub.owner_name ?? "—"} · {sub.owner_email ?? "—"}
                      </p>
                    </div>
                  </div>

                  {/* Plan + dates */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-foreground">{PLAN_LABELS[sub.plan] ?? sub.plan}</p>
                      <p className="text-[11px] text-muted-foreground">{money(sub.amount)}</p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-[11px] text-muted-foreground">Start</p>
                      <p className="text-xs text-foreground">{formatDate(sub.start_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">End</p>
                      <p className="text-xs text-foreground">{formatDate(sub.end_date)}</p>
                    </div>
                    <div className="text-center">
                      <p className={cn(
                        "font-display text-lg font-bold",
                        sub.days_remaining < 0 ? "text-destructive" : sub.days_remaining <= 7 ? "text-orange-300" : "text-foreground",
                      )}>
                        {sub.days_remaining < 0 ? "Expired" : `${sub.days_remaining}d`}
                      </p>
                      <p className="text-[9px] text-muted-foreground">remaining</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider", STATUS_STYLE[sub.display_status])}>
                      {STATUS_LABEL[sub.display_status]}
                    </span>
                    <button
                      onClick={() => navigate(`/owner-admin/accounts/${sub.company_id}`)}
                      className="shrink-0 rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25"
                    >
                      <Eye className="mr-1 inline h-3 w-3" /> Manage
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
          <p className="text-center text-[11px] text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "subscription" : "subscriptions"}
          </p>
        </div>
      )}
    </OwnerShell>
  );
}
