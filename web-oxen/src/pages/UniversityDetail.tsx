import { motion } from "framer-motion";
import {
  ArrowLeft,
  GraduationCap,
  Award,
  Coins,
  Calendar,
  Percent,
  Users,
  Building2,
  MapPin,
  ExternalLink,
  Heart,
  Share2,
  Bookmark,
  CheckCircle2,
  Star,
  Phone,
  Mail,
  Globe2,
  Play,
  FileText,
  Clock,
  Languages,
  Home,
  Briefcase,
  Trophy,
  X,
  ChevronRight,
  Sparkles,
  Send,
  Plane,
} from "lucide-react";
import { useCallback, useMemo, useState, Suspense, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { useLanguage } from "@/contexts/LanguageContext";
import { useUniversity } from "@/contexts/UniversityContext";
import { getUniversity, type Program, type UniversityVideo } from "@/data/universities";
import { OptimizedImage } from "@/components/OptimizedImage";
import VideoPlayer from "@/components/VideoPlayer";
import { cn } from "@/lib/utils";

const SAMPLE_MAP_TILE = "https://images.unsplash.com/photo-1524661135-423c5e6c2138?w=800&h=400&fit=crop";

/* ── FAQ data ─────────────────────────────────────────────────────── */

const FAQS = [
  { q: "What are the application requirements?", a: "You need a completed application form, transcripts, recommendation letters, a motivation letter, and proof of language proficiency (IELTS/TOEFL)." },
  { q: "When is the application deadline?", a: "Deadlines vary by program. Most undergraduate programs have deadlines in January, while graduate programs may have rolling admissions." },
  { q: "Are scholarships available for international students?", a: "Yes, many universities offer merit-based and need-based scholarships specifically for international students. Check the university's financial aid page." },
  { q: "Can I work while studying?", a: "Most countries allow international students to work part-time during their studies. Check the specific visa regulations for your destination country." },
  { q: "Is on-campus housing guaranteed?", a: "Housing availability varies by university. Many guarantee housing for first-year students. Check the accommodation section for details." },
];

/* ── Section wrapper ──────────────────────────────────────────────── */

function Section({ title, icon: Icon, children, className }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className={cn("px-5 pt-6", className)}
    >
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

/* ── Program card ─────────────────────────────────────────────────── */

function ProgramCard({ program, index }: { program: Program; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      className="glass rounded-2xl p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold">{program.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{program.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
          {program.degree}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {program.duration}</span>
        <span className="flex items-center gap-1"><Coins className="h-3 w-3" /> {program.tuition}</span>
        <span className="flex items-center gap-1"><Languages className="h-3 w-3" /> {program.language}</span>
      </div>
    </motion.div>
  );
}

/* ── Required document checklist item ─────────────────────────────── */

function DocumentChecklistItem({ name, status }: { name: string; status: string }) {
  const statusConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
    completed: { color: "text-green-400 bg-green-500/10 border-green-500/20", icon: CheckCircle2 },
    pending: { color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: Clock },
    optional: { color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: Star },
    required: { color: "text-rose-400 bg-rose-500/10 border-rose-500/20", icon: FileText },
  };
  const config = statusConfig[status] ?? statusConfig.required;
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      className={cn("flex items-center gap-3 rounded-xl border px-4 py-3", config.color)}
    >
      <StatusIcon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-sm font-medium">{name}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider">{status}</span>
    </motion.div>
  );
}

/* ── Video card ───────────────────────────────────────────────────── */

function VideoCard({ video, index }: { video: UniversityVideo; index: number }) {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.06 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowVideo(true)}
        className="group relative overflow-hidden rounded-2xl"
      >
        <div className="relative h-[160px] w-full overflow-hidden">
          <OptimizedImage
            src={video.thumbnail}
            alt={video.title}
            placeholderType="video"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition group-hover:scale-110">
            <Play className="h-4 w-4 fill-white text-white ml-0.5" strokeWidth={0} />
          </div>
          <p className="absolute bottom-0 left-0 right-0 p-3 text-xs font-bold text-white">{video.title}</p>
        </div>
      </motion.button>

      {showVideo && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md"
            onClick={() => setShowVideo(false)}
          >
            <button
              onClick={() => setShowVideo(false)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 26 }}
              className="w-full max-w-2xl px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <VideoPlayer src={video.url} poster={video.thumbnail} autoPlay className="aspect-video w-full" />
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

/* ── Living Cost Calculator ─────────────────────────────────────── */

function LivingCostCalculator({ tuition, livingCost }: { tuition: number; livingCost: string }) {
  const { t } = useLanguage();
  const [accommodation, setAccommodation] = useState<number>(800);
  const [food, setFood] = useState<number>(400);
  const [transport, setTransport] = useState<number>(150);
  const [misc, setMisc] = useState<number>(300);

  const monthlyTotal = accommodation + food + transport + misc;
  const yearlyTotal = monthlyTotal * 12 + tuition;

  const sliderClass = "w-full accent-blue-500";

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("uni.accommodation", "Accommodation")}</span>
          <span className="font-semibold">${accommodation}/mo</span>
        </div>
        <input type="range" min={200} max={2500} step={50} value={accommodation} onChange={(e) => setAccommodation(Number(e.target.value))} className={sliderClass} />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("uni.food", "Food")}</span>
          <span className="font-semibold">${food}/mo</span>
        </div>
        <input type="range" min={150} max={800} step={25} value={food} onChange={(e) => setFood(Number(e.target.value))} className={sliderClass} />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("uni.transport", "Transport")}</span>
          <span className="font-semibold">${transport}/mo</span>
        </div>
        <input type="range" min={50} max={400} step={25} value={transport} onChange={(e) => setTransport(Number(e.target.value))} className={sliderClass} />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("uni.miscellaneous", "Miscellaneous")}</span>
          <span className="font-semibold">${misc}/mo</span>
        </div>
        <input type="range" min={100} max={800} step={50} value={misc} onChange={(e) => setMisc(Number(e.target.value))} className={sliderClass} />
      </div>
      <div className="border-t border-white/5 pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("uni.monthlyTotal", "Monthly Total")}</span>
          <span className="font-bold text-primary">${monthlyTotal.toLocaleString()}/mo</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("uni.yearlyTotal", "Yearly Total (incl. tuition)")}</span>
          <span className="font-display text-lg font-bold text-primary">${yearlyTotal.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

/* ── AI Chat Widget for university-specific questions ────────────── */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function AIChatWidget({ university }: { university: NonNullable<ReturnType<typeof getUniversity>> }) {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const TOOLKIT_URL2 = import.meta.env.EXPO_PUBLIC_TOOLKIT_URL ?? "https://toolkit.rork.com";
      const TOOLKIT_KEY2 = import.meta.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY ?? "";

      const systemPrompt = `You are an AI admissions assistant for ${university.name} in ${university.city}, ${university.country}.
You help students with questions about admissions, programs, tuition, scholarships, deadlines, campus life, and requirements.
University details: QS Ranking #${university.qsRanking}, Tuition ${university.tuition}, Acceptance Rate ${university.acceptanceRate}%, IELTS ${university.ieltsRequirement}, TOEFL ${university.toeflRequirement}, Deadline ${university.deadline}, Type ${university.type}, Language ${university.language}.
Respond in the language code "${language}". Be helpful, concise, and accurate. Maximum 3 sentences.`;

      const res = await fetch(`${TOOLKIT_URL2}/v2/vercel/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOOLKIT_KEY2}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "anthropic/claude-haiku-4.5",
          temperature: 0.6,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMsg.content },
          ],
        }),
      });

      if (!res.ok) throw new Error("AI request failed");
      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content ?? t("uni.aiError", "Sorry, I couldn't process your request.");
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t("uni.aiError", "Sorry, I couldn't process your request. Please try again.") }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, university, language, t]);

  return (
    <div className="glass rounded-2xl p-4">
      <div ref={scrollRef} className="mb-3 max-h-60 space-y-2 overflow-y-auto no-scrollbar">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {t("uni.aiChatHint", "Ask me anything about admissions, programs, tuition, or campus life at")} {university.name}
          </p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                msg.role === "user" ? "bg-blue-500/20 text-white" : "bg-white/[0.05] text-white/80",
              )}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white/[0.05] px-3 py-2 text-xs text-white/40">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder={t("uni.askQuestion", "Ask a question...")}
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/40"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white transition active:scale-90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Main University Detail page ──────────────────────────────────── */

export default function UniversityDetail() {
  const { universityId = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isWishlisted, toggleWishlist, isInCompare, toggleCompare } = useUniversity();

  const university = getUniversity(universityId);
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: university?.name, text: university?.shortDescription }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`Check out ${university?.name} on OXEN!`);
      toast.success(t("uni.linkCopied", "Link copied to clipboard"));
    }
  }, [university, t]);

  const handleOfficialApply = useCallback(() => {
    if (university) {
      window.open(university.officialApplicationLink, "_blank", "noopener,noreferrer");
    }
  }, [university]);

  const handleVisitWebsite = useCallback(() => {
    if (university) {
      window.open(university.website, "_blank", "noopener,noreferrer");
    }
  }, [university]);

  if (!university) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">🎓</div>
        <p className="text-muted-foreground">{t("uni.notFound", "We couldn't find that university.")}</p>
        <button onClick={() => navigate("/universities")} className="gold-gradient rounded-full px-5 py-2.5 text-sm font-bold text-primary-foreground">
          {t("uni.backToUniversities", "Back to Universities")}
        </button>
      </div>
    );
  }

  const wishlisted = isWishlisted(university.id);
  const inCompare = isInCompare(university.id);

  const allPrograms = [
    ...university.bachelorPrograms,
    ...university.masterPrograms,
    ...university.phdPrograms,
  ];

  const facts = [
    { icon: Trophy, label: t("uni.qsRanking", "QS Ranking"), value: `#${university.qsRanking}` },
    { icon: Award, label: t("uni.worldRanking", "World Ranking"), value: `#${university.worldRanking}` },
    { icon: Coins, label: t("uni.tuition", "Tuition"), value: university.tuition },
    { icon: Percent, label: t("uni.acceptanceRate", "Acceptance Rate"), value: `${university.acceptanceRate}%` },
    { icon: Users, label: t("uni.students", "Students"), value: university.studentsCount >= 1000 ? `${(university.studentsCount / 1000).toFixed(0)}K` : String(university.studentsCount) },
    { icon: Building2, label: t("uni.campusSize", "Campus Size"), value: university.campusSize },
    { icon: Calendar, label: t("uni.deadline", "Deadline"), value: university.deadline },
    { icon: Briefcase, label: t("uni.employmentRate", "Employment"), value: `${university.employmentRate}%` },
  ];

  return (
    <div className="relative pb-8">
      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <section className="relative h-[42vh] min-h-[280px] overflow-hidden">
        <OptimizedImage
          src={university.coverImage}
          alt={university.name}
          placeholderType="university"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate("/universities")}
          className="absolute left-5 z-10 flex items-center gap-1 rounded-full bg-black/40 px-3 py-2 text-sm text-white backdrop-blur-md transition hover:bg-black/60 active:scale-95"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
        >
          <ArrowLeft className="h-4 w-4" /> {t("uni.back", "Back")}
        </button>

        {/* Share + Save */}
        <div className="absolute right-5 z-10 flex gap-2" style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}>
          <button
            onClick={handleShare}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60 active:scale-90"
            aria-label="Share"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleWishlist(university.id)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90",
              wishlisted ? "bg-rose-500/30 text-rose-400" : "bg-black/40 text-white hover:bg-black/60",
            )}
            aria-label="Save"
          >
            <Heart className={cn("h-4 w-4", wishlisted && "fill-rose-400")} />
          </button>
        </div>
      </section>

      {/* ── Header info ──────────────────────────────────────────── */}
      <section className="relative -mt-16 px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <OptimizedImage
            src={university.logo}
            alt={university.name}
            placeholderType="university"
            className="h-20 w-20 rounded-2xl object-cover shadow-2xl ring-2 ring-white/10"
          />
          <span className="mt-3 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {university.flag} {university.city}, {university.country}
          </span>
          <h1 className="mt-2 font-display text-3xl font-extrabold">{university.name}</h1>
          <p className="mt-1 text-sm font-medium text-primary/90">{university.shortDescription}</p>

          {university.hasScholarship && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400">
              <Award className="h-3.5 w-3.5" /> {t("uni.scholarshipAvailable", "Scholarship Available")}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex gap-3">
            <button
              onClick={handleOfficialApply}
              className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition active:scale-95"
            >
              <GraduationCap className="h-4 w-4" />
              {t("uni.applyOnOfficialWebsite", "Apply on Official Website")}
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => toggleCompare(university.id)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-5 py-3.5 text-sm font-bold transition active:scale-95",
                inCompare
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                  : "glass text-foreground hover:border-primary/40",
              )}
            >
              <CheckCircle2 className={cn("h-4 w-4", inCompare && "fill-blue-400")} />
              {t("uni.compare", "Compare")}
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── Facts grid ───────────────────────────────────────────── */}
      <Section title={t("uni.keyFacts", "Key Facts")} icon={Award}>
        <div className="grid grid-cols-2 gap-3">
          {facts.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="glass rounded-2xl p-4"
              >
                <Icon className="h-4 w-4 text-primary" />
                <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{f.label}</div>
                <div className="mt-0.5 text-sm font-semibold leading-snug">{f.value}</div>
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* ── Gallery ──────────────────────────────────────────────── */}
      {university.gallery.length > 0 && (
        <Section title={t("uni.gallery", "Gallery")} icon={Building2}>
          <div className="overflow-hidden rounded-2xl">
            <motion.img
              key={activeGalleryIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              src={university.gallery[activeGalleryIdx]}
              alt={`${university.name} ${activeGalleryIdx + 1}`}
              className="h-48 w-full rounded-2xl object-cover"
              loading="lazy"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
            {university.gallery.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveGalleryIdx(i)}
                className={cn(
                  "h-16 w-16 shrink-0 overflow-hidden rounded-lg transition",
                  i === activeGalleryIdx ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100",
                )}
              >
                <OptimizedImage src={img} alt={`Thumbnail ${i + 1}`} placeholderType="university" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── About ────────────────────────────────────────────────── */}
      <Section title={t("uni.aboutUniversity", "About University")} icon={Globe2}>
        <p className="text-sm leading-relaxed text-muted-foreground">{university.description}</p>
      </Section>

      {/* ── Campus Videos ────────────────────────────────────────── */}
      {university.videos.length > 0 && (
        <Section title={t("uni.campusVideos", "Campus Videos")} icon={Play}>
          <div className="grid grid-cols-2 gap-3">
            {university.videos.map((video, i) => (
              <VideoCard key={video.id} video={video} index={i} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Location Map ─────────────────────────────────────────── */}
      <Section title={t("uni.location", "Location")} icon={MapPin}>
        <div className="glass overflow-hidden rounded-2xl">
          <div className="relative h-48 w-full">
            <OptimizedImage
              src={SAMPLE_MAP_TILE}
              alt={`Map of ${university.city}`}
              placeholderType="generic"
              className="h-full w-full object-cover opacity-70"
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow-lg">
                <MapPin className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm font-semibold">{university.city}, {university.country}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {university.latitude.toFixed(4)}°, {university.longitude.toFixed(4)}° · {t("uni.nearbyCity", "Nearby city")}: {university.nearbyCity}
            </p>
          </div>
        </div>
      </Section>

      {/* ── Programs ─────────────────────────────────────────────── */}
      {allPrograms.length > 0 && (
        <Section title={t("uni.programs", "Programs")} icon={GraduationCap}>
          {university.bachelorPrograms.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-bold text-primary">{t("uni.bachelorDegrees", "Bachelor Degrees")}</h3>
              <div className="space-y-3">
                {university.bachelorPrograms.map((p, i) => <ProgramCard key={p.id} program={p} index={i} />)}
              </div>
            </div>
          )}
          {university.masterPrograms.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-bold text-primary">{t("uni.masterDegrees", "Master Degrees")}</h3>
              <div className="space-y-3">
                {university.masterPrograms.map((p, i) => <ProgramCard key={p.id} program={p} index={i} />)}
              </div>
            </div>
          )}
          {university.phdPrograms.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-primary">{t("uni.phdDegrees", "PhD Degrees")}</h3>
              <div className="space-y-3">
                {university.phdPrograms.map((p, i) => <ProgramCard key={p.id} program={p} index={i} />)}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ── Tuition Fees ─────────────────────────────────────────── */}
      <Section title={t("uni.tuitionFees", "Tuition Fees")} icon={Coins}>
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("uni.annualTuition", "Annual Tuition")}</span>
            <span className="font-display text-lg font-bold text-primary">{university.tuition}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-sm text-muted-foreground">{t("uni.applicationFee", "Application Fee")}</span>
            <span className="text-sm font-semibold">{university.applicationFee}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-sm text-muted-foreground">{t("uni.livingCost", "Living Cost")}</span>
            <span className="text-sm font-semibold">{university.livingCost}</span>
          </div>
        </div>
      </Section>

      {/* ── Scholarships ─────────────────────────────────────────── */}
      {university.hasScholarship && (
        <Section title={t("uni.scholarships", "Scholarships")} icon={Award}>
          <div className="glass rounded-2xl p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{university.scholarship}</p>
          </div>
        </Section>
      )}

      {/* ── Admission Requirements ───────────────────────────────── */}
      <Section title={t("uni.admissionRequirements", "Admission Requirements")} icon={FileText}>
        <div className="space-y-3">
          {university.ieltsRequirement !== "Not required" && (
            <div className="glass flex items-center justify-between rounded-xl p-3">
              <span className="flex items-center gap-2 text-sm"><Languages className="h-4 w-4 text-primary" /> IELTS</span>
              <span className="text-sm font-bold">{university.ieltsRequirement}</span>
            </div>
          )}
          {university.toeflRequirement !== "Not required" && (
            <div className="glass flex items-center justify-between rounded-xl p-3">
              <span className="flex items-center gap-2 text-sm"><Languages className="h-4 w-4 text-primary" /> TOEFL</span>
              <span className="text-sm font-bold">{university.toeflRequirement}</span>
            </div>
          )}
          {university.satRequirement !== "Not required" && (
            <div className="glass flex items-center justify-between rounded-xl p-3">
              <span className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-primary" /> SAT</span>
              <span className="text-sm font-bold">{university.satRequirement}</span>
            </div>
          )}
          {university.actRequirement !== "Not required" && (
            <div className="glass flex items-center justify-between rounded-xl p-3">
              <span className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-primary" /> ACT</span>
              <span className="text-sm font-bold">{university.actRequirement}</span>
            </div>
          )}
        </div>
      </Section>

      {/* ── Required Documents ───────────────────────────────────── */}
      <Section title={t("uni.requiredDocuments", "Required Documents")} icon={FileText}>
        <div className="space-y-2">
          {university.requiredDocuments.map((doc, i) => (
            <DocumentChecklistItem key={i} name={doc.name} status={doc.status} />
          ))}
        </div>
      </Section>

      {/* ── Deadlines ────────────────────────────────────────────── */}
      <Section title={t("uni.deadlines", "Deadlines")} icon={Calendar}>
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">{t("uni.applicationDeadline", "Application Deadline")}</p>
              <p className="text-xs text-muted-foreground">{university.deadline}</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Accommodation ────────────────────────────────────────── */}
      <Section title={t("uni.accommodation", "Accommodation")} icon={Home}>
        <div className="glass rounded-2xl p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {university.housingAvailable
              ? t("uni.housingAvailable", "On-campus housing is available. Living costs are estimated at")
              : t("uni.housingNotAvailable", "On-campus housing may be limited. Living costs are estimated at")}
            {" "}
            <span className="font-semibold text-foreground">{university.livingCost}</span>.
          </p>
        </div>
      </Section>

      {/* ── Campus Life ──────────────────────────────────────────── */}
      <Section title={t("uni.campusLife", "Campus Life")} icon={Users}>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-4">
            <Users className="h-4 w-4 text-primary" />
            <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{t("uni.totalStudents", "Total Students")}</div>
            <div className="mt-0.5 text-sm font-semibold">{university.studentsCount >= 1000 ? `${(university.studentsCount / 1000).toFixed(0)}K` : university.studentsCount}</div>
          </div>
          <div className="glass rounded-2xl p-4">
            <GraduationCap className="h-4 w-4 text-primary" />
            <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{t("uni.programsCount", "Programs")}</div>
            <div className="mt-0.5 text-sm font-semibold">{university.programsCount}</div>
          </div>
          <div className="glass rounded-2xl p-4">
            <Building2 className="h-4 w-4 text-primary" />
            <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{t("uni.campusSizeLabel", "Campus Size")}</div>
            <div className="mt-0.5 text-sm font-semibold">{university.campusSize}</div>
          </div>
          <div className="glass rounded-2xl p-4">
            <Briefcase className="h-4 w-4 text-primary" />
            <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{t("uni.employmentRateLabel", "Employment Rate")}</div>
            <div className="mt-0.5 text-sm font-semibold">{university.employmentRate}%</div>
          </div>
        </div>
      </Section>

      {/* ── Student Reviews ──────────────────────────────────────── */}
      {university.reviews.length > 0 && (
        <Section title={t("uni.studentReviews", "Student Reviews")} icon={Star}>
          <div className="space-y-3">
            {university.reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="glass rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  <OptimizedImage src={review.avatar} alt={review.author} placeholderType="avatar" className="h-10 w-10 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{review.author}</p>
                    <p className="text-xs text-muted-foreground">{review.program} · {review.date}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={cn("h-3 w-3", idx < review.rating ? "fill-amber-400 text-amber-400" : "text-white/20")}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{review.text}</p>
              </motion.div>
            ))}
          </div>
        </Section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <Section title={t("uni.faq", "Frequently Asked Questions")} icon={FileText}>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="glass overflow-hidden rounded-2xl"
            >
              <button
                onClick={() => setOpenFaqIdx(openFaqIdx === i ? null : i)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <span className="text-sm font-semibold">{faq.q}</span>
                <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", openFaqIdx === i && "rotate-90")} />
              </button>
              {openFaqIdx === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Nearby Attractions ───────────────────────────────────── */}
      <Section title={t("uni.nearbyAttractions", "Nearby Attractions")} icon={MapPin}>
        <div className="glass rounded-2xl p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {university.city} {t("uni.nearbyDesc", "offers a vibrant student life with cultural attractions, restaurants, and entertainment venues. The nearby city of")} {university.nearbyCity} {t("uni.providesAccess", "provides easy access to additional amenities and transport links.")}
          </p>
        </div>
      </Section>

      {/* ── Contact Information ──────────────────────────────────── */}
      <Section title={t("uni.contactInfo", "Contact Information")} icon={Mail}>
        <div className="space-y-2">
          {university.email && (
            <a href={`mailto:${university.email}`} className="glass flex items-center gap-3 rounded-xl p-3 transition hover:border-primary/30">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-sm">{university.email}</span>
            </a>
          )}
          {university.phone && (
            <a href={`tel:${university.phone}`} className="glass flex items-center gap-3 rounded-xl p-3 transition hover:border-primary/30">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-sm">{university.phone}</span>
            </a>
          )}
          <button onClick={handleVisitWebsite} className="glass flex w-full items-center gap-3 rounded-xl p-3 transition hover:border-primary/30">
            <Globe2 className="h-4 w-4 text-primary" />
            <span className="flex-1 text-left text-sm">{university.website}</span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </Section>

      {/* ── Social Media ─────────────────────────────────────────── */}
      {university.socialLinks.length > 0 && (
        <Section title={t("uni.socialMedia", "Social Media")} icon={Share2}>
          <div className="flex gap-3">
            {university.socialLinks.map((social) => (
              <a
                key={social.platform}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold capitalize text-muted-foreground transition hover:border-primary/30 hover:text-primary"
              >
                {social.platform[0].toUpperCase()}
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* ── Virtual Campus Tour (360) ───────────────────────────── */}
      {university.gallery.length > 0 && (
        <Section title={t("uni.virtualTour", "Virtual Campus Tour")} icon={Globe2}>
          <div className="grid grid-cols-2 gap-2">
            {university.gallery.map((img, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveGalleryIdx(i)}
                className="group relative aspect-square overflow-hidden rounded-2xl"
              >
                <OptimizedImage src={img} alt={`360 view ${i + 1}`} placeholderType="university" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">360°</div>
              </motion.button>
            ))}
          </div>
        </Section>
      )}

      {/* ── Visa Information ─────────────────────────────────────── */}
      <Section title={t("uni.visaInfo", "Visa Information")} icon={FileText}>
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("uni.visaDifficulty", "Visa Difficulty")}</span>
            {(() => {
              const hardVisa = ["United States", "United Kingdom", "Australia", "Canada"];
              const mediumVisa = ["Germany", "France", "Netherlands", "Sweden", "Italy", "Spain", "Japan", "South Korea"];
              if (hardVisa.includes(university.country)) return <span className="text-sm font-bold text-red-400">{t("uni.visaHard", "Hard")}</span>;
              if (mediumVisa.includes(university.country)) return <span className="text-sm font-bold text-amber-400">{t("uni.visaMedium", "Medium")}</span>;
              return <span className="text-sm font-bold text-green-400">{t("uni.visaEasy", "Easy")}</span>;
            })()}
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-sm text-muted-foreground">{t("uni.studentVisa", "Student Visa Required")}</span>
            <span className="text-sm font-semibold">✓</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-sm text-muted-foreground">{t("uni.workWhileStudying", "Work While Studying")}</span>
            <span className="text-sm font-semibold">{["Germany", "Canada", "Australia", "United Kingdom"].includes(university.country) ? "✓ 20hrs/week" : "Limited"}</span>
          </div>
        </div>
      </Section>

      {/* ── Campus Facilities ────────────────────────────────────── */}
      <Section title={t("uni.campusFacilities", "Campus Facilities")} icon={Building2}>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: t("uni.library", "Library"), available: true },
            { label: t("uni.laboratories", "Laboratories"), available: true },
            { label: t("uni.dormitories", "Dormitories"), available: university.housingAvailable },
            { label: t("uni.sportsFacilities", "Sports Facilities"), available: true },
            { label: t("uni.researchCenters", "Research Centers"), available: true },
            { label: t("uni.exchangePrograms", "Exchange Programs"), available: true },
          ].map((facility, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="glass flex items-center gap-2 rounded-xl p-3"
            >
              <CheckCircle2 className={cn("h-4 w-4 shrink-0", facility.available ? "text-green-400" : "text-white/20")} />
              <span className="text-xs font-medium">{facility.label}</span>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Internships & Employment ──────────────────────────────── */}
      <Section title={t("uni.internships", "Internships & Employment")} icon={Briefcase}>
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("uni.employmentRate", "Employment Rate")}</span>
            <span className="text-sm font-bold text-green-400">{university.employmentRate}%</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-sm text-muted-foreground">{t("uni.graduateSalary", "Average Graduate Salary")}</span>
            <span className="text-sm font-semibold">$55,000 - $95,000/yr</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-sm text-muted-foreground">{t("uni.internshipOpportunities", "Internship Opportunities")}</span>
            <span className="text-sm font-semibold">✓</span>
          </div>
        </div>
      </Section>

      {/* ── Nearby Airports & Hotels ──────────────────────────────── */}
      <Section title={t("uni.nearbyAirports", "Nearby Airports & Hotels")} icon={MapPin}>
        <div className="space-y-3">
          <div className="glass rounded-2xl p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("uni.airports", "Nearest Airports")}</p>
            <p className="text-sm text-muted-foreground">{university.nearbyCity} International Airport · ~30-60 min from campus</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("uni.hotels", "Nearest Hotels")}</p>
            <p className="text-sm text-muted-foreground">Budget: $40-80/night · Mid-range: $90-180/night · Luxury: $200+/night</p>
          </div>
        </div>
      </Section>

      {/* ── Weather & Time Zone ───────────────────────────────────── */}
      <Section title={t("uni.weatherTimezone", "Weather & Time Zone")} icon={Globe2}>
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("uni.climate", "Climate")}</span>
            <span className="text-sm font-semibold">{university.continent === "Europe" ? "Temperate" : university.continent === "Asia" ? "Varies" : "Varies"}</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-sm text-muted-foreground">{t("uni.timeZone", "Time Zone")}</span>
            <span className="text-sm font-semibold">UTC {university.longitude > 0 ? "+" : ""}{Math.round(university.longitude / 15)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-sm text-muted-foreground">{t("uni.transportation", "Public Transportation")}</span>
            <span className="text-sm font-semibold">✓</span>
          </div>
        </div>
      </Section>

      {/* ── Living Cost Calculator ────────────────────────────────── */}
      <Section title={t("uni.livingCostCalculator", "Living Cost Calculator")} icon={Coins}>
        <LivingCostCalculator tuition={university.tuitionNumeric} livingCost={university.livingCost} />
      </Section>

      {/* ── AI Chatbot ────────────────────────────────────────────── */}
      <Section title={t("uni.aiAssistant", "AI Admissions Assistant")} icon={Sparkles}>
        <AIChatWidget university={university} />
      </Section>

      {/* ── Official Application CTA ─────────────────────────────── */}
      <section className="px-5 pt-8 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-strong rounded-3xl p-6 text-center"
        >
          <GraduationCap className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 font-display text-xl font-bold">{t("uni.readyToApply", "Ready to Apply?")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("uni.applyDesc", "Start your application on the official university website")}</p>
          <button
            onClick={handleOfficialApply}
            className="gold-gradient mx-auto mt-4 flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition hover:scale-105 active:scale-95"
          >
            {t("uni.applyOnOfficialWebsite", "Apply on Official Website")}
            <ExternalLink className="h-4 w-4" />
          </button>
        </motion.div>
      </section>
    </div>
  );
}
