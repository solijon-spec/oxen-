import { motion } from "framer-motion";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Sparkles,
  LayoutDashboard,
  Check,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import { CONSULTING_OPEN_PREVIEW_MODE } from "@/lib/consulting-preview";
import { CONSULTING_PLANS, type SubscriptionPlan } from "@/lib/consulting";
import { Accordion } from "@/components/consulting/Field";
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

const FAQS = [
  {
    question: "What is OXEN Premium Consulting?",
    answer:
      "A complete business workspace for consulting companies that sell travel, visa, university, work-abroad, and immigration packages. Manage clients, payments, employees, and revenue in one premium dashboard.",
  },
  {
    question: "How does the subscription work?",
    answer:
      "Choose Monthly, Quarterly, or Annual billing. Your subscription auto-renews and can be cancelled anytime from your dashboard. Your data is preserved in read-only mode after expiry.",
  },
  {
    question: "Can I add my team?",
    answer:
      "Yes. Invite employees and assign roles (Owner, Administrator, Manager, Consultant, Finance Manager, and more). Each role has its own permissions.",
  },
  {
    question: "Is my data secure?",
    answer:
      "All company, client, and payment data is isolated per company and protected by row-level security. Card details are tokenized — we never store raw card numbers or CVVs.",
  },
  {
    question: "What payment methods can my clients use?",
    answer:
      "Inside your dashboard you can record client payments by cash, card, bank transfer, online payment, or installment, and track outstanding balances per sale.",
  },
];

const BENEFITS = [
  "Create a verified consulting company profile",
  "Publish unlimited service packages",
  "Manage clients, applications, and documents",
  "Track payments and outstanding balances",
  "Invite employees and assign roles",
  "Monitor revenue and financial overview",
  "POS sales system for tour, visa, and consulting packages",
  "Cashier with income, expenses, and net profit tracking",
];

export default function Explore() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMember, hasActiveSubscription, hasExpiredSubscription, company } = useConsulting();

  useSEO({
    title: "Premium Consulting | OXEN",
    description:
      "Grow your consulting business with OXEN. Subscribe to Premium Consulting and manage packages, clients, payments, and revenue in one premium workspace.",
  });

  const showGoToDashboard = isMember && (hasActiveSubscription || hasExpiredSubscription);

  const handleBuy = useCallback(() => {
    const target = CONSULTING_OPEN_PREVIEW_MODE ? "/consulting/dashboard" : "/consulting/checkout";
    if (user?.isGuest) {
      navigate(`/auth?redirect=${encodeURIComponent(target)}`);
      return;
    }
    navigate(target);
  }, [user, navigate]);

  const handleSelectPlan = useCallback(
    (plan: SubscriptionPlan) => {
      if (user?.isGuest) {
        navigate(`/auth?redirect=${encodeURIComponent(`/consulting/plans`)}`);
        return;
      }
      navigate(`/consulting/plans?plan=${plan}`);
    },
    [user, navigate],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-5">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={springIn} className="text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" strokeWidth={2.2} />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Premium Consulting
          </span>
        </div>
        <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">
          Grow Your Consulting Business
          <br />
          <span className="text-gold-gradient">with OXEN</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Create a consulting company profile, publish service packages, manage clients and
          employees, and track your revenue — all in one premium workspace built for travel, visa,
          university, and immigration consultants.
        </p>

        {/* Primary CTA — preserved logic */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springIn, delay: 0.15 }}
          className="mt-6 flex flex-col items-center gap-3"
        >
          {showGoToDashboard ? (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/consulting/dashboard")}
                className="gold-gradient inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-bold text-primary-foreground shadow-xl shadow-primary/25"
              >
                <LayoutDashboard className="h-5 w-5" />
                Go to Consulting Dashboard
              </motion.button>
              {hasExpiredSubscription && (
                <p className="text-xs font-semibold text-amber-400">
                  Your subscription has expired —{" "}
                  <button
                    onClick={() => navigate("/consulting/renew")}
                    className="underline hover:opacity-80"
                  >
                    Renew now
                  </button>{" "}
                  to restore full access.
                </p>
              )}
              {hasActiveSubscription && company && (
                <p className="text-xs text-muted-foreground">
                  Signed in as <span className="font-semibold text-foreground">{company.name}</span>
                </p>
              )}
            </>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleBuy}
              className="gold-gradient inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-bold text-primary-foreground shadow-xl shadow-primary/25"
            >
              <Sparkles className="h-5 w-5" />
              Buy Premium Consulting
            </motion.button>
          )}
        </motion.div>
      </motion.div>

      {/* Plans */}
      <section className="mt-12">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={springIn}
          className="mb-6 text-center font-display text-xl font-bold text-foreground sm:text-2xl"
        >
          Choose your plan
        </motion.h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONSULTING_PLANS.map((plan, i) => {
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
      </section>

      {/* Benefits */}
      <section className="mt-14">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={springIn}
          className="mb-6 text-center font-display text-xl font-bold text-foreground sm:text-2xl"
        >
          Everything you need to run your consulting business
        </motion.h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.05, ...springIn }}
              className="glass flex items-center gap-3 rounded-2xl p-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
              <span className="text-sm font-semibold text-foreground">{b}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Secure payment */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={springIn}
        className="mt-12"
      >
        <div className="flex items-center gap-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Secure payment</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Payments are processed through a PCI-DSS-compliant tokenization flow. We never store
              your raw card number or CVV — only masked last four digits and a provider payment-method ID.
            </p>
          </div>
        </div>
      </motion.section>

      {/* FAQ */}
      <section className="mt-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={springIn}
          className="mb-5 flex items-center justify-center gap-2"
        >
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            Frequently asked questions
          </h2>
        </motion.div>
        <div className="mx-auto max-w-2xl">
          <Accordion items={FAQS} />
        </div>
      </section>

      {/* Final CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={springIn}
        className="mt-12 text-center"
      >
        {!showGoToDashboard && (
          <button
            onClick={handleBuy}
            className={cn(
              "gold-gradient mx-auto inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition active:scale-95",
            )}
          >
            <Sparkles className="h-4 w-4" />
            Buy Premium Consulting
          </button>
        )}
        <button
          onClick={() => navigate("/support")}
          className="mt-4 block w-full text-center text-xs font-semibold text-primary transition hover:opacity-80"
        >
          Questions? Contact OXEN Support →
        </button>
      </motion.div>
    </div>
  );
}
