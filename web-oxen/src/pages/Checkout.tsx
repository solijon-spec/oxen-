import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Loader2,
  Phone,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import {
  CONSULTING_PLANS,
  computeEndDate,
  createConsultingAccount,
  getPlan,
  type SubscriptionPlan,
} from "@/lib/consulting";
import {
  detectBrand,
  maskCard,
  OTP_RESEND_SECONDS,
  sendOtp,
  TEST_OTP,
  tokenizeCard,
  verifyOtp,
  type OtpSession,
  type TokenizedCard,
} from "@/lib/payment";
import { useAuth } from "@/contexts/AuthContext";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import { Field, SelectField } from "@/components/consulting/Field";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

const VALID_PLANS: SubscriptionPlan[] = ["monthly", "quarterly", "annual"];

// Country list derived from the existing COUNTRIES dataset.
import { COUNTRIES } from "@/data/countries";
const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.name, label: c.name })).sort((a, b) =>
  a.label.localeCompare(b.label),
);

// ── Form state types ────────────────────────────────────────
interface CompanyForm {
  name: string;
  legalName: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  managerFullName: string;
  managerPhone: string;
  managerEmail: string;
  description: string;
  logoDataUrl: string | null;
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

const EMPTY_COMPANY: CompanyForm = {
  name: "",
  legalName: "",
  country: "",
  city: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  managerFullName: "",
  managerPhone: "",
  managerEmail: "",
  description: "",
  logoDataUrl: null,
};

const EMPTY_CARD: CardForm = {
  cardholder: "",
  number: "",
  exp: "",
  cvv: "",
  billingAddress: "",
  billingCity: "",
  billingPostal: "",
};

// ── Helpers ─────────────────────────────────────────────────
function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExp(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s()-]{6,}$/;

// ── Step indicator ──────────────────────────────────────────
const STEPS = ["Company", "Payment", "Verify", "Confirm"] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2 sm:gap-3">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition",
                  done && "bg-primary text-primary-foreground",
                  active && "bg-primary text-primary-foreground ring-2 ring-primary/40",
                  !done && !active && "bg-white/[0.06] text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-semibold sm:inline",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={cn("h-px w-5 sm:w-8", done ? "bg-primary" : "bg-white/[0.08]")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TestModeBanner({ icon: Icon = AlertCircle, children }: { icon?: typeof AlertCircle; children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <p className="text-xs text-amber-200/90">{children}</p>
    </div>
  );
}

// ============================================================
//  Checkout — 4-step test-mode flow
// ============================================================
export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();

  const rawPlan = params.get("plan") as SubscriptionPlan | null;
  const planId: SubscriptionPlan = VALID_PLANS.includes(rawPlan!) ? rawPlan! : "quarterly";
  const plan = useMemo(() => getPlan(planId), [planId]);

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [company, setCompany] = useState<CompanyForm>(EMPTY_COMPANY);
  const [companyErrors, setCompanyErrors] = useState<Partial<Record<keyof CompanyForm, string>>>({});
  const [card, setCard] = useState<CardForm>(EMPTY_CARD);
  const [cardError, setCardError] = useState<string | null>(null);
  const [tokenizing, setTokenizing] = useState(false);
  const [tokenized, setTokenized] = useState<TokenizedCard | null>(null);

  // OTP
  const [otpSession, setOtpSession] = useState<OtpSession | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  // Confirmation
  const [agreedFinal, setAgreedFinal] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useSEO({
    title: `Checkout — ${plan.name} | OXEN Consulting`,
    description: "Complete your OXEN Consulting subscription (test mode).",
  });

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // ── Validation: Step 1 ────────────────────────────────────
  const validateCompany = useCallback((): boolean => {
    const e: Partial<Record<keyof CompanyForm, string>> = {};
    if (!company.name.trim()) e.name = "Company name is required.";
    if (!company.legalName.trim()) e.legalName = "Legal company name is required.";
    if (!company.country) e.country = "Select a country.";
    if (!company.city.trim()) e.city = "City is required.";
    if (!company.address.trim()) e.address = "Office address is required.";
    if (!company.phone.trim()) e.phone = "Company phone is required.";
    else if (!PHONE_RE.test(company.phone.trim())) e.phone = "Enter a valid phone number.";
    if (!company.email.trim()) e.email = "Company email is required.";
    else if (!EMAIL_RE.test(company.email.trim())) e.email = "Enter a valid email.";
    if (company.website.trim() && !/^https?:\/\//i.test(company.website.trim()))
      e.website = "Website must start with http:// or https://";
    if (!company.managerFullName.trim()) e.managerFullName = "Manager full name is required.";
    if (!company.managerPhone.trim()) e.managerPhone = "Manager phone is required.";
    else if (!PHONE_RE.test(company.managerPhone.trim())) e.managerPhone = "Enter a valid phone number.";
    if (!company.managerEmail.trim()) e.managerEmail = "Manager email is required.";
    else if (!EMAIL_RE.test(company.managerEmail.trim())) e.managerEmail = "Enter a valid email.";
    if (!company.description.trim()) e.description = "Short description is required.";
    setCompanyErrors(e);
    return Object.keys(e).length === 0;
  }, [company]);

  // ── Step 1 → 2: tokenize card ─────────────────────────────
  const handleStepOneNext = useCallback(() => {
    if (!validateCompany()) {
      toast({ title: "Please fix the highlighted fields", variant: "destructive" });
      return;
    }
    setStep(1);
  }, [validateCompany]);

  // ── Step 2 → 3: tokenize + send OTP ───────────────────────
  const handleStepTwoNext = useCallback(async () => {
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
        billingCountry: company.country,
        billingAddress: card.billingAddress,
      });
      setTokenized(tok);

      // Send OTP to manager phone
      setSendingOtp(true);
      const session = await sendOtp(company.managerPhone);
      setOtpSession(session);
      setOtpCode("");
      setOtpError(null);
      setResendIn(OTP_RESEND_SECONDS);
      setStep(2);
    } catch (err) {
      setCardError(err instanceof Error ? err.message : "Card validation failed.");
    } finally {
      setTokenizing(false);
      setSendingOtp(false);
    }
  }, [card, company]);

  // ── Resend OTP ────────────────────────────────────────────
  const handleResendOtp = useCallback(async () => {
    if (resendIn > 0 || !company.managerPhone) return;
    setSendingOtp(true);
    setOtpError(null);
    try {
      const session = await sendOtp(company.managerPhone);
      setOtpSession(session);
      setOtpCode("");
      setResendIn(OTP_RESEND_SECONDS);
    } finally {
      setSendingOtp(false);
    }
  }, [resendIn, company.managerPhone]);

  // ── Step 3 → 4: verify OTP ────────────────────────────────
  const handleVerifyOtp = useCallback(async () => {
    if (!otpSession) return;
    setOtpError(null);
    setVerifying(true);
    try {
      const res = await verifyOtp(otpSession, otpCode);
      if (!res.ok) {
        const reason = (res as { ok: false; reason: "incorrect" | "expired" }).reason;
        setOtpError(reason === "expired" ? "Code expired. Request a new one." : "Incorrect code. Try again.");
        return;
      }
      setStep(3);
    } finally {
      setVerifying(false);
    }
  }, [otpSession, otpCode]);

  // ── Step 4: confirm → create account → redirect ───────────
  const { renewSubscription } = useConsulting();
  const handleConfirm = useCallback(async () => {
    if (!agreedFinal || !tokenized) return;
    if (user?.isGuest) {
      navigate(`/auth?redirect=${encodeURIComponent(`/consulting/checkout?plan=${planId}`)}`);
      return;
    }
    setConfirming(true);
    try {
      const startDate = new Date();
      const endDate = computeEndDate(startDate, planId);

      // Try real account creation first. If Supabase tables aren't applied yet,
      // fall back to test-mode (localStorage snapshot) so the dashboard still works.
      let realCreated = false;
      try {
        const result = await createConsultingAccount({
          ownerId: user!.id,
          company: {
            owner_id: user!.id,
            name: company.name,
            legal_name: company.legalName,
            country: company.country,
            city: company.city,
            address: company.address,
            logo_url: company.logoDataUrl,
            description: company.description,
            contact_email: company.email,
            contact_phone: company.phone,
            website: company.website || undefined,
            manager_full_name: company.managerFullName,
            manager_phone: company.managerPhone,
            manager_email: company.managerEmail,
          },
          subscription: {
            consulting_company_id: "",
            plan: planId,
            status: "active",
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            amount: plan.price,
            payment_method_id: tokenized.paymentMethodId,
            payment_customer_id: tokenized.customerId,
            card_brand: tokenized.brand,
            card_last4: tokenized.last4,
            card_exp_month: tokenized.expMonth,
            card_exp_year: tokenized.expYear,
            created_by: user!.id,
          },
        });
        realCreated = !!result.company;
      } catch (err) {
        console.warn("createConsultingAccount failed, falling back to test mode:", err);
      }

      // Always persist the onboarding snapshot (used by both the success page
      // and the test-mode fallback in ConsultingContext when real creation fails).
      const snapshot = {
        plan: planId,
        planName: plan.name,
        price: plan.price,
        months: plan.months,
        company: {
          name: company.name,
          legalName: company.legalName,
          country: company.country,
          city: company.city,
          address: company.address,
          phone: company.phone,
          email: company.email,
          website: company.website || null,
          managerFullName: company.managerFullName,
          managerPhone: company.managerPhone,
          managerEmail: company.managerEmail,
          description: company.description,
          logoDataUrl: company.logoDataUrl,
        },
        card: {
          brand: tokenized.brand,
          last4: tokenized.last4,
          masked: tokenized.masked,
          expMonth: tokenized.expMonth,
          expYear: tokenized.expYear,
          paymentMethodId: tokenized.paymentMethodId,
          customerId: tokenized.customerId,
        },
        createdAt: startDate.toISOString(),
        endDate: endDate.toISOString(),
        testMode: !realCreated,
      };
      localStorage.setItem("oxen.consulting.onboarding", JSON.stringify(snapshot));

      // Also seed the test-mode subscription state so simulateExpiration works.
      if (!realCreated) {
        try {
          localStorage.setItem(
            "oxen.consulting.test.subscription",
            JSON.stringify({
              status: "active",
              plan: planId,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              amount: plan.price,
              cardBrand: tokenized.brand,
              cardLast4: tokenized.last4,
              cardMasked: tokenized.masked,
              history: [
                {
                  id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  date: startDate.toISOString(),
                  plan: planId,
                  amount: plan.price,
                  cardMasked: tokenized.masked,
                  type: "subscription",
                },
              ],
            }),
          );
        } catch {
          /* ignore */
        }
      }

      toast({
        title: realCreated
          ? "Your consulting company account has been activated successfully."
          : "Test-mode onboarding saved. Dashboard is ready.",
      });

      navigate("/consulting/setup-success");
    } finally {
      setConfirming(false);
    }
  }, [agreedFinal, tokenized, user, planId, plan, company, navigate, renewSubscription]);

  // ── Logo upload ───────────────────────────────────────────
  const logoInputRef = useRef<HTMLInputElement>(null);
  const handleLogoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Logo too large (max 2MB)", variant: "destructive" });
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCompany((c) => ({ ...c, logoDataUrl: dataUrl }));
    } catch {
      toast({ title: "Could not read logo file", variant: "destructive" });
    }
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 pb-16 sm:px-5">
      {/* Back to plans */}
      <button
        onClick={() => navigate("/explore")}
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to plans
      </button>

      <StepIndicator current={step} />

      <AnimatePresence mode="wait">
        {/* ────────── STEP 1 — Company Information ────────── */}
        {step === 0 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={springIn}
            className="glass rounded-3xl p-6 sm:p-8"
          >
            <div className="mb-5 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" strokeWidth={2.2} />
              <h1 className="font-display text-xl font-bold sm:text-2xl">Company Information</h1>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Consulting company name"
                value={company.name}
                onChange={(v) => setCompany((c) => ({ ...c, name: v }))}
                placeholder="Global Visa Consulting"
                required
                error={companyErrors.name}
              />
              <Field
                label="Legal company name"
                value={company.legalName}
                onChange={(v) => setCompany((c) => ({ ...c, legalName: v }))}
                placeholder="Global Visa Consulting LLC"
                required
                error={companyErrors.legalName}
              />
              <SelectField
                label="Country"
                value={company.country}
                onChange={(v) => setCompany((c) => ({ ...c, country: v }))}
                options={[{ value: "", label: "Select country…" }, ...COUNTRY_OPTIONS]}
                required
                error={companyErrors.country}
              />
              <Field
                label="City"
                value={company.city}
                onChange={(v) => setCompany((c) => ({ ...c, city: v }))}
                placeholder="Tashkent"
                required
                error={companyErrors.city}
              />
              <Field
                label="Office address"
                value={company.address}
                onChange={(v) => setCompany((c) => ({ ...c, address: v }))}
                placeholder="123 Main Street"
                required
                error={companyErrors.address}
                className="sm:col-span-2"
              />
              <Field
                label="Company phone number"
                value={company.phone}
                onChange={(v) => setCompany((c) => ({ ...c, phone: v }))}
                type="tel"
                placeholder="+998 90 123 45 67"
                required
                error={companyErrors.phone}
                autoComplete="tel"
              />
              <Field
                label="Company email"
                value={company.email}
                onChange={(v) => setCompany((c) => ({ ...c, email: v }))}
                type="email"
                placeholder="info@globalvisa.com"
                required
                error={companyErrors.email}
                autoComplete="email"
              />
              <Field
                label="Website"
                value={company.website}
                onChange={(v) => setCompany((c) => ({ ...c, website: v }))}
                type="url"
                placeholder="https://globalvisa.com (optional)"
                error={companyErrors.website}
                className="sm:col-span-2"
              />
              <Field
                label="Manager full name"
                value={company.managerFullName}
                onChange={(v) => setCompany((c) => ({ ...c, managerFullName: v }))}
                placeholder="John Doe"
                required
                error={companyErrors.managerFullName}
                autoComplete="name"
              />
              <Field
                label="Manager phone number"
                value={company.managerPhone}
                onChange={(v) => setCompany((c) => ({ ...c, managerPhone: v }))}
                type="tel"
                placeholder="+998 90 123 45 67"
                required
                error={companyErrors.managerPhone}
                autoComplete="tel"
              />
              <Field
                label="Manager email"
                value={company.managerEmail}
                onChange={(v) => setCompany((c) => ({ ...c, managerEmail: v }))}
                type="email"
                placeholder="manager@globalvisa.com"
                required
                error={companyErrors.managerEmail}
                autoComplete="email"
                className="sm:col-span-2"
              />
              <Field
                label="Short company description"
                value={company.description}
                onChange={(v) => setCompany((c) => ({ ...c, description: v }))}
                type="textarea"
                placeholder="Briefly describe your consulting services, expertise, and destinations you cover."
                required
                error={companyErrors.description}
                className="sm:col-span-2"
              />

              {/* Logo upload */}
              <div className="sm:col-span-2">
                <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  Company logo <span className="text-muted-foreground/60">(optional, max 2MB)</span>
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                    {company.logoDataUrl ? (
                      <img src={company.logoDataUrl} alt="Logo preview" className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-white/[0.1]"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload logo
                    </button>
                    {company.logoDataUrl && (
                      <button
                        type="button"
                        onClick={() => setCompany((c) => ({ ...c, logoDataUrl: null }))}
                        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition hover:text-destructive"
                      >
                        <X className="h-3 w-3" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-7 flex justify-end">
              <button
                onClick={handleStepOneNext}
                className="gold-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-95"
              >
                Continue to payment
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ────────── STEP 2 — Test Payment Card ────────── */}
        {step === 1 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={springIn}
            className="glass rounded-3xl p-6 sm:p-8"
          >
            <div className="mb-5 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" strokeWidth={2.2} />
              <h1 className="font-display text-xl font-bold sm:text-2xl">Payment Card</h1>
            </div>

            <TestModeBanner>
              <strong>Test Mode — No real money will be charged.</strong> Use test card{" "}
              <span className="font-mono font-bold">4242 4242 4242 4242</span>, any future expiration, any CVV.
            </TestModeBanner>

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
                    className={cn(
                      "w-full rounded-xl border bg-background/50 px-3.5 py-2.5 text-sm tracking-wider text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40",
                      cardError && !card.cardholder ? "border-input" : "border-input",
                    )}
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

              {/* Billing address */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground/70">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Billing address
                </p>
                <div className="grid gap-3">
                  <Field
                    label="Street address"
                    value={card.billingAddress}
                    onChange={(v) => setCard((c) => ({ ...c, billingAddress: v }))}
                    placeholder="123 Main Street"
                    required
                    autoComplete="address-line1"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="City"
                      value={card.billingCity}
                      onChange={(v) => setCard((c) => ({ ...c, billingCity: v }))}
                      placeholder="Tashkent"
                      required
                      autoComplete="address-level2"
                    />
                    <Field
                      label="Postal code"
                      value={card.billingPostal}
                      onChange={(v) => setCard((c) => ({ ...c, billingPostal: v }))}
                      placeholder="100000"
                      autoComplete="postal-code"
                    />
                  </div>
                  <div className="rounded-xl bg-white/[0.03] px-3 py-2 text-[11px] text-muted-foreground">
                    Country: <span className="font-semibold text-foreground/70">{company.country || "—"}</span>
                  </div>
                </div>
              </div>

              {cardError && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {cardError}
                </p>
              )}

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-[11px] text-muted-foreground">
                <p className="font-semibold text-foreground/70">Test card details</p>
                <p className="mt-1">Number: <span className="font-mono">4242 4242 4242 4242</span></p>
                <p>Expiration: any future date (e.g. 12/30)</p>
                <p>CVV: any 3 digits (e.g. 123)</p>
              </div>
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
                onClick={handleStepTwoNext}
                disabled={tokenizing || sendingOtp}
                className="gold-gradient inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-95 disabled:opacity-60"
              >
                {tokenizing || sendingOtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {sendingOtp ? "Sending code…" : "Verifying card…"}
                  </>
                ) : (
                  <>
                    Continue to verification
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ────────── STEP 3 — Test OTP ────────── */}
        {step === 2 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={springIn}
            className="glass rounded-3xl p-6 sm:p-8"
          >
            <div className="mb-5 flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" strokeWidth={2.2} />
              <h1 className="font-display text-xl font-bold sm:text-2xl">Phone Verification</h1>
            </div>

            <TestModeBanner icon={ShieldCheck}>
              <strong>Test Mode OTP.</strong> A code was "sent" to{" "}
              <span className="font-semibold">{company.managerPhone}</span>. Use test code{" "}
              <span className="font-mono font-bold">{TEST_OTP}</span>.
            </TestModeBanner>

            <p className="mb-5 text-sm text-muted-foreground">
              Enter the 6-digit verification code we sent to your manager phone.
            </p>

            <div className="mb-5 flex justify-center">
              <input
                inputMode="numeric"
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setOtpError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && otpCode.length === 6 && handleVerifyOtp()}
                placeholder="••••••"
                autoFocus
                className="w-48 rounded-2xl border border-input bg-background/50 px-3 py-3 text-center text-2xl font-bold tracking-[0.5em] text-foreground placeholder:tracking-[0.3em] placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            {otpError && (
              <p className="mb-4 flex items-center justify-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                {otpError}
              </p>
            )}

            <div className="mb-2 flex justify-center">
              <button
                onClick={handleResendOtp}
                disabled={resendIn > 0 || sendingOtp}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:opacity-80 disabled:opacity-40"
              >
                <RefreshCw className={cn("h-3 w-3", sendingOtp && "animate-spin")} />
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                onClick={() => {
                  setStep(1);
                  setOtpError(null);
                  setOtpCode("");
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/[0.06] px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-white/[0.1]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={otpCode.length !== 6 || verifying}
                className="gold-gradient inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-95 disabled:opacity-60"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    Verify code
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ────────── STEP 4 — Confirmation ────────── */}
        {step === 3 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={springIn}
            className="glass rounded-3xl p-6 sm:p-8"
          >
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" strokeWidth={2.2} />
              <h1 className="font-display text-xl font-bold sm:text-2xl">Confirm your subscription</h1>
            </div>

            <TestModeBanner>
              <strong>Test Mode — No real money will be charged.</strong> Confirming creates a test consulting
              onboarding record only.
            </TestModeBanner>

            <div className="space-y-4">
              {/* Plan */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Selected plan</p>
                    <p className="mt-0.5 font-display text-lg font-bold text-foreground">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {plan.months} month{plan.months > 1 ? "s" : ""} {plan.savingsLabel && `· ${plan.savingsLabel}`}
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

              {/* Company */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Company</p>
                <p className="mt-0.5 font-display text-sm font-bold text-foreground">{company.name}</p>
                <p className="text-xs text-muted-foreground">
                  {company.city}, {company.country}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Manager: {company.managerFullName}</p>
              </div>

              {/* Card */}
              {tokenized && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Payment method</p>
                  <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="capitalize">{tokenized.brand}</span>
                    <span className="font-mono">{tokenized.masked}</span>
                    <span className="text-muted-foreground">· {tokenized.expMonth}/{tokenized.expYear}</span>
                  </p>
                </div>
              )}

              {/* Total + duration */}
              <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/[0.04] p-4">
                <div>
                  <span className="block text-sm font-semibold text-foreground">Total due today</span>
                  <span className="text-[11px] text-muted-foreground">
                    {plan.months} month{plan.months > 1 ? "s" : ""} subscription
                  </span>
                </div>
                <span className="font-display text-2xl font-extrabold text-primary">
                  ${plan.price.toLocaleString()}
                  <span className="ml-1 text-sm font-medium text-muted-foreground">USD</span>
                </span>
              </div>

              {/* Terms */}
              <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <input
                  type="checkbox"
                  checked={agreedFinal}
                  onChange={(e) => setAgreedFinal(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-xs text-muted-foreground">
                  I agree to the OXEN Consulting{" "}
                  <span className="font-semibold text-primary">Terms & Conditions</span>, including the subscription
                  auto-renewal policy and acceptable use guidelines. I understand this is a{" "}
                  <strong className="text-amber-300">test-mode</strong> transaction — no real charge will be made.
                </span>
              </label>
            </div>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/[0.06] px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-white/[0.1]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={!agreedFinal || confirming}
                className="gold-gradient inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition active:scale-95 disabled:opacity-60"
              >
                {confirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" strokeWidth={3} />
                    Confirm & continue
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan switcher */}
      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Selected plan:{" "}
        {CONSULTING_PLANS.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/consulting/checkout?plan=${p.id}`)}
            className={cn(
              "mx-1 font-semibold transition hover:opacity-80",
              p.id === planId ? "text-primary" : "text-muted-foreground",
            )}
          >
            {p.name}
          </button>
        ))}
      </p>
    </div>
  );
}
