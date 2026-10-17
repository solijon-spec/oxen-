import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

import {
  CONSULTING_PLANS,
  computeEndDate,
  getPlan,
  type SubscriptionPlan,
} from "@/lib/consulting";
import {
  detectBrand,
  maskCard,
  tokenizeCard,
  type TokenizedCard,
} from "@/lib/payment";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import { Field } from "@/components/consulting/Field";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExp(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

interface CardForm {
  cardholder: string;
  number: string;
  exp: string;
  cvv: string;
  billingAddress: string;
  billingCity: string;
  billingPostal: string;
}

const EMPTY_CARD: CardForm = {
  cardholder: "",
  number: "",
  exp: "",
  cvv: "",
  billingAddress: "",
  billingCity: "",
  billingPostal: "",
};

export default function Renew() {
  const navigate = useNavigate();
  const { company, subscriptionPlan, isTestMode, renewSubscription } = useConsulting();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(subscriptionPlan ?? "quarterly");
  const [step, setStep] = useState<0 | 1>(0); // 0 = plan + card, 1 = confirming
  const [card, setCard] = useState<CardForm>(EMPTY_CARD);
  const [cardError, setCardError] = useState<string | null>(null);
  const [tokenizing, setTokenizing] = useState(false);
  const [tokenized, setTokenized] = useState<TokenizedCard | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [renewing, setRenewing] = useState(false);

  useSEO({
    title: "Renew Subscription | OXEN Consulting",
    description: "Renew your OXEN Consulting subscription to restore dashboard access.",
  });

  const plan = useMemo(() => getPlan(selectedPlan), [selectedPlan]);
  const companyName = company?.name ?? "Your company";
  const logoUrl = company?.logo_url ?? null;

  const handlePay = useCallback(async () => {
    setCardError(null);
    const digits = card.number.replace(/\s+/g, "");
    if (!card.cardholder.trim()) return setCardError("Cardholder name is required.");
    if (digits.length < 13) return setCardError("Enter a valid card number.");
    if (!card.exp.includes("/") || card.exp.length < 5) return setCardError("Enter expiration as MM/YY.");
    if (card.cvv.replace(/\D/g, "").length < 3) return setCardError("Enter a valid CVV.");
    if (!card.billingAddress.trim()) return setCardError("Billing address is required.");
    if (!card.billingCity.trim()) return setCardError("Billing city is required.");

    setTokenizing(true);
    try {
      const tok = await tokenizeCard({
        cardholder: card.cardholder,
        number: card.number,
        exp: card.exp,
        cvv: card.cvv,
        billingCountry: company?.country ?? "",
        billingAddress: card.billingAddress,
      });
      setTokenized(tok);
      setStep(1);
    } catch (err) {
      setCardError(err instanceof Error ? err.message : "Card validation failed.");
    } finally {
      setTokenizing(false);
    }
  }, [card, company]);

  const handleConfirmRenew = useCallback(async () => {
    if (!agreed || !tokenized) return;
    setRenewing(true);
    try {
      const ok = await renewSubscription({
        plan: selectedPlan,
        amount: plan.price,
        cardBrand: tokenized.brand,
        cardLast4: tokenized.last4,
        cardMasked: tokenized.masked,
      });
      if (ok) {
        toast({
          title: "Subscription renewed",
          description: "Your consulting workspace is fully restored.",
        });
        navigate("/consulting/dashboard", { replace: true });
      } else {
        toast({ title: "Renewal failed. Please try again.", variant: "destructive" });
      }
    } finally {
      setRenewing(false);
    }
  }, [agreed, tokenized, renewSubscription, selectedPlan, plan, navigate]);

  const endDate = useMemo(() => {
    const d = computeEndDate(new Date(), selectedPlan);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }, [selectedPlan]);

  return (
    <div className="mx-auto max-w-2xl px-5 pt-10 pb-16">
      <button
        onClick={() => navigate("/consulting/expired")}
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Renew Subscription</h1>
          <p className="truncate text-xs text-muted-foreground">{companyName}</p>
        </div>
      </div>

      {isTestMode && (
        <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-200/90">
            <strong>Test Mode — No real money will be charged.</strong> Use test card{" "}
            <span className="font-mono font-bold">4242 4242 4242 4242</span>, any future expiration, any CVV.
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="renew-step1"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={springIn}
            className="glass rounded-3xl p-6 sm:p-8"
          >
            <h2 className="mb-4 font-display text-base font-bold text-foreground">1. Choose your new plan</h2>
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              {CONSULTING_PLANS.map((p) => {
                const selected = p.id === selectedPlan;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={cn(
                      "flex flex-col rounded-2xl border p-4 text-left transition",
                      selected
                        ? "border-primary bg-primary/[0.06] ring-1 ring-primary/40"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-primary/30",
                    )}
                  >
                    <span className="font-display text-sm font-bold text-foreground">{p.name}</span>
                    <span className="mt-1 font-display text-xl font-extrabold text-foreground">
                      ${p.price.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {p.months} month{p.months > 1 ? "s" : ""}
                    </span>
                    {p.savingsLabel && (
                      <span className="mt-1 inline-flex w-fit rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-400">
                        {p.savingsLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-foreground">
              <CreditCard className="h-4 w-4 text-primary" /> 2. Payment card
            </h2>
            <div className="grid gap-4">
              <Field
                label="Cardholder name"
                value={card.cardholder}
                onChange={(v) => setCard((c) => ({ ...c, cardholder: v }))}
                placeholder="John Doe"
                required
                autoComplete="cc-name"
              />
              <div>
                <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  Card number <span className="text-primary">*</span>
                </span>
                <div className="relative">
                  <input
                    inputMode="numeric"
                    value={card.number}
                    onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
                    placeholder="4242 4242 4242 4242"
                    autoComplete="cc-number"
                    className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm tracking-wider text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  {card.number.replace(/\D/g, "").length >= 4 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-muted-foreground">
                      {detectBrand(card.number)}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    Expiration date <span className="text-primary">*</span>
                  </span>
                  <input
                    inputMode="numeric"
                    value={card.exp}
                    onChange={(e) => setCard((c) => ({ ...c, exp: formatExp(e.target.value) }))}
                    placeholder="MM/YY"
                    autoComplete="cc-exp"
                    className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    CVV <span className="text-primary">*</span>
                  </span>
                  <input
                    inputMode="numeric"
                    value={card.cvv}
                    onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                    placeholder="123"
                    autoComplete="cc-csc"
                    className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>
              <Field
                label="Billing street address"
                value={card.billingAddress}
                onChange={(v) => setCard((c) => ({ ...c, billingAddress: v }))}
                placeholder="123 Main Street"
                required
                autoComplete="address-line1"
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Billing city"
                  value={card.billingCity}
                  onChange={(v) => setCard((c) => ({ ...c, billingCity: v }))}
                  placeholder="Tashkent"
                  required
                  autoComplete="address-level2"
                />
                <Field
                  label="Billing postal code"
                  value={card.billingPostal}
                  onChange={(v) => setCard((c) => ({ ...c, billingPostal: v }))}
                  placeholder="100000"
                  autoComplete="postal-code"
                />
              </div>

              {cardError && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {cardError}
                </p>
              )}
            </div>

            <div className="mt-7 flex justify-end">
              <button
                onClick={handlePay}
                disabled={tokenizing}
                className="gold-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-95 disabled:opacity-60"
              >
                {tokenizing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying card…
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 1 && tokenized && (
          <motion.div
            key="renew-step2"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={springIn}
            className="glass rounded-3xl p-6 sm:p-8"
          >
            <div className="mb-5 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" strokeWidth={2.2} />
              <h1 className="font-display text-xl font-bold sm:text-2xl">Confirm renewal</h1>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">New plan</p>
                    <p className="mt-0.5 font-display text-lg font-bold text-foreground">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {plan.months} month{plan.months > 1 ? "s" : ""} · renews on {endDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-extrabold text-foreground">
                      ${plan.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">USD</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Company</p>
                <p className="mt-0.5 font-display text-sm font-bold text-foreground">{companyName}</p>
                <p className="text-xs text-muted-foreground">
                  The same company account, ID, clients, employees, packages, and history are preserved.
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Payment method</p>
                <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="capitalize">{tokenized.brand}</span>
                  <span className="font-mono">{tokenized.masked}</span>
                  <span className="text-muted-foreground">· {tokenized.expMonth}/{tokenized.expYear}</span>
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-xs text-muted-foreground">
                  I authorize OXEN to charge <strong className="text-foreground">${plan.price.toLocaleString()} USD</strong>{" "}
                  to renew my <strong className="text-foreground">{plan.name}</strong> subscription. I understand my data
                  is fully restored and no duplicate company will be created.
                </span>
              </label>
            </div>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                onClick={() => setStep(0)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/[0.06] px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-white/[0.1]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleConfirmRenew}
                disabled={!agreed || renewing}
                className="gold-gradient inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition active:scale-95 disabled:opacity-60"
              >
                {renewing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Renewing…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" strokeWidth={3} />
                    Confirm Renewal
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
        <p className="text-xs text-muted-foreground">
          Renewal reactivates the same consulting account. All clients, employees, packages, posts, analytics, payment
          history, messages, and documents are preserved. No duplicate company is created.
        </p>
      </div>
    </div>
  );
}
