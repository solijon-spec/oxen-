import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Building2,
  UserCircle,
  Plus,
  X,
  Search,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PauseCircle,
  Eye,
  Sparkles,
  Mail,
  Phone,
  Copy,
  ExternalLink,
  Package as PackageIcon,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { OwnerShell } from "@/components/consulting/OwnerShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useSEO } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useOwnerAgency } from "@/contexts/OwnerAgencyContext";
import { fetchAgencyPackageCount } from "@/lib/owner-agency";
import {
  fetchAllPremiumAccounts,
  findUserByEmail,
  manuallyActivatePremium,
  type PremiumAccount,
  type SubscriptionDisplayStatus,
  deriveDisplayStatus,
  daysRemaining,
  subscriptionProgress,
  type FoundUser,
} from "@/lib/owner-admin";
import { CONSULTING_PLANS, getPlan, type SubscriptionPlan } from "@/lib/consulting";
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

export default function OwnerAccounts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { enterAgencyCRM } = useOwnerAgency();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  useSEO({ title: "Premium Accounts | OXEN Owner", description: "Manage Premium Consulting accounts." });

  const [search, setSearch] = useState("");
  const [showActivate, setShowActivate] = useState(false);

  const accountsQ = useQuery({
    queryKey: ["owner-premium-accounts"],
    queryFn: () => fetchAllPremiumAccounts(),
    staleTime: 15_000,
  });

  const accounts = (accountsQ.data ?? []).filter((a) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.owner_email ?? "").toLowerCase().includes(q) ||
      (a.owner_name ?? "").toLowerCase().includes(q)
    );
  });

  const handleActivated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["owner-premium-accounts"] });
    queryClient.invalidateQueries({ queryKey: ["owner-dashboard-stats"] });
  }, [queryClient]);

  const handleCopyCode = useCallback(async (code: string, agencyId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(agencyId);
      toast({ title: "Agency Code copied", description: code });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  }, [toast]);

  const handleOpenCRM = useCallback((agencyId: string) => {
    enterAgencyCRM(agencyId);
    navigate("/consulting/dashboard");
  }, [enterAgencyCRM, navigate]);

  return (
    <OwnerShell
      title="Premium Consulting Accounts"
      subtitle="All approved and pending consulting accounts"
      actions={
        <button
          onClick={() => setShowActivate(true)}
          className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25"
        >
          <Plus className="h-3.5 w-3.5" /> Add Premium Account
        </button>
      }
    >
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company name, owner name, or email…"
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-500/40 focus:outline-none"
        />
      </div>

      {/* Results */}
      {accountsQ.isLoading ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Loading accounts…</div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No consulting accounts"
          description="No Premium Consulting accounts have been created yet. Use “Add Premium Account” to manually activate one."
        />
      ) : (
        <div className="space-y-3">
          {accounts.map((acct, i) => {
            const status = deriveDisplayStatus(acct);
            const days = daysRemaining(acct.subscription_end_date);
            const progress = subscriptionProgress(acct.subscription_start_date, acct.subscription_end_date);
            const plan = acct.subscription_plan ? getPlan(acct.subscription_plan) : null;
            return (
              <motion.div
                key={acct.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springIn, delay: i * 0.04 }}
                className="glass rounded-2xl p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Company + owner */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-500/10">
                      {acct.logo_url ? (
                        <img src={acct.logo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-6 w-6 text-amber-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-bold text-foreground">{acct.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {acct.owner_name ?? "—"} · {acct.owner_email ?? "—"}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {plan?.name ?? "No plan"} · {acct.contact_phone ?? "No phone"}
                      </p>
                      {acct.agency_code && (
                        <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] font-bold text-amber-300/80">
                          <Copy className="h-2.5 w-2.5" /> {acct.agency_code}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Subscription info + actions */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-foreground">
                        Expires: {formatDate(acct.subscription_end_date)}
                      </p>
                      <p className={cn("text-[10px] font-semibold", days < 0 ? "text-destructive" : days <= 7 ? "text-orange-400" : "text-muted-foreground")}>
                        {days < 0 ? `${Math.abs(days)} days expired` : `${days} days left`}
                      </p>
                      {/* Progress bar */}
                      <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            days < 0 ? "bg-destructive" : days <= 7 ? "bg-orange-400" : "bg-emerald-400",
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
                          DISPLAY_STATUS_STYLE[status],
                        )}
                      >
                        {DISPLAY_STATUS_LABEL[status]}
                      </span>
                      <button
                        onClick={() => navigate(`/owner-admin/accounts/${acct.id}`)}
                        className="shrink-0 rounded-lg bg-amber-500/15 px-2.5 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25"
                      >
                        <Eye className="inline h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleOpenCRM(acct.id)}
                        className="shrink-0 rounded-lg bg-primary/15 px-2.5 py-2 text-xs font-bold text-primary transition hover:bg-primary/25"
                        title="Open Agency CRM"
                      >
                        <ExternalLink className="inline h-3 w-3" />
                      </button>
                      {acct.agency_code && (
                        <button
                          onClick={() => handleCopyCode(acct.agency_code!, acct.id)}
                          className="shrink-0 rounded-lg bg-white/[0.06] px-2.5 py-2 text-xs font-bold text-foreground transition hover:bg-white/[0.12]"
                          title="Copy Agency Code"
                        >
                          {copiedId === acct.id ? <Check className="inline h-3 w-3 text-emerald-400" /> : <Copy className="inline h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          <p className="text-center text-[11px] text-muted-foreground">
            {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
          </p>
        </div>
      )}

      {/* Manual activation modal */}
      {showActivate && (
        <ManualActivationModal
          onClose={() => setShowActivate(false)}
          onActivated={() => {
            setShowActivate(false);
            handleActivated();
            toast({ title: "Premium Consulting activated", description: "The account has been fully activated." });
          }}
        />
      )}
    </OwnerShell>
  );
}

/* ── Manual Activation Modal ─────────────────────────────── */

function ManualActivationModal({
  onClose,
  onActivated,
}: {
  onClose: () => void;
  onActivated: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [plan, setPlan] = useState<SubscriptionPlan>("monthly");
  const [amount, setAmount] = useState(150);
  const [currency, setCurrency] = useState("USD");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [transactionRef, setTransactionRef] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!email.trim()) return;
    setSearching(true);
    setNotFound(false);
    setFoundUser(null);
    const found = await findUserByEmail(email.trim());
    if (found) {
      setFoundUser(found);
      setUserName(found.name ?? "");
      setNotFound(false);
    } else {
      setNotFound(true);
    }
    setSearching(false);
  }, [email]);

  const handlePlanChange = useCallback((p: SubscriptionPlan) => {
    setPlan(p);
    setAmount(getPlan(p).price);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!foundUser || !user) {
      toast({ title: "Search for the user first", variant: "destructive" });
      return;
    }
    if (!companyName.trim()) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const result = await manuallyActivatePremium({
      userId: foundUser.id,
      userEmail: foundUser.email ?? email,
      userName: userName || foundUser.name || "",
      companyName: companyName.trim(),
      companyPhone: companyPhone.trim(),
      plan,
      amount,
      currency,
      paymentMethod,
      transactionReference: transactionRef,
      startDate: new Date(startDate).toISOString(),
      receiptUrl: receiptUrl.trim() || null,
      note: note.trim() || undefined,
      ownerId: user.id,
      ownerEmail: user.email,
    });
    setSubmitting(false);
    if (result.error) {
      toast({ title: "Activation failed", description: result.error, variant: "destructive" });
    } else {
      onActivated();
    }
  }, [foundUser, user, email, userName, companyName, companyPhone, plan, amount, currency, paymentMethod, transactionRef, startDate, receiptUrl, note, toast, onActivated]);

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed inset-y-0 right-0 z-[91] flex w-full max-w-lg flex-col bg-sidebar/95 backdrop-blur-xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Add Premium Consulting Account</h3>
            <p className="text-xs text-muted-foreground">Manually activate a registered Google account</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 1: Find user by email */}
          <div className="mb-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">Step 1 — Find User</p>
            <div className="flex gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Google account email…"
                type="email"
                className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-500/40 focus:outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={!email.trim() || searching}
                className="rounded-xl bg-amber-500/20 px-4 py-2.5 text-sm font-bold text-amber-300 transition hover:bg-amber-500/30 disabled:opacity-40"
              >
                {searching ? "Searching…" : "Search"}
              </button>
            </div>

            {notFound && (
              <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                  <AlertTriangle className="h-4 w-4" /> Account not registered
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This email has not signed up on OXEN yet. No fake user will be created. The request can be kept as pending — when this email registers, it will be ready for activation.
                </p>
              </div>
            )}

            {foundUser && (
              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06]">
                    {foundUser.avatar_url ? (
                      <img src={foundUser.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{foundUser.name ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">{foundUser.email}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Registered: {formatDate(foundUser.created_at)} · {foundUser.user_type}
                    </p>
                  </div>
                  <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-400" />
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Company + subscription details */}
          {foundUser && (
            <>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                Step 2 — Company & Subscription
              </p>
              <div className="space-y-3">
                <Field label="Display Name" value={userName} onChange={setUserName} placeholder="User's display name" />
                <Field label="Consulting Company Name" value={companyName} onChange={setCompanyName} placeholder="e.g. Global Visa Consulting" required />
                <Field label="Company Phone" value={companyPhone} onChange={setCompanyPhone} placeholder="+1 555 0100" />

                {/* Plan selector */}
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Subscription Plan</p>
                  <div className="grid grid-cols-3 gap-2">
                    {CONSULTING_PLANS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handlePlanChange(p.id)}
                        className={cn(
                          "rounded-xl border p-2.5 text-center transition",
                          plan === p.id
                            ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                            : "border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]",
                        )}
                      >
                        <p className="text-xs font-bold">{p.name}</p>
                        <p className="text-[10px]">{money(p.price)}</p>
                        <p className="text-[9px]">{p.months} month{p.months > 1 ? "s" : ""}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Amount" value={String(amount)} onChange={(v) => setAmount(Number(v) || 0)} type="number" />
                  <Field label="Currency" value={currency} onChange={setCurrency} />
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Payment Method</p>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground focus:border-amber-500/40 focus:outline-none"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="bank_card">Bank Card</option>
                    <option value="cash">Cash</option>
                    <option value="online">Online Payment</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <Field label="Transaction Reference" value={transactionRef} onChange={setTransactionRef} placeholder="TXN-2026-001" />
                <Field label="Start Date" value={startDate} onChange={setStartDate} type="date" />
                <Field label="Receipt URL (optional)" value={receiptUrl} onChange={setReceiptUrl} placeholder="https://…" />
                <Field label="Internal Note (optional)" value={note} onChange={setNote} placeholder="Reason for manual activation…" textarea />
              </div>

              {/* Expiration preview */}
              <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <CalendarClock className="h-3.5 w-3.5" /> Subscription Preview
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Start</p>
                    <p className="font-semibold text-foreground">{formatDate(new Date(startDate).toISOString())}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expiration</p>
                    <p className="font-semibold text-foreground">
                      {formatDate(
                        new Date(new Date(startDate).setMonth(
                          new Date(startDate).getMonth() + getPlan(plan).months,
                        )).toISOString(),
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !companyName.trim()}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/20 py-3.5 text-sm font-bold text-amber-300 transition hover:bg-amber-500/30 disabled:opacity-40"
              >
                {submitting ? (
                  <>Activating…</>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Activate Premium Consulting
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-[10px] text-muted-foreground">
                This will: set user_type → premium_consulting, create/update company, create subscription, create owner member, record payment, log to audit history. Performed by {user?.email}.
              </p>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </p>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-500/40 focus:outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-500/40 focus:outline-none"
        />
      )}
    </div>
  );
}
