import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  ChevronLeft,
  UserCircle,
  Mail,
  Phone,
  Globe2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PauseCircle,
  PlayCircle,
  Ban,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  FileStack,
  Receipt,
  ScrollText,
  X,
  Plus,
  Clock,
  Shield,
  Copy,
  ExternalLink,
  KeyRound,
  Check,
} from "lucide-react";

import { OwnerShell } from "@/components/consulting/OwnerShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { StatCard } from "@/components/consulting/StatCard";
import { useSEO } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchPremiumAccountDetails,
  fetchCompanyBusinessStats,
  fetchSubscriptionHistory,
  extendSubscription,
  changeSubscriptionPlan,
  suspendCompany,
  reactivateCompany,
  cancelSubscription,
  setCustomExpiration,
  type PremiumAccount,
  type CompanyBusinessStats,
  type SubscriptionHistoryEntry,
  type SubscriptionDisplayStatus,
  deriveDisplayStatus,
  daysRemaining,
  subscriptionProgress,
  type ExtensionDuration,
} from "@/lib/owner-admin";
import { CONSULTING_PLANS, getPlan, type SubscriptionPlan } from "@/lib/consulting";
import { useOwnerAgency } from "@/contexts/OwnerAgencyContext";
import { cn } from "@/lib/utils";

const springIn = { type: "spring" as const, stiffness: 260, damping: 26 };

const DISPLAY_STATUS_STYLE: Record<SubscriptionDisplayStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  active: "bg-emerald-500/15 text-emerald-300",
  expiring_soon: "bg-orange-500/15 text-orange-300",
  expired: "bg-destructive/15 text-destructive",
  suspended: "bg-sky-500/15 text-sky-300",
  cancelled: "bg-white/[0.06] text-muted-foreground",
};

const DISPLAY_STATUS_LABEL: Record<SubscriptionDisplayStatus, string> = {
  pending: "Pending",
  active: "Active",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  suspended: "Suspended",
  cancelled: "Cancelled",
};

const ACTION_TYPE_LABEL: Record<string, string> = {
  activation: "Activation",
  extension: "Extension",
  upgrade: "Upgrade",
  suspension: "Suspension",
  reactivation: "Reactivation",
  cancellation: "Cancellation",
  plan_change: "Plan Change",
  custom: "Custom",
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

export default function OwnerAccountDetails() {
  const { companyId = "" } = useParams<{ companyId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { enterAgencyCRM } = useOwnerAgency();
  const [copiedCode, setCopiedCode] = useState(false);
  useSEO({ title: "Consulting Details | OXEN Owner", description: "Consulting account details." });

  const [showExtend, setShowExtend] = useState(false);
  const [showPlanChange, setShowPlanChange] = useState(false);

  const companyQ = useQuery({
    queryKey: ["owner-account-detail", companyId],
    queryFn: () => fetchPremiumAccountDetails(companyId),
    enabled: !!companyId,
    staleTime: 15_000,
  });

  const statsQ = useQuery({
    queryKey: ["owner-account-stats", companyId],
    queryFn: () => fetchCompanyBusinessStats(companyId),
    enabled: !!companyId,
    staleTime: 15_000,
  });

  const historyQ = useQuery({
    queryKey: ["owner-subscription-history", companyId],
    queryFn: () => fetchSubscriptionHistory(companyId),
    enabled: !!companyId,
    staleTime: 15_000,
  });

  const company = companyQ.data;
  const stats: CompanyBusinessStats | undefined = statsQ.data;
  const history: SubscriptionHistoryEntry[] = historyQ.data ?? [];

  const handleSuspend = useCallback(async () => {
    if (!company || !user) return;
    const ok = await suspendCompany(company.id, user.id, user.email);
    if (ok) {
      toast({ title: "Account suspended", description: company.name });
      queryClient.invalidateQueries({ queryKey: ["owner-account-detail", companyId] });
      queryClient.invalidateQueries({ queryKey: ["owner-premium-accounts"] });
    }
  }, [company, user, toast, queryClient, companyId]);

  const handleReactivate = useCallback(async () => {
    if (!company || !user) return;
    const ok = await reactivateCompany(company.id, user.id, user.email);
    if (ok) {
      toast({ title: "Account reactivated", description: company.name });
      queryClient.invalidateQueries({ queryKey: ["owner-account-detail", companyId] });
      queryClient.invalidateQueries({ queryKey: ["owner-premium-accounts"] });
    }
  }, [company, user, toast, queryClient, companyId]);

  const handleCancel = useCallback(async () => {
    if (!company || !user) return;
    if (!window.confirm(`Cancel subscription for ${company.name}? This will take effect immediately.`)) return;
    const ok = await cancelSubscription(company.id, user.id, user.email);
    if (ok) {
      toast({ title: "Subscription cancelled", description: company.name });
      queryClient.invalidateQueries({ queryKey: ["owner-account-detail", companyId] });
      queryClient.invalidateQueries({ queryKey: ["owner-premium-accounts"] });
    }
  }, [company, user, toast, queryClient, companyId]);

  const handleCopyCode = useCallback(async () => {
    if (!company?.agency_code) return;
    try {
      await navigator.clipboard.writeText(company.agency_code);
      setCopiedCode(true);
      toast({ title: "Agency Code copied", description: company.agency_code });
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  }, [company, toast]);

  const handleOpenCRM = useCallback(() => {
    if (!company) return;
    enterAgencyCRM(company.id);
    navigate("/consulting/dashboard");
  }, [company, enterAgencyCRM, navigate]);

  if (companyQ.isLoading) {
    return (
      <OwnerShell title="Consulting Details" subtitle="Loading…">
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Loading account details…
        </div>
      </OwnerShell>
    );
  }

  if (!company) {
    return (
      <OwnerShell title="Consulting Details">
        <EmptyState
          icon={Building2}
          title="Account not found"
          description="This consulting account does not exist or you do not have access."
        />
      </OwnerShell>
    );
  }

  const status = deriveDisplayStatus(company);
  const days = daysRemaining(company.subscription_end_date);
  const progress = subscriptionProgress(company.subscription_start_date, company.subscription_end_date);
  const plan = company.subscription_plan ? getPlan(company.subscription_plan) : null;

  return (
    <OwnerShell
      title={company.name}
      subtitle="Consulting account details (view-only mode)"
      actions={
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-bold text-foreground transition hover:bg-white/[0.08]"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
      }
    >
      {/* Status banner */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-amber-500/10">
            {company.logo_url ? (
              <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-7 w-7 text-amber-300" />
            )}
          </div>
          <div>
            <p className="font-display text-lg font-bold text-foreground">{company.name}</p>
            <p className="text-xs text-muted-foreground">
              {company.country ?? "—"}, {company.city ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCRM}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open Agency CRM
          </button>
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider",
              DISPLAY_STATUS_STYLE[status],
            )}
          >
            {DISPLAY_STATUS_LABEL[status]}
          </span>
        </div>
      </div>

      {/* Agency Code section */}
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Agency Code</p>
            <p className="font-mono text-lg font-bold text-foreground">{company.agency_code ?? "—"}</p>
          </div>
        </div>
        {company.agency_code && (
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-bold text-foreground transition hover:bg-white/[0.12]"
          >
            {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedCode ? "Copied" : "Copy Code"}
          </button>
        )}
      </div>

      {/* Company information */}
      <section className="mb-6">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Company Information
        </h3>
        <div className="glass rounded-2xl p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoRow icon={Building2} label="Company Name" value={company.name} />
            <InfoRow icon={UserCircle} label="Owner Name" value={company.owner_name ?? "—"} />
            <InfoRow icon={Mail} label="Owner Email" value={company.owner_email ?? "—"} />
            <InfoRow icon={Phone} label="Company Phone" value={company.contact_phone ?? "—"} />
            <InfoRow icon={Mail} label="Contact Email" value={company.contact_email ?? "—"} />
            <InfoRow icon={Globe2} label="Country / City" value={`${company.country ?? "—"} / ${company.city ?? "—"}`} />
            <InfoRow icon={Calendar} label="Registration Date" value={formatDate(company.created_at)} />
            <InfoRow icon={Shield} label="Verification" value={company.verification_status ?? "—"} />
          </div>
        </div>
      </section>

      {/* Subscription information */}
      <section className="mb-6">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Subscription Information
        </h3>
        <div className="glass rounded-2xl p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow icon={CalendarClock} label="Current Plan" value={plan?.name ?? "—"} />
            <InfoRow icon={Calendar} label="Start Date" value={formatDate(company.subscription_start_date)} />
            <InfoRow icon={Calendar} label="Expiration" value={formatDate(company.subscription_end_date)} />
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Days Remaining</p>
                <p className={cn("text-sm font-bold", days < 0 ? "text-destructive" : days <= 7 ? "text-orange-400" : "text-foreground")}>
                  {days < 0 ? `${Math.abs(days)} days expired` : `${days} days`}
                </p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Subscription Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 26 }}
                className={cn(
                  "h-full rounded-full",
                  days < 0 ? "bg-destructive" : days <= 7 ? "bg-orange-400" : "bg-emerald-400",
                )}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Business information */}
      <section className="mb-6">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Business Information
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Packages" value={stats?.packageCount ?? 0} icon={Package} accent="gold" />
          <StatCard label="Clients" value={stats?.clientCount ?? 0} icon={Users} accent="blue" />
          <StatCard label="Applications" value={stats?.applicationCount ?? 0} icon={FileStack} accent="default" />
          <StatCard label="Total Sales" value={money(stats?.totalSales ?? 0)} icon={TrendingUp} accent="green" />
          <StatCard label="Outstanding" value={money(stats?.outstandingPayments ?? 0)} icon={AlertTriangle} accent="red" />
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          POS revenue, cashier income/expenses are stored locally by the consulting company and not visible to owners.
        </p>
      </section>

      {/* Owner controls */}
      <section className="mb-6">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Owner Controls
        </h3>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <button
            onClick={() => setShowExtend(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/15 py-3 text-sm font-bold text-amber-300 transition hover:bg-amber-500/25"
          >
            <Plus className="h-4 w-4" /> Extend Subscription
          </button>
          <button
            onClick={() => setShowPlanChange(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500/15 py-3 text-sm font-bold text-sky-300 transition hover:bg-sky-500/25"
          >
            <CalendarClock className="h-4 w-4" /> Change Plan
          </button>
          {status === "suspended" ? (
            <button
              onClick={handleReactivate}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 py-3 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/25"
            >
              <PlayCircle className="h-4 w-4" /> Reactivate
            </button>
          ) : (
            <button
              onClick={handleSuspend}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500/15 py-3 text-sm font-bold text-sky-300 transition hover:bg-sky-500/25"
            >
              <PauseCircle className="h-4 w-4" /> Suspend
            </button>
          )}
          <button
            onClick={handleCancel}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-destructive/15 py-3 text-sm font-bold text-destructive transition hover:bg-destructive/25"
          >
            <Ban className="h-4 w-4" /> Cancel Subscription
          </button>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          View-only mode — owner controls are explicit actions. Business data is not modified unless an action is taken.
        </p>
      </section>

      {/* Subscription history */}
      <section className="mb-6">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Subscription History
        </h3>
        {history.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No history yet"
            description="Subscription changes will appear here."
          />
        ) : (
          <div className="glass divide-y divide-white/[0.04] rounded-2xl">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
                  <ScrollText className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {ACTION_TYPE_LABEL[h.action_type] ?? h.action_type}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {getPlan(h.plan).name} · {formatDate(h.start_date)} → {formatDate(h.end_date)}
                  </p>
                  {h.note && <p className="truncate text-[10px] text-muted-foreground">{h.note}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] text-muted-foreground">{formatDate(h.created_at)}</p>
                  <p className="text-[10px] text-muted-foreground">{h.performed_by_email ?? "Owner"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      {showExtend && (
        <ExtendModal
          company={company}
          onClose={() => setShowExtend(false)}
          onDone={() => {
            setShowExtend(false);
            queryClient.invalidateQueries({ queryKey: ["owner-account-detail", companyId] });
            queryClient.invalidateQueries({ queryKey: ["owner-subscription-history", companyId] });
            queryClient.invalidateQueries({ queryKey: ["owner-premium-accounts"] });
          }}
        />
      )}
      {showPlanChange && (
        <PlanChangeModal
          company={company}
          onClose={() => setShowPlanChange(false)}
          onDone={() => {
            setShowPlanChange(false);
            queryClient.invalidateQueries({ queryKey: ["owner-account-detail", companyId] });
            queryClient.invalidateQueries({ queryKey: ["owner-subscription-history", companyId] });
            queryClient.invalidateQueries({ queryKey: ["owner-premium-accounts"] });
          }}
        />
      )}
    </OwnerShell>
  );
}

/* ── Extend Modal ────────────────────────────────────────── */

function ExtendModal({
  company,
  onClose,
  onDone,
}: {
  company: PremiumAccount;
  onClose: () => void;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [duration, setDuration] = useState<ExtensionDuration>("1month");
  const [customDate, setCustomDate] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const status = deriveDisplayStatus(company);
  const isExpired = status === "expired" || status === "cancelled";

  const handleExtend = useCallback(async () => {
    if (!user) return;
    setSubmitting(true);
    const result = await extendSubscription(
      company.id,
      duration,
      user.id,
      user.email,
      isExpired ? customDate || undefined : undefined,
      note.trim() || undefined,
    );
    setSubmitting(false);
    if (result.error) {
      toast({ title: "Extension failed", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Subscription extended", description: `New end: ${formatDate(result.new_end_date)}` });
      onDone();
    }
  }, [user, company, duration, isExpired, customDate, note, toast, onDone]);

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed inset-y-0 right-0 z-[91] flex w-full max-w-md flex-col bg-sidebar/95 backdrop-blur-xl shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h3 className="font-display text-base font-bold text-foreground">Extend Subscription</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <p className="mb-4 text-xs text-muted-foreground">
            {isExpired
              ? "This subscription is expired. The extension will start from today (or a custom start date)."
              : "This subscription is active. The extension will be added after the current expiration date."}
          </p>

          <p className="mb-2 text-xs font-semibold text-muted-foreground">Extension Duration</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "1month" as const, label: "1 Month" },
              { value: "3months" as const, label: "3 Months" },
              { value: "1year" as const, label: "1 Year" },
              { value: "custom" as const, label: "Custom Date" },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDuration(opt.value)}
                className={cn(
                  "rounded-xl border p-3 text-center text-sm font-bold transition",
                  duration === opt.value
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                    : "border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {duration === "custom" && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Custom Expiration Date</p>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground focus:border-amber-500/40 focus:outline-none"
              />
            </div>
          )}

          {isExpired && duration !== "custom" && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">New Start Date (optional — defaults to today)</p>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground focus:border-amber-500/40 focus:outline-none"
              />
            </div>
          )}

          <div className="mt-4">
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Note (optional)</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Reason for extension…"
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-500/40 focus:outline-none"
            />
          </div>

          <button
            onClick={handleExtend}
            disabled={submitting || (duration === "custom" && !customDate)}
            className="mt-5 w-full rounded-xl bg-amber-500/20 py-3.5 text-sm font-bold text-amber-300 transition hover:bg-amber-500/30 disabled:opacity-40"
          >
            {submitting ? "Extending…" : "Apply Extension"}
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ── Plan Change Modal ───────────────────────────────────── */

function PlanChangeModal({
  company,
  onClose,
  onDone,
}: {
  company: PremiumAccount;
  onClose: () => void;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newPlan, setNewPlan] = useState<SubscriptionPlan>(company.subscription_plan ?? "monthly");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback(async () => {
    if (!user) return;
    setSubmitting(true);
    const result = await changeSubscriptionPlan(company.id, newPlan, user.id, user.email, note.trim() || undefined);
    setSubmitting(false);
    if (result.error) {
      toast({ title: "Plan change failed", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Plan changed", description: `Now on ${getPlan(newPlan).name}` });
      onDone();
    }
  }, [user, company, newPlan, note, toast, onDone]);

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed inset-y-0 right-0 z-[91] flex w-full max-w-md flex-col bg-sidebar/95 backdrop-blur-xl shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h3 className="font-display text-base font-bold text-foreground">Change Subscription Plan</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <p className="mb-4 text-xs text-muted-foreground">
            Changing the plan will reset the subscription start date to today and compute a new expiration date. Previous subscription records are preserved in the history.
          </p>

          <div className="space-y-2">
            {CONSULTING_PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => setNewPlan(p.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border p-3 transition",
                  newPlan === p.id
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                    : "border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]",
                )}
              >
                <div className="text-left">
                  <p className="text-sm font-bold">{p.name}</p>
                  <p className="text-[10px]">{p.months} month{p.months > 1 ? "s" : ""}</p>
                </div>
                <p className="font-display text-base font-bold">{money(p.price)}</p>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Note (optional)</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Reason for plan change…"
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-500/40 focus:outline-none"
            />
          </div>

          <button
            onClick={handleChange}
            disabled={submitting}
            className="mt-5 w-full rounded-xl bg-amber-500/20 py-3.5 text-sm font-bold text-amber-300 transition hover:bg-amber-500/30 disabled:opacity-40"
          >
            {submitting ? "Changing…" : `Change to ${getPlan(newPlan).name}`}
          </button>
        </div>
      </motion.div>
    </>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
