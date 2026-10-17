import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Plane, Heart, Globe2, Users, Coins, Languages, Clock, Ruler, MapIcon } from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { useTravel } from "@/contexts/TravelContext";
import type { Country } from "@/data/countries";
import { getCountryIso, getCountryArea, formatArea } from "@/data/countryMeta";
import { translateCountry } from "@/lib/countryLocale";
import { FlagImage } from "@/components/FlagImage";

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                    */
/* ------------------------------------------------------------------ */

interface DestinationModalProps {
  country: Country | null;
  open: boolean;
  onClose: () => void;
  onShowOptions: () => void;
}

const flagSpring = {
  type: "spring" as const,
  stiffness: 200,
  damping: 22,
  mass: 0.85,
};

const rowSpring = {
  type: "spring" as const,
  stiffness: 260,
  damping: 24,
  mass: 0.75,
};

/** iOS-style sheet spring — soft, smooth, natural deceleration */
const panelSpring = {
  type: "spring" as const,
  stiffness: 320,
  damping: 30,
  mass: 0.85,
};

function formatPopulation(pop: number): string {
  if (pop >= 1_000_000_000) return `${(pop / 1_000_000_000).toFixed(2)}B`;
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(0)}K`;
  return String(pop);
}

/* ══════════════════════════════════════════════════════════════════ */

export default function DestinationModal({ country, open, onClose, onShowOptions }: DestinationModalProps) {
  const { language, t } = useLanguage();
  const { isWishlisted, toggleWishlist } = useTravel();
  const [isMobile, setIsMobile] = useState(false);

  // Track viewport for responsive panel positioning (mobile vs tablet/desktop)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ESC closes the modal (desktop)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!country) return null;

  const localizedCountry = translateCountry(country, language);

  const isoCode = localizedCountry.isoCode ?? getCountryIso(localizedCountry.id);
  const area = localizedCountry.area ?? getCountryArea(localizedCountry.id);
  const wishlisted = isWishlisted(localizedCountry.id);

  const stats = [
    { icon: Globe2, label: t("modal.continent", "Continent"), value: localizedCountry.continent },
    { icon: Users, label: t("modal.population", "Population"), value: formatPopulation(localizedCountry.population) },
    { icon: Coins, label: t("modal.currency", "Currency"), value: localizedCountry.currency },
    { icon: Languages, label: t("modal.language", "Language"), value: localizedCountry.language },
    { icon: Clock, label: t("modal.timezone", "Time Zone"), value: localizedCountry.timezone },
    { icon: Ruler, label: t("modal.area", "Area"), value: area ? formatArea(area) : "—" },
  ];

  // ── Responsive positioning ──────────────────────────────────────────
  // Mobile: centered floating card, ~90% width, respects all safe areas.
  // Desktop/tablet: right-side floating panel with fixed width.
  const panelStyle: React.CSSProperties = isMobile
    ? {
        top: "calc(env(safe-area-inset-top, 0px) + 64px)",
        left: "calc(env(safe-area-inset-left, 0px) + 3vw)",
        right: "calc(env(safe-area-inset-right, 0px) + 3vw)",
        maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 140px)",
      }
    : {
        top: "calc(env(safe-area-inset-top, 0px) + 80px)",
        right: "32px",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
        width: "380px",
        maxWidth: "380px",
      };

  // ── Animation: slide from nearest available edge ───────────────────
  // Mobile: slides up from bottom (sheet-like). Desktop: slides from right.
  const initialAnim = isMobile
    ? { opacity: 0, y: 40, scale: 0.95 }
    : { opacity: 0, x: 60, scale: 0.96 };
  const animateAnim = { opacity: 1, x: 0, y: 0, scale: 1 };
  const exitAnim = isMobile
    ? { opacity: 0, y: 40, scale: 0.95 }
    : { opacity: 0, x: 60, scale: 0.96 };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* ── Subtle backdrop — dims + blurs globe but keeps it interactive ── */}
          {/* pointer-events-none so taps pass through to the globe; closing   */}
          {/* is handled via Globe.onBackgroundTap + the close button.          */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none fixed inset-0 z-40 bg-black/15 backdrop-blur-[2px]"
            aria-hidden
          />

          {/* ── Floating glass card — fully visible inside viewport ─────────── */}
          <motion.div
            initial={initialAnim}
            animate={animateAnim}
            exit={exitAnim}
            transition={panelSpring}
            className="floating-info-panel pointer-events-auto fixed z-50 flex flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-[#14161f]/95 via-[#11131b]/95 to-[#0d0f15]/95 shadow-2xl shadow-black/50 backdrop-blur-2xl"
            style={panelStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Grab handle (mobile) ──────────────────────────────────── */}
            <div className="flex shrink-0 justify-center pt-2.5 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/15" />
            </div>

            {/* ── Close button ────────────────────────────────────────── */}
            <button
              onClick={onClose}
              className="absolute right-3.5 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/50 backdrop-blur-sm transition hover:bg-white/15 hover:text-white active:scale-90"
              aria-label={t("modal.close", "Close")}
            >
              <X className="h-4 w-4" />
            </button>

            {/* ── Scrollable content ───────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {/* ── Flag + header ───────────────────────────────────────── */}
              <div className="relative flex shrink-0 flex-col items-center px-6 pt-3 pb-5">
                {/* Soft glow behind flag */}
                <div className="pointer-events-none absolute top-6 h-28 w-52 rounded-full bg-blue-500/10 blur-3xl" />

                <motion.div
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={flagSpring}
                  className="relative mb-4 overflow-hidden rounded-xl shadow-2xl shadow-black/50 ring-1 ring-white/[0.08]"
                  style={{ width: 160, height: 108 }}
                >
                  {/* Glass highlight overlay */}
                  <div className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-gradient-to-b from-white/[0.07] via-transparent to-transparent" />

                  <FlagImage
                    isoCode={isoCode}
                    emoji={localizedCountry.flag}
                    alt={`Flag of ${localizedCountry.name}`}
                    width={160}
                    height={108}
                    className="h-full w-full object-cover"
                  />
                </motion.div>

                {/* ── Country name ─────────────────────────────────────── */}
                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06, type: "spring" as const, stiffness: 280, damping: 26 }}
                  className="font-display text-2xl font-extrabold tracking-tight text-white"
                >
                  {localizedCountry.name}
                </motion.h2>

                {/* ── Capital + continent row ───────────────────────────── */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, type: "spring" as const, stiffness: 280, damping: 26 }}
                  className="mt-1.5 flex items-center gap-2 text-sm font-medium text-white/55"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-400/70" />
                  <span>{localizedCountry.capital}</span>
                  <span className="text-white/20">•</span>
                  <span>{localizedCountry.continent}</span>
                </motion.div>

                {/* ── Tagline ───────────────────────────────────────────── */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.18, duration: 0.35 }}
                  className="mt-2.5 max-w-[260px] text-center text-xs font-medium italic leading-relaxed text-white/35"
                >
                  "{localizedCountry.tagline}"
                </motion.p>
              </div>

              {/* ── Info stats grid ─────────────────────────────────────── */}
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

              {/* ── Travel description ──────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, ...rowSpring }}
                className="px-6 pb-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/35 mb-1.5">{t("modal.travelDescription", "Travel Description")}</p>
                <p className="text-xs leading-relaxed text-white/60">{localizedCountry.blurb}</p>
              </motion.div>

              {/* ── Major cities ────────────────────────────────────────── */}
              {country.cities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32, ...rowSpring }}
                  className="px-6 pb-4"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/35 mb-2">{t("modal.majorCities", "Major Cities")}</p>
                  <div className="flex flex-wrap gap-2">
                    {localizedCountry.cities.slice(0, 5).map((city) => (
                      <span
                        key={city.id}
                        className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-white/60"
                      >
                        {city.name}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* ── Action buttons (pinned at bottom) ─────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36, type: "spring" as const, stiffness: 260, damping: 24 }}
              className="flex shrink-0 flex-col gap-2.5 border-t border-white/[0.05] bg-gradient-to-b from-transparent to-black/30 px-6 pt-4 pb-5"
            >
              <button
                onClick={onShowOptions}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-500 active:scale-[0.98]"
              >
                <Plane className="h-4 w-4" />
                {t("modal.travelHere", "Travel Here")}
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localizedCountry.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/50 transition hover:border-white/12 hover:bg-white/8 hover:text-white/75 active:scale-[0.98]"
              >
                <MapIcon className="h-4 w-4" strokeWidth={2} />
                {t("modal.viewOnMaps", "View on Google Maps")}
              </a>
              <button
                onClick={() => toggleWishlist(localizedCountry.id)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition active:scale-[0.98] ${
                  wishlisted
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/15"
                    : "border-white/[0.06] bg-white/[0.03] text-white/50 hover:border-white/12 hover:bg-white/8 hover:text-white/75"
                }`}
              >
                <Heart className={`h-4 w-4 ${wishlisted ? "fill-rose-400" : ""}`} strokeWidth={2} />
                {wishlisted ? t("modal.inWishlist", "In Wishlist") : t("modal.addToWishlist", "Add to Wishlist")}
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
