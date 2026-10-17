import { motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Download,
  RefreshCw,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";

import { useConsulting } from "@/contexts/ConsultingContext";
import { getPlan, type SubscriptionPlan } from "@/lib/consulting";
import { useSEO } from "@/hooks/use-seo";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

interface TestSubscriptionState {
  status: string;
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;
  amount: number;
  cardBrand: string;
  cardLast4: string;
  cardMasked: string;
  history: Array<{
    id: string;
    date: string;
    plan: SubscriptionPlan;
    amount: number;
    cardMasked: string;
    type: "subscription" | "renewal";
  }>;
}

function readTestSub(): TestSubscriptionState | null {
  try {
    const raw = localStorage.getItem("oxen.consulting.test.subscription");
    return raw ? (JSON.parse(raw) as TestSubscriptionState) : null;
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
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

export default function Billing() {
  const navigate = useNavigate();
  const { company, subscriptionPlan, subscriptionEndDate, subscriptionAccess, isTestMode } = useConsulting();
  const [, forceTick] = useState(0);

  useSEO({
    title: "Billing History | OXEN Consulting",
    description: "View your subscription billing history.",
  });

  const testSub = useMemo(() => (isTestMode ? readTestSub() : null), [isTestMode]);
  const plan = subscriptionPlan ? getPlan(subscriptionPlan) : null;
  const history = testSub?.history ?? [];

  const handleDownload = useCallback((id: string) => {
    // Test-mode: generate a simple receipt text file.
    const entry = history.find((h) => h.id === id);
    if (!entry) return;
    const content = [
      "OXEN Consulting — Payment Receipt",
      "================================",
      `Transaction ID: ${entry.id}`,
      `Date:           ${formatDate(entry.date)}`,
      `Plan:           ${getPlan(entry.plan).name}`,
      `Amount:         $${entry.amount.toLocaleString()} USD`,
      `Payment method: ${entry.cardMasked}`,
      `Type:           ${entry.type}`,
      "",
      "Test Mode — No real charge was made.",
      "This receipt is for demonstration purposes only.",
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oxen-receipt-${id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    forceTick((n) => n + 1);
  }, [history]);

  return (
    <div className="mx-auto max-w-3xl px-5 pt-10 pb-16">
      <button
        onClick={() => navigate(subscriptionAccess === "expired" ? "/consulting/expired" : "/consulting/dashboard")}
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Company card */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springIn}
        className="mb-6 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold text-foreground">{company?.name ?? "Your company"}</p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Billing & subscription</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            subscriptionAccess === "active"
              ? "bg-emerald-500/15 text-emerald-400"
              : subscriptionAccess === "expired"
                ? "bg-amber-500/15 text-amber-400"
                : "bg-white/[0.06] text-muted-foreground",
          )}
        >
          {subscriptionAccess === "active" ? "Active" : subscriptionAccess === "expired" ? "Expired" : "None"}
        </span>
      </motion.div>

      {/* Current plan summary */}
      {plan && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springIn}
          className="glass mb-6 rounded-3xl p-6"
        >
          <h2 className="mb-4 font-display text-base font-bold text-foreground">Current subscription</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Plan</dt>
              <dd className="mt-0.5 font-semibold text-foreground">{plan.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Amount</dt>
              <dd className="mt-0.5 font-semibold text-foreground">${plan.price.toLocaleString()} USD</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" /> Start date
              </dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                {testSub ? formatDate(testSub.startDate) : formatDate(company?.subscription_start_date ?? new Date().toISOString())}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" /> Expiration date
              </dt>
              <dd className="mt-0.5 font-semibold text-foreground">{formatDate(subscriptionEndDate ?? new Date().toISOString())}</dd>
            </div>
          </dl>

          {subscriptionAccess === "expired" && (
            <button
              onClick={() => navigate("/consulting/renew")}
              className="gold-gradient mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Renew now
            </button>
          )}
        </motion.div>
      )}

      {/* Billing history */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.1 }}
        className="glass rounded-3xl p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-foreground">Billing history</h2>
          <span className="text-[11px] text-muted-foreground">{history.length} transaction{history.length === 1 ? "" : "s"}</span>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CreditCard className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-foreground">No transactions yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Your subscription payments will appear here once your subscription is active.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-3 font-semibold">Date</th>
                  <th className="pb-2 pr-3 font-semibold">Description</th>
                  <th className="pb-2 pr-3 font-semibold">Method</th>
                  <th className="pb-2 pr-3 text-right font-semibold">Amount</th>
                  <th className="pb-2 text-right font-semibold">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-white/[0.04]">
                    <td className="py-3 pr-3 text-xs text-muted-foreground">{formatDate(h.date)}</td>
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-foreground">{getPlan(h.plan).name} plan</p>
                      <p className="text-[10px] capitalize text-muted-foreground">{h.type}</p>
                    </td>
                    <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">{h.cardMasked}</td>
                    <td className="py-3 pr-3 text-right font-semibold text-foreground">${h.amount.toLocaleString()}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDownload(h.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition hover:opacity-80"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
        <p className="text-xs text-muted-foreground">
          We never store your full card number or CVV. Only the masked last four digits and card brand are kept for
          display. {isTestMode && "Test Mode — no real charges are made."}
        </p>
      </div>
    </div>
  );
}
