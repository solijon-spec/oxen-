import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarClock,
  Building2,
  RefreshCw,
  CreditCard,
  LifeBuoy,
  ShieldCheck,
  LogOut,
  ArrowRight,
} from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useConsulting } from "@/contexts/ConsultingContext";
import { getPlan } from "@/lib/consulting";
import { useSEO } from "@/hooks/use-seo";
import LogoutDialog from "@/components/LogoutDialog";
import { useState } from "react";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

/** Format an ISO date for display. */
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function SubscriptionExpired() {
  const navigate = useNavigate();
  const { company, subscriptionPlan, subscriptionEndDate, isTestMode, simulateExpiration } = useConsulting();
  const [logoutOpen, setLogoutOpen] = useState(false);

  useSEO({
    title: "Subscription Expired | OXEN Consulting",
    description: "Your OXEN Consulting subscription has expired. Renew to restore access.",
  });

  const plan = subscriptionPlan ? getPlan(subscriptionPlan) : null;
  const companyName = company?.name ?? "Your consulting company";
  const logoUrl = company?.logo_url ?? null;

  const goRenew = useCallback(() => navigate("/consulting/renew"), [navigate]);
  const goBilling = useCallback(() => navigate("/consulting/billing"), [navigate]);
  const goSupport = useCallback(() => navigate("/support"), [navigate]);
  const goSecurity = useCallback(() => navigate("/settings/two-factor"), [navigate]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
      {/* Test-mode helper: simulate expiration toggle (only visible in test mode) */}
      {isTestMode && (
        <div className="absolute right-4 top-4 z-10">
          <button
            onClick={simulateExpiration}
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-amber-300 transition hover:bg-amber-500/20"
            title="Test-mode helper: force expired state"
          >
            Test: mark expired
          </button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springIn}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 ring-4 ring-amber-500/10"
      >
        <AlertTriangle className="h-10 w-10" strokeWidth={2.4} />
      </motion.div>

      {/* Company card — logo + name preserved */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.1 }}
        className="mb-6 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-foreground">{companyName}</p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Consulting workspace</p>
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.18 }}
        className="text-center font-display text-2xl font-extrabold sm:text-3xl"
      >
        Your subscription has expired
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.24 }}
        className="mt-3 max-w-md text-center text-sm text-muted-foreground"
      >
        Your company data, clients, employees, packages, and history are all preserved. Renew your subscription to
        restore full access to your consulting workspace.
      </motion.p>

      {/* Expired plan summary */}
      {plan && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.3 }}
          className="glass mt-6 w-full max-w-md rounded-3xl p-6"
        >
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4" /> Expired plan
              </dt>
              <dd className="font-semibold text-foreground">{plan.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <CalendarClock className="h-4 w-4" /> Expiration date
              </dt>
              <dd className="font-semibold text-foreground">{formatDate(subscriptionEndDate)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
              <dt className="text-muted-foreground">Subscription status</dt>
              <dd>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Expired
                </span>
              </dd>
            </div>
          </dl>
        </motion.div>
      )}

      {/* Primary renew CTA */}
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.38 }}
        whileTap={{ scale: 0.97 }}
        onClick={goRenew}
        className="gold-gradient mt-7 inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/25"
      >
        <RefreshCw className="h-5 w-5" />
        Renew Subscription
        <ArrowRight className="h-4 w-4" />
      </motion.button>

      {/* Secondary actions — the only routes accessible while expired */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.45 }}
        className="mt-8 grid w-full max-w-md grid-cols-2 gap-3"
      >
        <button
          onClick={goBilling}
          className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold text-foreground transition hover:border-primary/30"
        >
          <CreditCard className="h-4 w-4 text-primary" />
          Billing history
        </button>
        <button
          onClick={goSecurity}
          className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold text-foreground transition hover:border-primary/30"
        >
          <ShieldCheck className="h-4 w-4 text-primary" />
          Account security
        </button>
        <button
          onClick={goSupport}
          className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold text-foreground transition hover:border-primary/30"
        >
          <LifeBuoy className="h-4 w-4 text-primary" />
          OXEN Support
        </button>
        <button
          onClick={() => setLogoutOpen(true)}
          className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold text-destructive transition hover:border-destructive/30"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </motion.div>

      <p className="mt-8 max-w-md text-center text-[11px] text-muted-foreground">
        Operational data (clients, applications, packages, employees, analytics) is locked until renewal. Your data is
        safe and will be fully restored the moment you renew.
      </p>

      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}
