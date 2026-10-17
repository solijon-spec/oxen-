import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CONSULTING_PLANS, type SubscriptionPlan } from "@/lib/consulting";
import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

const cardSpring = {
  type: "spring" as const,
  stiffness: 260,
  damping: 24,
  mass: 0.8,
};

export default function Plans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agreedTerms, setAgreedTerms] = useState(false);

  useSEO({
    title: "Choose Your Plan | OXEN Consulting",
    description: "Select a Premium Consulting subscription plan: Monthly, Quarterly, or Annual.",
  });

  const handleSelectPlan = useCallback(
    (plan: SubscriptionPlan) => {
      if (user?.isGuest) {
        navigate(`/auth?redirect=${encodeURIComponent(`/consulting/plans`)}`);
        return;
      }
      if (!agreedTerms) {
        toast({
          title: "Please accept the Terms & Conditions first",
          variant: "destructive",
        });
        document.getElementById("terms-checkbox")?.focus();
        return;
      }
      navigate(`/consulting/checkout?plan=${plan}`);
    },
    [user, agreedTerms, navigate],
  );

  const handleContactSupport = useCallback(() => {
    navigate("/support");
  }, [navigate]);

  const renewalInfo = useMemo(
    () =>
      CONSULTING_PLANS.map((p) => {
        const date = new Date();
        date.setMonth(date.getMonth() + p.months);
        return { id: p.id, renewalDate: date.toLocaleDateString() };
      }),
    [],
  );

  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 pb-10">
      {/* Back */}
      <button
        onClick={() => navigate("/explore")}
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to overview
      </button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={springIn} className="mb-8 text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" strokeWidth={2.2} />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Premium Consulting</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">Choose your plan</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Pick the plan that fits your consulting business. Cancel anytime — your data is always preserved.
        </p>
      </motion.div>

      {/* Plans */}
      <section className="mb-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONSULTING_PLANS.map((plan, i) => {
            const renewal = renewalInfo.find((r) => r.id === plan.id);
            const featured = !!plan.badge;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, ...cardSpring }}
                whileTap={{ scale: 0.98 }}
                className={
                  featured
                    ? "relative flex flex-col rounded-3xl border border-primary/40 bg-primary/[0.04] p-6 shadow-xl shadow-primary/10"
                    : "glass relative flex flex-col rounded-3xl border border-white/[0.06] p-6"
                }
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg">
                    {plan.badge}
                  </span>
                )}
                <div className="mb-3">
                  <h3 className="font-display text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.months} month{plan.months > 1 ? "s" : ""}</p>
                </div>
                <div className="mb-1 flex items-end gap-1.5">
                  <span className="font-display text-4xl font-extrabold text-foreground">
                    ${plan.price.toLocaleString()}
                  </span>
                  <span className="mb-1.5 text-xs text-muted-foreground">USD</span>
                </div>
                {plan.savingsLabel && (
                  <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    {plan.savingsLabel}
                  </span>
                )}

                <ul className="mb-5 mt-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={3} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mb-4 mt-auto space-y-1.5 border-t border-white/[0.06] pt-3 text-[10px] text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground/70">Renews:</span>{" "}
                    {renewal?.renewalDate} · auto-renewal on
                  </p>
                  <p>
                    <span className="font-semibold text-foreground/70">Cancel:</span> anytime from your dashboard
                  </p>
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={
                    featured
                      ? "gold-gradient flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-bold text-primary-foreground transition active:scale-95"
                      : "flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.06] py-3 text-sm font-bold text-foreground transition hover:bg-white/[0.1] active:scale-95"
                  }
                >
                  Select Plan
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Terms checkbox */}
        <motion.label
          id="terms-checkbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
        >
          <input
            type="checkbox"
            checked={agreedTerms}
            onChange={(e) => setAgreedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="text-xs text-muted-foreground">
            I agree to the OXEN Consulting{" "}
            <span className="font-semibold text-primary">Terms & Conditions</span>, including the subscription
            auto-renewal policy, platform commission on package sales, and acceptable use guidelines. I understand I
            can cancel anytime and my data is preserved in read-only mode after expiry.
          </span>
        </motion.label>
      </section>

      {/* Secure payment */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={springIn}
        className="mb-8"
      >
        <div className="flex items-center gap-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Secure payment</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Payments are processed through a PCI-DSS-compliant tokenization flow. We never store your raw card number
              or CVV — only the masked last four digits and a provider payment-method ID. Phone OTP verification
              protects every transaction.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Final CTA */}
      <div className="text-center">
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springIn}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleSelectPlan("quarterly")}
          className={cn(
            "gold-gradient mx-auto inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition active:scale-95",
          )}
        >
          <Sparkles className="h-4 w-4" />
          Continue with Most Popular
        </motion.button>
        <button
          onClick={handleContactSupport}
          className="mt-3 text-xs font-semibold text-primary transition hover:opacity-80"
        >
          Questions? Contact OXEN Support →
        </button>
      </div>
    </div>
  );
}
