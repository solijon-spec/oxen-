import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Heart,
  Globe2,
  Users,
  Coins,
  GraduationCap,
  Award,
  Calendar,
  Percent,
  Building2,
  ExternalLink,
  Bookmark,
  Share2,
  CheckCircle2,
  Clock,
  BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useLanguage } from "@/contexts/LanguageContext";
import { useUniversity } from "@/contexts/UniversityContext";
import type { University } from "@/data/universities";
import { OptimizedImage } from "@/components/OptimizedImage";

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                    */
/* ------------------------------------------------------------------ */

interface UniversityModalProps {
  university: University | null;
  open: boolean;
  onClose: () => void;
}

const panelSpring = {
  type: "spring" as const,
  stiffness: 320,
  damping: 30,
  mass: 0.85,
};

const rowSpring = {
  type: "spring" as const,
  stiffness: 260,
  damping: 24,
  mass: 0.75,
};

function formatStudents(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return String(count);
}

/* ══════════════════════════════════════════════════════════════════ */

export default function UniversityModal({ university, open, onClose }: UniversityModalProps) {
  const { t } = useLanguage();
  const { isWishlisted, toggleWishlist, isInCompare, toggleCompare } = useUniversity();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!university) return null;

  const wishlisted = isWishlisted(university.id);
  const inCompare = isInCompare(university.id);

  const stats = [
    { icon: Award, label: t("uni.qsRanking", "QS Ranking"), value: `#${university.qsRanking}` },
    { icon: Globe2, label: t("uni.worldRanking", "World Ranking"), value: `#${university.worldRanking}` },
    { icon: Coins, label: t("uni.tuition", "Tuition Fee"), value: university.tuition },
    { icon: Calendar, label: t("uni.deadline", "Application Deadline"), value: university.deadline },
    { icon: Percent, label: t("uni.acceptanceRate", "Acceptance Rate"), value: `${university.acceptanceRate}%` },
    { icon: Users, label: t("uni.students", "Students"), value: formatStudents(university.studentsCount) },
    { icon: GraduationCap, label: t("uni.programs", "Programs"), value: String(university.programsCount) },
    { icon: Building2, label: t("uni.campusSize", "Campus Size"), value: university.campusSize },
    { icon: Coins, label: t("uni.livingCost", "Living Cost"), value: university.livingCost },
    { icon: GraduationCap, label: t("uni.employmentRate", "Employment Rate"), value: `${university.employmentRate}%` },
  ];

  /* Deadline countdown */
  const deadlineDate = useMemo(() => {
    const dateMatch = university.deadline.match(/(\w+\s\d+,?\s\d+)/);
    if (dateMatch) {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }, [university.deadline]);
  const daysLeft = deadlineDate
    ? Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  /* Visa difficulty indicator based on country */
  const visaDifficulty = useMemo((): { label: string; color: string } => {
    const hardVisa = ["United States", "United Kingdom", "Australia", "Canada"];
    const mediumVisa = ["Germany", "France", "Netherlands", "Sweden", "Italy", "Spain", "Japan", "South Korea"];
    if (hardVisa.includes(university.country)) return { label: t("uni.visaHard", "Hard"), color: "text-red-400" };
    if (mediumVisa.includes(university.country)) return { label: t("uni.visaMedium", "Medium"), color: "text-amber-400" };
    return { label: t("uni.visaEasy", "Easy"), color: "text-green-400" };
  }, [university.country, t]);

  const panelStyle: React.CSSProperties = isMobile
    ? {
        top: "calc(env(safe-area-inset-top, 0px) + 76px)",
        left: "calc(env(safe-area-inset-left, 0px) + 5vw)",
        right: "calc(env(safe-area-inset-right, 0px) + 5vw)",
        maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 168px)",
      }
    : {
        top: "calc(env(safe-area-inset-top, 0px) + 80px)",
        right: "32px",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
        width: "380px",
        maxWidth: "380px",
      };

  const initialAnim = isMobile
    ? { opacity: 0, y: 40, scale: 0.95 }
    : { opacity: 0, x: 60, scale: 0.96 };
  const animateAnim = { opacity: 1, x: 0, y: 0, scale: 1 };
  const exitAnim = isMobile
    ? { opacity: 0, y: 40, scale: 0.95 }
    : { opacity: 0, x: 60, scale: 0.96 };

  const handleApplyNow = () => {
    navigate(`/universities/${university.id}`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: university.name, text: university.shortDescription }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`Check out ${university.name} on OXEN!`);
      toast.success(t("uni.linkCopied", "Link copied to clipboard"));
    }
  };

  const handleOfficialWebsite = () => {
    window.open(university.website, "_blank", "noopener,noreferrer");
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Subtle backdrop — dims globe but keeps it interactive */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none fixed inset-0 z-40 bg-black/15 backdrop-blur-[2px]"
            aria-hidden
          />

          {/* Floating glass card */}
          <motion.div
            initial={initialAnim}
            animate={animateAnim}
            exit={exitAnim}
            transition={panelSpring}
            className="floating-info-panel pointer-events-auto fixed z-50 flex flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-[#14161f]/95 via-[#11131b]/95 to-[#0d0f15]/95 shadow-2xl shadow-black/50 backdrop-blur-2xl"
            style={panelStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle (mobile) */}
            <div className="flex shrink-0 justify-center pt-2.5 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/15" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-3.5 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/50 backdrop-blur-sm transition hover:bg-white/15 hover:text-white active:scale-90"
              aria-label={t("modal.close", "Close")}
            >
              <X className="h-4 w-4" />
            </button>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {/* Logo + header */}
              <div className="relative flex shrink-0 flex-col items-center px-6 pt-3 pb-5">
                <div className="pointer-events-none absolute top-6 h-28 w-52 rounded-full bg-blue-500/10 blur-3xl" />

                {/* University logo — circular badge overlapping cover image */}
                <motion.div
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring" as const, stiffness: 200, damping: 22, mass: 0.85 }}
                  className="relative mb-4 overflow-hidden rounded-xl shadow-2xl shadow-black/50 ring-1 ring-white/[0.08]"
                  style={{ width: 160, height: 108 }}
                >
                  <div className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-gradient-to-b from-white/[0.07] via-transparent to-transparent" />
                  <OptimizedImage
                    src={university.coverImage}
                    alt={university.name}
                    placeholderType="university"
                    className="h-full w-full object-cover"
                  />
                  {/* Logo badge */}
                  <div className="absolute -bottom-4 -right-4 z-20 h-14 w-14 overflow-hidden rounded-full border-2 border-[#14161f] bg-[#14161f] shadow-lg">
                    <OptimizedImage
                      src={university.logo}
                      alt={`${university.name} logo`}
                      placeholderType="university"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06, type: "spring" as const, stiffness: 280, damping: 26 }}
                  className="font-display text-xl font-extrabold tracking-tight text-white text-center"
                >
                  {university.name}
                </motion.h2>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, type: "spring" as const, stiffness: 280, damping: 26 }}
                  className="mt-1.5 flex items-center gap-2 text-sm font-medium text-white/55"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-400/70" />
                  <span>{university.flag} {university.city}</span>
                  <span className="text-white/20">•</span>
                  <span>{university.country}</span>
                </motion.div>

                {/* Badges row */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16, type: "spring" as const, stiffness: 280, damping: 26 }}
                  className="mt-2.5 flex flex-wrap items-center justify-center gap-2"
                >
                  {university.hasScholarship && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-400">
                      {t("uni.scholarshipAvailable", "Scholarship Available")}
                    </span>
                  )}
                  <span className={`rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold ${visaDifficulty.color}`}>
                    {t("uni.visa", "Visa")}: {visaDifficulty.label}
                  </span>
                  {university.housingAvailable && (
                    <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[11px] font-semibold text-green-400">
                      {t("uni.housing", "Housing Available")}
                    </span>
                  )}
                </motion.div>

                {/* Deadline countdown */}
                {daysLeft !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, type: "spring" as const, stiffness: 280, damping: 26 }}
                    className={`mt-2.5 rounded-lg px-3 py-1.5 text-center text-xs font-bold ${
                      daysLeft <= 30
                        ? "bg-red-500/15 text-red-400"
                        : daysLeft <= 90
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-blue-500/15 text-blue-400"
                    }`}
                  >
                    <Clock className="mr-1 inline h-3 w-3" />
                    {daysLeft} {t("uni.daysUntilDeadline", "days until deadline")}
                  </motion.div>
                )}

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.35 }}
                  className="mt-2.5 max-w-[260px] text-center text-xs font-medium italic leading-relaxed text-white/35"
                >
                  "{university.shortDescription}"
                </motion.p>
              </div>

              {/* Info stats grid */}
              <div className="grid grid-cols-2 gap-px bg-white/[0.04] px-6 pb-4">
                {stats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.16 + i * 0.04, ...rowSpring }}
                      className="flex items-center gap-2.5 bg-gradient-to-b from-white/[0.02] to-transparent px-3 py-2.5"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                        <Icon className="h-3.5 w-3.5 text-blue-400/70" strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-white/35">{stat.label}</p>
                        <p className="truncate text-xs font-semibold text-white/80">{stat.value}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Description */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, ...rowSpring }}
                className="px-6 pb-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/35 mb-1.5">{t("uni.about", "About University")}</p>
                <p className="text-xs leading-relaxed text-white/60">{university.description}</p>
              </motion.div>

              {/* Requirements summary */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, ...rowSpring }}
                className="px-6 pb-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/35 mb-2">{t("uni.requirements", "Entry Requirements")}</p>
                <div className="flex flex-wrap gap-2">
                  {university.ieltsRequirement !== "Not required" && (
                    <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-white/60">
                      IELTS {university.ieltsRequirement}
                    </span>
                  )}
                  {university.toeflRequirement !== "Not required" && (
                    <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-white/60">
                      TOEFL {university.toeflRequirement}
                    </span>
                  )}
                  {university.satRequirement !== "Not required" && (
                    <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-white/60">
                      SAT {university.satRequirement}
                    </span>
                  )}
                  <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-white/60">
                    {university.type === "public" ? t("uni.public", "Public") : t("uni.private", "Private")}
                  </span>
                  <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-white/60">
                    {university.language}
                  </span>
                </div>
              </motion.div>

              {/* Degree levels available */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.34, ...rowSpring }}
                className="px-6 pb-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/35 mb-2">{t("uni.degreeLevels", "Degree Levels")}</p>
                <div className="flex flex-wrap gap-2">
                  {university.bachelorPrograms.length > 0 && (
                    <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400">
                      {t("uni.bachelor", "Bachelor")}
                    </span>
                  )}
                  {university.masterPrograms.length > 0 && (
                    <span className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-400">
                      {t("uni.master", "Master")}
                    </span>
                  )}
                  {university.phdPrograms.length > 0 && (
                    <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                      {t("uni.phd", "PhD")}
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Gallery preview */}
              {university.gallery.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.36, ...rowSpring }}
                  className="px-6 pb-4"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/35 mb-2">{t("uni.gallery", "Gallery Preview")}</p>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {university.gallery.slice(0, 4).map((img, i) => (
                      <OptimizedImage
                        key={i}
                        src={img}
                        alt={`${university.name} ${i + 1}`}
                        placeholderType="university"
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Action buttons (pinned at bottom) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: "spring" as const, stiffness: 260, damping: 24 }}
              className="flex shrink-0 flex-col gap-2.5 border-t border-white/[0.05] bg-gradient-to-b from-transparent to-black/30 px-6 pt-4 pb-5"
            >
              <button
                onClick={handleApplyNow}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-500 active:scale-[0.98]"
              >
                <GraduationCap className="h-4 w-4" />
                {t("uni.applyNow", "Apply Now")}
              </button>
              <button
                onClick={() => navigate(`/universities/${university.id}`)}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/[0.08] hover:text-white active:scale-[0.98]"
              >
                <BookOpen className="h-4 w-4" />
                {t("uni.viewDetails", "View Details")}
              </button>
              <div className="flex gap-2.5">
                <button
                  onClick={() => toggleWishlist(university.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-medium transition active:scale-[0.98] ${
                    wishlisted
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                      : "border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white/75"
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 ${wishlisted ? "fill-rose-400" : ""}`} strokeWidth={2} />
                  {wishlisted ? t("uni.saved", "Saved") : t("uni.save", "Save")}
                </button>
                <button
                  onClick={() => toggleCompare(university.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-medium transition active:scale-[0.98] ${
                    inCompare
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                      : "border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white/75"
                  }`}
                >
                  <CheckCircle2 className={`h-3.5 w-3.5 ${inCompare ? "fill-blue-400" : ""}`} strokeWidth={2} />
                  {t("uni.compare", "Compare")}
                </button>
              </div>
              {/* Official Application + Google Maps */}
              <div className="flex gap-2.5">
                <button
                  onClick={() => window.open(university.officialApplicationLink, "_blank", "noopener,noreferrer")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2.5 text-xs font-semibold text-green-400 transition hover:bg-green-500/20 active:scale-[0.98]"
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                  {t("uni.officialApply", "Apply on Official Website")}
                </button>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${university.latitude},${university.longitude}`, "_blank", "noopener,noreferrer")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-white/50 transition hover:text-white/75 active:scale-[0.98]"
                >
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                  {t("uni.googleMaps", "Google Maps")}
                </button>
                <button
                  onClick={handleOfficialWebsite}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-white/50 transition hover:text-white/75 active:scale-[0.98]"
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                  {t("uni.website", "Website")}
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-white/50 transition hover:text-white/75 active:scale-[0.98]"
                  aria-label={t("uni.share", "Share")}
                >
                  <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
