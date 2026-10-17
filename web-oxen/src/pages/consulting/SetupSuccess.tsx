import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles, Building2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getPlan, type SubscriptionPlan } from "@/lib/consulting";
import { useSEO } from "@/hooks/use-seo";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

interface OnboardingSnapshot {
  plan: SubscriptionPlan;
  planName: string;
  price: number;
  months: number;
  company: {
    name: string;
    legalName: string;
    country: string;
    city: string;
    managerFullName: string;
    managerEmail: string;
  };
  card: { brand: string; last4: string; masked: string };
  createdAt: string;
  testMode: boolean;
}

export default function SetupSuccess() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<OnboardingSnapshot | null>(null);

  useSEO({
    title: "Setup Complete | OXEN Consulting",
    description: "Your consulting account setup is ready.",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("oxen.consulting.onboarding");
      if (raw) setSnapshot(JSON.parse(raw) as OnboardingSnapshot);
    } catch {
      // Ignore malformed snapshot — page still renders the default success state.
    }
  }, []);

  const plan = useMemo(() => (snapshot ? getPlan(snapshot.plan) : null), [snapshot]);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center px-5 py-10 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...springIn, delay: 0.05 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-4 ring-emerald-500/10"
      >
        <Check className="h-10 w-10" strokeWidth={3} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.15 }}
        className="font-display text-2xl font-extrabold sm:text-3xl"
      >
        Your consulting account setup is ready.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.22 }}
        className="mt-3 max-w-md text-sm text-muted-foreground"
      >
        {snapshot ? (
          <>
            <span className="font-semibold text-foreground">{snapshot.company.name}</span> is set up on the{" "}
            <span className="font-semibold text-foreground">{snapshot.planName}</span> plan. You can now start building
            your dashboard.
          </>
        ) : (
          <>Your test-mode onboarding was saved. You can now start building your dashboard.</>
        )}
      </motion.p>

      {/* Summary card */}
      {snapshot && plan && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.3 }}
          className="glass mt-7 w-full rounded-3xl p-6 text-left"
        >
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Onboarding summary</span>
          </div>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-semibold text-foreground">
                {plan.name} · {plan.months} month{plan.months > 1 ? "s" : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-semibold text-foreground">${plan.price.toLocaleString()} USD</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Company</dt>
              <dd className="truncate font-semibold text-foreground">{snapshot.company.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Location</dt>
              <dd className="font-semibold text-foreground">
                {snapshot.company.city}, {snapshot.company.country}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Manager</dt>
              <dd className="truncate font-semibold text-foreground">{snapshot.company.managerFullName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Payment</dt>
              <dd className="font-mono text-xs font-semibold text-foreground">
                {snapshot.card.brand} {snapshot.card.masked}
              </dd>
            </div>
          </dl>

          {snapshot.testMode && (
            <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-2.5 text-center text-[11px] text-amber-200/90">
              Test Mode — no real charge was made. Dashboard content is coming next.
            </p>
          )}
        </motion.div>
      )}

      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springIn, delay: 0.38 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/consulting/dashboard")}
        className="gold-gradient mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition active:scale-95"
      >
        <Sparkles className="h-4 w-4" />
        Continue to Dashboard Setup
        <ArrowRight className="h-4 w-4" />
      </motion.button>

      <button
        onClick={() => navigate("/explore")}
        className="mt-4 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
      >
        Back to plans
      </button>
    </div>
  );
}
