import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  IdCard, Upload, FileText, Image as ImageIcon, Loader2, CheckCircle2,
  XCircle, AlertTriangle, CreditCard, Sparkles, Clock, FlaskConical,
  ExternalLink, ArrowRight,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/use-seo";
import { toast } from "@/hooks/use-toast";
import {
  uploadGreenCardDocs,
  createGreenCardCheck,
  simulateGreenCardPayment,
  runGreenCardAnalysis,
  fetchMyGreenCardChecks,
  type GreenCardCheck,
} from "@/lib/green-card";

const springIn = { type: "spring" as const, stiffness: 260, damping: 26 };

function statusLabel(c: GreenCardCheck): { label: string; color: string; icon: typeof Clock } {
  switch (c.status) {
    case "pending_payment":
      return { label: "To'lov kutilmoqda", color: "text-amber-400 bg-amber-500/15", icon: CreditCard };
    case "paid":
      return { label: "To'landi — navbatda", color: "text-sky-400 bg-sky-500/15", icon: Clock };
    case "processing":
      return { label: "Tekshirilmoqda…", color: "text-sky-400 bg-sky-500/15", icon: Loader2 };
    case "completed":
      return c.ai_eligible
        ? { label: "Shartlarga mos", color: "text-emerald-400 bg-emerald-500/15", icon: CheckCircle2 }
        : { label: "Mos emas", color: "text-rose-400 bg-rose-500/15", icon: XCircle };
    case "failed":
      return { label: "Xatolik", color: "text-rose-400 bg-rose-500/15", icon: AlertTriangle };
  }
}

export default function GreenCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  useSEO({ title: "Green Card tekshiruvi | OXEN", description: "AI yordamida Green Card (DV Lottery) rasm talablariga moslikni tekshiring." });

  const passportRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);

  const checksQ = useQuery({
    queryKey: ["my-green-card-checks", userId],
    queryFn: () => fetchMyGreenCardChecks(userId),
    enabled: !!userId,
    refetchInterval: (q) => (q.state.data?.some((c) => c.status === "processing" || c.status === "paid") ? 2500 : false),
  });
  const checks = checksQ.data ?? [];
  const activeCheck = checks.find((c) => c.id === activeCheckId) ?? null;

const submitMutation = useMutation({
    mutationFn: async (isTest: boolean) => {
      if (!passportFile || !photoFile) throw new Error("Pasport va rasm fayllarini tanlang");
      const { passportPath, photoPath, error: uploadErr } = await uploadGreenCardDocs(userId, passportFile, photoFile);
      if (uploadErr || !passportPath || !photoPath) throw new Error(uploadErr ?? "Yuklashda xatolik");

      const { check, error: createErr } = await createGreenCardCheck({
        userId,
        passportPath,
        photoPath,
        paymentAmount: isTest ? 0 : 3,
      });
      if (createErr || !check) throw new Error(createErr ?? "Tekshiruv yaratilmadi");

      await simulateGreenCardPayment(check.id);
      return check.id;
    },
    onSuccess: (checkId, isTest) => {
      toast(
        isTest
          ? { title: "Sinov tekshiruvi boshlandi", description: "To'lovsiz — faqat test uchun." }
          : { title: "To'lov qabul qilindi ($3)", description: "AI tekshiruvi boshlandi…" },
      );
      setActiveCheckId(checkId);
      setPassportFile(null);
      setPhotoFile(null);
      queryClient.invalidateQueries({ queryKey: ["my-green-card-checks", userId] });
      analyzeMutation.mutate(checkId);
    },
    onError: (err: Error) => toast({ title: "Xatolik", description: err.message, variant: "destructive" }),
  });

  const analyzeMutation = useMutation({
    mutationFn: (checkId: string) => runGreenCardAnalysis(checkId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["my-green-card-checks", userId] }),
  });

  // Keep polling until the active check leaves processing.
  useEffect(() => {
    if (!activeCheck || activeCheck.status !== "paid") return;
    const t = setTimeout(() => analyzeMutation.mutate(activeCheck.id), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCheck?.status, activeCheck?.id]);

  const canSubmit = !!passportFile && !!photoFile && !submitMutation.isPending;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <IdCard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-xl font-extrabold">Green Card tekshiruvi</h1>
          <p className="text-xs text-muted-foreground">AI yordamida DV Lottery rasm talablariga moslikni tekshiring</p>
        </div>
      </motion.div>

      {/* Official lottery result check — deep link, not automated (dvprogram.state.gov blocks bots) */}
      <motion.a
        href="https://dvprogram.state.gov/ESC"
        target="_blank"
        rel="noreferrer"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass mb-5 flex items-center gap-3 rounded-2xl p-4 transition hover:border-white/[0.12]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
          <ExternalLink className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Lotereya natijasini rasmiy saytda tekshirish</p>
          <p className="text-[11px] text-muted-foreground">dvprogram.state.gov — Confirmation Number kerak bo'ladi</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </motion.a>

      {/* Upload form */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={springIn} className="glass rounded-3xl p-5">
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/15 px-3.5 py-2.5 text-xs text-amber-200/90">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          Tekshiruv narxi: <span className="font-bold">$3</span> — natija bir necha soniyada tayyor bo'ladi.
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => passportRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-center transition hover:border-primary/40 hover:bg-white/[0.04]"
          >
            <FileText className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs font-semibold">{passportFile ? passportFile.name : "Pasport (PDF)"}</span>
            {!passportFile && <span className="text-[10px] text-muted-foreground">Bosing va tanlang</span>}
          </button>
          <input ref={passportRef} type="file" accept="application/pdf" hidden onChange={(e) => setPassportFile(e.target.files?.[0] ?? null)} />

          <button
            onClick={() => photoRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-center transition hover:border-primary/40 hover:bg-white/[0.04]"
          >
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs font-semibold">{photoFile ? photoFile.name : "Rasm (JPEG)"}</span>
            {!photoFile && <span className="text-[10px] text-muted-foreground">Bosing va tanlang</span>}
          </button>
          <input ref={photoRef} type="file" accept="image/jpeg" hidden onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
        </div>

        <button
          onClick={() => submitMutation.mutate(false)}
          disabled={!canSubmit}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient py-3 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
        >
          {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          $3 to'lab, tekshirishni boshlash
        </button>
        <button
          onClick={() => submitMutation.mutate(true)}
          disabled={!canSubmit}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-2.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Sinov tekshiruvi (to'lovsiz)
        </button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Fayllaringiz xavfsiz, shaxsiy saqlashda — faqat siz va OXEN administratsiyasi ko'ra oladi.
        </p>
      </motion.div>

      {/* Results history */}
      {checks.length > 0 && (
        <div className="mt-6 space-y-2.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Tekshiruvlar tarixi</h2>
          {checks.map((c, i) => {
            const s = statusLabel(c);
            const Icon = s.icon;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, ...springIn }}
                className="glass rounded-2xl p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${s.color}`}>
                    <Icon className={`h-3 w-3 ${c.status === "processing" ? "animate-spin" : ""}`} /> {s.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                {c.status === "completed" && c.ai_summary && (
                  <p className="mt-2.5 text-sm text-foreground/90">{c.ai_summary}</p>
                )}
                {c.status === "completed" && c.ai_issues?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {c.ai_issues.map((issue, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-rose-400" /> {issue}
                      </li>
                    ))}
                  </ul>
                )}
                {c.status === "failed" && c.error_message && (
                  <p className="mt-2.5 text-xs text-rose-400">{c.error_message}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
