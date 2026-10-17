import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, MapPin, Briefcase, Users, DollarSign, Building2,
  Loader2, CheckCircle2, Send, Mail, Phone,
} from "lucide-react";

import { useSEO } from "@/hooks/use-seo";
import {
  fetchPublicVacancy,
  incrementVacancyViews,
  submitVacancyApplication,
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
} from "@/lib/vacancies";
import { toast } from "@/hooks/use-toast";

const springIn = { type: "spring" as const, stiffness: 260, damping: 26 };

function money(n: number | null, currency: string): string {
  if (!n) return "—";
  return `${n.toLocaleString()} ${currency}`;
}

export default function VacancyDetail() {
  const { vacancyId } = useParams<{ vacancyId: string }>();
  const navigate = useNavigate();

  useSEO({ title: "Job Vacancy | OXEN", description: "Open positions at travel & consulting agencies on OXEN." });

  const { data: vacancy, isLoading, error } = useQuery({
    queryKey: ["vacancy-public", vacancyId],
    queryFn: () => fetchPublicVacancy(vacancyId!),
    enabled: !!vacancyId,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (vacancyId) incrementVacancyViews(vacancyId);
  }, [vacancyId]);

  const [form, setForm] = useState({ fullName: "", email: "", phone: "", resumeUrl: "", coverNote: "" });
  const [submitted, setSubmitted] = useState(false);

  const applyMutation = useMutation({
    mutationFn: () =>
      submitVacancyApplication({
        vacancyId: vacancy!.id,
        companyId: vacancy!.consulting_company_id,
        fullName: form.fullName,
        email: form.email || null,
        phone: form.phone || null,
        resumeUrl: form.resumeUrl || null,
        coverNote: form.coverNote || null,
      }),
    onSuccess: ({ ok, error: err }) => {
      if (!ok) {
        toast({ title: "Failed to submit application", description: err ?? undefined, variant: "destructive" });
        return;
      }
      setSubmitted(true);
    },
    onError: () => toast({ title: "Failed to submit application", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !vacancy) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="font-display text-lg font-bold text-foreground">Vacancy not found</p>
        <p className="text-sm text-muted-foreground">This job posting may have been removed or closed.</p>
        <button onClick={() => navigate("/jobs")} className="gold-gradient rounded-full px-6 py-3 text-sm font-bold text-primary-foreground">
          Back to Jobs
        </button>
      </div>
    );
  }

  const company = vacancy.company;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-4">
      <button
        onClick={() => navigate("/jobs")}
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-card/50 backdrop-blur-xl border border-white/10 text-muted-foreground transition hover:bg-card/70 hover:text-foreground active:scale-90"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={springIn} className="glass rounded-3xl p-6">
        {company && (
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            {company.logo_url ? (
              <img src={company.logo_url} alt="" className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            {company.name}
          </div>
        )}
        <h1 className="font-display text-2xl font-extrabold text-foreground">{vacancy.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {EMPLOYMENT_TYPE_LABELS[vacancy.employment_type]}</span>
          {(vacancy.location_city || vacancy.location_country) && (
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {[vacancy.location_city, vacancy.location_country].filter(Boolean).join(", ")}</span>
          )}
          <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {vacancy.openings_count} opening{vacancy.openings_count > 1 ? "s" : ""}</span>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/15 px-4 py-3">
          <DollarSign className="h-4 w-4 text-amber-300" />
          <span className="font-display text-base font-bold text-amber-300">
            {vacancy.salary_is_negotiable && !vacancy.salary_min && !vacancy.salary_max
              ? "Negotiable"
              : vacancy.salary_min && vacancy.salary_max
                ? `${money(vacancy.salary_min, vacancy.currency)} – ${money(vacancy.salary_max, vacancy.currency)}`
                : money(vacancy.salary_min ?? vacancy.salary_max, vacancy.currency)}
          </span>
          <span className="text-xs text-muted-foreground">· {EXPERIENCE_LEVEL_LABELS[vacancy.experience_level]}</span>
        </div>

        <Section title="Description" body={vacancy.description} />
        <Section title="Requirements" body={vacancy.requirements} />
        <Section title="Responsibilities" body={vacancy.responsibilities} />
        <Section title="Benefits" body={vacancy.benefits} />

        {(vacancy.contact_email || vacancy.contact_phone) && (
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {vacancy.contact_email && <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> {vacancy.contact_email}</span>}
            {vacancy.contact_phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {vacancy.contact_phone}</span>}
          </div>
        )}
      </motion.div>

      {/* Apply form */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springIn, delay: 0.1 }} className="glass rounded-3xl p-6 mt-5">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <p className="font-display text-base font-bold text-foreground">Ariza yuborildi!</p>
            <p className="text-sm text-muted-foreground">Agentlik siz bilan tez orada bog'lanadi.</p>
          </div>
        ) : (
          <>
            <h2 className="font-display text-lg font-bold text-foreground mb-4">Shu lavozimga ariza qoldiring</h2>
            <div className="space-y-3">
              <input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="To'liq ism *"
                className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Telefon raqam"
                  className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Email"
                  className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <input
                value={form.resumeUrl}
                onChange={(e) => setForm((f) => ({ ...f, resumeUrl: e.target.value }))}
                placeholder="Rezyume/CV havolasi (ixtiyoriy)"
                className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <textarea
                value={form.coverNote}
                onChange={(e) => setForm((f) => ({ ...f, coverNote: e.target.value }))}
                placeholder="Qisqa xat (ixtiyoriy) — nega shu lavozimga mos kelasiz"
                rows={3}
                className="w-full resize-none rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <button
                onClick={() => applyMutation.mutate()}
                disabled={!form.fullName.trim() || applyMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
              >
                {applyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Ariza yuborish
              </button>
              <p className="text-center text-[11px] text-muted-foreground">Ariza qoldirish uchun ro'yxatdan o'tish shart emas.</p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <div className="mt-5">
      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{body}</p>
    </div>
  );
}
