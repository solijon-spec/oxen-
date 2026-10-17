import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CreditCard,
  UserCircle,
  Building2,
  FileText,
  CheckCircle2,
  XCircle,
  MessageSquareWarning,
  RotateCcw,
  Ban,
  Eye,
  X,
  StickyNote,
  ExternalLink,
  Phone,
  Mail,
} from "lucide-react";

import { OwnerShell } from "@/components/consulting/OwnerShell";
import { EmptyState } from "@/components/consulting/EmptyState";
import { useSEO } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchPaymentRequests,
  updatePaymentRequestStatus,
  type PaymentRequest,
  type PaymentVerificationStatus,
} from "@/lib/owner-admin";
import { cn } from "@/lib/utils";

const springIn = { type: "spring" as const, stiffness: 260, damping: 26 };

const STATUS_LABEL: Record<PaymentVerificationStatus, string> = {
  pending_verification: "Pending Verification",
  confirmed: "Payment Confirmed",
  rejected: "Rejected",
  more_info_required: "More Info Required",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

const STATUS_STYLE: Record<PaymentVerificationStatus, string> = {
  pending_verification: "bg-amber-500/15 text-amber-300",
  confirmed: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-destructive/15 text-destructive",
  more_info_required: "bg-sky-500/15 text-sky-300",
  refunded: "bg-purple-500/15 text-purple-300",
  cancelled: "bg-white/[0.06] text-muted-foreground",
};

const FILTER_OPTIONS: { value: PaymentVerificationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending_verification", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rejected", label: "Rejected" },
  { value: "more_info_required", label: "More Info" },
  { value: "refunded", label: "Refunded" },
  { value: "cancelled", label: "Cancelled" },
];

function money(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
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

export default function OwnerPayments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useSEO({ title: "Consulting Payments | OXEN Owner", description: "Verify consulting payment requests." });

  const [statusFilter, setStatusFilter] = useState<PaymentVerificationStatus | "all">("pending_verification");
  const [selected, setSelected] = useState<PaymentRequest | null>(null);
  const [noteText, setNoteText] = useState("");

  const paymentsQ = useQuery({
    queryKey: ["owner-payments", statusFilter],
    queryFn: () => fetchPaymentRequests(statusFilter),
    staleTime: 15_000,
  });

  const payments = paymentsQ.data ?? [];

  const handleAction = useCallback(
    async (req: PaymentRequest, action: PaymentVerificationStatus) => {
      if (!user) return;
      const ok = await updatePaymentRequestStatus(req.id, action, user.id, noteText.trim() || undefined);
      if (ok) {
        toast({ title: `Payment ${STATUS_LABEL[action]}`, description: req.company_name ?? req.user_email });
        queryClient.invalidateQueries({ queryKey: ["owner-payments"] });
        queryClient.invalidateQueries({ queryKey: ["owner-dashboard-stats"] });
        queryClient.invalidateQueries({ queryKey: ["owner-pending-payments-dashboard"] });
        setSelected(null);
        setNoteText("");
      } else {
        toast({ title: "Action failed", variant: "destructive" });
      }
    },
    [user, noteText, queryClient, toast],
  );

  return (
    <OwnerShell title="Consulting Payments" subtitle="Verify and approve Premium Consulting payment requests">
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
      {paymentsQ.isLoading ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Loading payment requests…</div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payment requests"
          description={statusFilter === "pending_verification"
            ? "There are no pending payment verification requests."
            : "No payment requests match this filter."}
        />
      ) : (
        <div className="space-y-3">
          {payments.map((req, i) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springIn, delay: i * 0.04 }}
              className="glass rounded-2xl p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* User + company info */}
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.06]">
                    {req.user_avatar_url ? (
                      <img src={req.user_avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold text-foreground">
                      {req.company_name ?? "Unknown company"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {req.user_name ?? "—"} · {req.user_email}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {req.company_phone ?? "No phone"}
                    </p>
                  </div>
                </div>

                {/* Payment info */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-display text-base font-bold text-foreground">
                      {money(req.amount, req.currency)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {req.duration_months}mo · {req.payment_method ?? "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Applied: {formatDate(req.application_date)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
                      STATUS_STYLE[req.verification_status],
                    )}
                  >
                    {STATUS_LABEL[req.verification_status]}
                  </span>
                  <button
                    onClick={() => setSelected(req)}
                    className="shrink-0 rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25"
                  >
                    <Eye className="mr-1 inline h-3 w-3" /> Review
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          <p className="text-center text-[11px] text-muted-foreground">
            {payments.length} {payments.length === 1 ? "request" : "requests"}
          </p>
        </div>
      )}

      {/* Detail slide-over */}
      {selected && (
        <PaymentDetailSlideover
          req={selected}
          noteText={noteText}
          onNoteTextChange={setNoteText}
          onAction={(a) => handleAction(selected, a)}
          onClose={() => setSelected(null)}
        />
      )}
    </OwnerShell>
  );
}

/* ── Payment detail slide-over ───────────────────────────── */

function PaymentDetailSlideover({
  req,
  noteText,
  onNoteTextChange,
  onAction,
  onClose,
}: {
  req: PaymentRequest;
  noteText: string;
  onNoteTextChange: (v: string) => void;
  onAction: (status: PaymentVerificationStatus) => void;
  onClose: () => void;
}) {
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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h3 className="font-display text-base font-bold text-foreground">Payment Request</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/[0.06]">
              {req.user_avatar_url ? (
                <img src={req.user_avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserCircle className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold text-foreground">
                {req.company_name ?? "Unknown"}
              </p>
              <p className="truncate text-sm text-muted-foreground">{req.user_name ?? "—"}</p>
              <p className="truncate text-xs text-muted-foreground">{req.user_email}</p>
            </div>
          </div>

          {/* Status badge */}
          <div className="mt-4">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                STATUS_STYLE[req.verification_status],
              )}
            >
              {STATUS_LABEL[req.verification_status]}
            </span>
          </div>

          {/* Payment details */}
          <div className="mt-5 space-y-3">
            <InfoRow icon={CreditCard} label="Amount" value={`${money(req.amount, req.currency)} (${req.duration_months} months)`} />
            <InfoRow icon={Building2} label="Company" value={req.company_name ?? "—"} />
            <InfoRow icon={Phone} label="Company Phone" value={req.company_phone ?? "—"} />
            <InfoRow icon={FileText} label="Plan" value={`${req.duration_months} month${req.duration_months > 1 ? "s" : ""}`} />
            <InfoRow icon={CreditCard} label="Payment Method" value={req.payment_method ?? "—"} />
            <InfoRow icon={FileText} label="Payment Date" value={formatDate(req.payment_date)} />
            <InfoRow icon={FileText} label="Transaction Ref" value={req.transaction_reference ?? "—"} />
            <InfoRow icon={FileText} label="Applied Date" value={formatDate(req.application_date)} />
          </div>

          {/* Receipt */}
          {req.receipt_url && (
            <a
              href={req.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 py-2.5 text-sm font-bold text-amber-300 transition hover:bg-amber-500/20"
            >
              <ExternalLink className="h-4 w-4" /> View Receipt
            </a>
          )}

          {/* Contact buttons */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a
              href={req.company_phone ? `tel:${req.company_phone}` : "#"}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] py-2.5 text-xs font-bold text-foreground transition hover:bg-white/[0.08]"
            >
              <Phone className="h-3.5 w-3.5" /> Call
            </a>
            <a
              href={req.user_email ? `mailto:${req.user_email}` : "#"}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] py-2.5 text-xs font-bold text-foreground transition hover:bg-white/[0.08]"
            >
              <Mail className="h-3.5 w-3.5" /> Email
            </a>
          </div>

          {/* Owner note */}
          <div className="mt-6">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <StickyNote className="h-3 w-3" /> Owner Note
            </p>
            <textarea
              value={noteText}
              onChange={(e) => onNoteTextChange(e.target.value)}
              placeholder="Add a private note about this payment…"
              rows={3}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-500/40 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              onClick={() => onAction("confirmed")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 py-3 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/25"
            >
              <CheckCircle2 className="h-4 w-4" /> Confirm
            </button>
            <button
              onClick={() => onAction("rejected")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-destructive/15 py-3 text-sm font-bold text-destructive transition hover:bg-destructive/25"
            >
              <XCircle className="h-4 w-4" /> Reject
            </button>
            <button
              onClick={() => onAction("more_info_required")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500/15 py-3 text-sm font-bold text-sky-300 transition hover:bg-sky-500/25"
            >
              <MessageSquareWarning className="h-4 w-4" /> Request Info
            </button>
            <button
              onClick={() => onAction("refunded")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-500/15 py-3 text-sm font-bold text-purple-300 transition hover:bg-purple-500/25"
            >
              <RotateCcw className="h-4 w-4" /> Refunded
            </button>
            <button
              onClick={() => onAction("cancelled")}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] py-3 text-sm font-bold text-muted-foreground transition hover:bg-white/[0.08]"
            >
              <Ban className="h-4 w-4" /> Cancel Request
            </button>
          </div>

          <p className="mt-4 text-center text-[10px] text-muted-foreground">
            Confirming a payment does not auto-activate Premium. Use the Premium Accounts page to activate.
          </p>
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
