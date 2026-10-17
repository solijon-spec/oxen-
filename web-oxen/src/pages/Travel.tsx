import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Play, Users, Bookmark, Star, Search, Flame, Trophy, X,
  Sparkles, Briefcase, MapPin, Trash2, Calendar, Plus, Plane,
} from "lucide-react";
import { useCallback, useMemo, useState, lazy, Suspense, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { OptimizedImage } from "@/components/OptimizedImage";
import VideoPlayer from "@/components/VideoPlayer";
import { CATEGORIES, DESTINATIONS, getDestinationsByCategory, type TrendingDestination, type DestinationCategory } from "@/data/feedData";
import { COUNTRIES } from "@/data/countries";
import { useTravel, type SavedItinerary } from "@/contexts/TravelContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

// Lazy-load the AI planner to keep the initial Travel bundle lean
const Planner = lazy(() => import("./Planner"));

/* ── Animation presets ────────────────────────────────────────────── */

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, type: "spring" as const, stiffness: 260, damping: 24, mass: 0.8 },
  }),
};

const cardSpring = {
  type: "spring" as const,
  stiffness: 260,
  damping: 24,
  mass: 0.8,
};

/* ── Category section ─────────────────────────────────────────────── */

function DestinationSection({
  category,
  saved,
  onToggleSave,
  onWatchVideo,
}: {
  category: { key: DestinationCategory; emoji: string; labelKey: string };
  saved: Set<string>;
  onToggleSave: (id: string) => void;
  onWatchVideo: (dest: TrendingDestination) => void;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const items = getDestinationsByCategory(category.key);

  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      {/* Section header */}
      <div className="mb-4 flex items-center gap-2.5 px-5">
        <span className="text-xl">{category.emoji}</span>
        <h2 className="font-display text-lg font-bold">{t(category.labelKey)}</h2>
        <span className="ml-auto text-xs text-muted-foreground">{items.length} {t("travel.places", "places")}</span>
      </div>

      {/* Horizontal scroll cards */}
      <div className="-mx-5 overflow-x-auto no-scrollbar">
        <div className="flex gap-4 px-5">
          <AnimatePresence mode="popLayout">
            {items.map((dest, i) => (
              <DestinationCard
                key={dest.id}
                dest={dest}
                index={i}
                saved={saved.has(dest.id)}
                onToggleSave={onToggleSave}
                onWatchVideo={onWatchVideo}
                onNavigate={(countryName) => {
                  const country = COUNTRIES.find((c) => c.name === countryName);
                  if (country) navigate(`/country/${country.id}`);
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ── Destination card ─────────────────────────────────────────────── */

function DestinationCard({
  dest,
  index,
  saved,
  onToggleSave,
  onNavigate,
  onWatchVideo,
}: {
  dest: TrendingDestination;
  index: number;
  saved: boolean;
  onToggleSave: (id: string) => void;
  onNavigate: (countryName: string) => void;
  onWatchVideo: (dest: TrendingDestination) => void;
}) {
  const { t } = useLanguage();
  return (
    <motion.article
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileTap={{ scale: 0.97 }}
      className="travel-card group relative w-[280px] shrink-0 overflow-hidden rounded-3xl"
    >
      {/* Cover image */}
      <div className="relative h-[380px] w-full overflow-hidden">
        <OptimizedImage
          src={dest.imageUrl}
          alt={`${dest.city}, ${dest.country}`}
          placeholderType="post"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

        {/* Top row — flag + visitor count + rating */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-xl backdrop-blur-md">
            {dest.flag}
          </span>
          <div className="flex items-center gap-2">
            {dest.rating >= 4.9 && (
              <div className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1.5 backdrop-blur-md">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={0} />
                <span className="text-xs font-bold text-amber-300">{dest.rating}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
              <Users className="h-3.5 w-3.5 text-white/70" strokeWidth={2} />
              <span className="text-xs font-semibold text-white/90">{dest.visitors}</span>
            </div>
          </div>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.06, duration: 0.4 }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">{dest.country}</p>
            <h3 className="font-display text-2xl font-extrabold text-white">{dest.city}</h3>
            <p className="mt-1.5 line-clamp-2 text-sm text-white/70">{dest.description}</p>
          </motion.div>

          {/* Action buttons */}
          <div className="mt-4 flex items-center gap-2.5">
            <button
              onClick={() => onWatchVideo(dest)}
              disabled={!dest.videoUrl}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold backdrop-blur-md transition active:scale-95",
                dest.videoUrl
                  ? "bg-white/15 text-white hover:bg-white/25"
                  : "bg-white/5 text-white/30 cursor-not-allowed",
              )}
            >
              <Play className="h-4 w-4 fill-white" strokeWidth={0} />
              {dest.videoUrl ? t("travel.watchVideo", "Watch Video") : t("travel.noVideo", "No Video")}
            </button>
            <button
              onClick={() => onToggleSave(dest.id)}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl backdrop-blur-md transition active:scale-90",
                saved
                  ? "bg-primary/30 text-primary"
                  : "bg-white/15 text-white hover:bg-white/25",
              )}
              aria-label="Save destination"
            >
              <Bookmark className={cn("h-5 w-5", saved && "fill-primary")} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/* ── Itinerary card (from Trips page) ───────────────────────── */

function ItineraryCard({
  itinerary,
  index,
  onRemove,
}: {
  itinerary: SavedItinerary;
  index: number;
  onRemove: (id: string) => void;
}) {
  const { t } = useLanguage();
  const dateStr = new Date(itinerary.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <motion.article
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ delay: index * 0.08, ...cardSpring }}
      className="glass group relative overflow-hidden rounded-2xl p-5 transition hover:border-primary/30"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Calendar className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
        </span>
        <span className="text-xs font-medium text-muted-foreground">{dateStr}</span>
      </div>
      <p className="mb-3 line-clamp-2 text-sm font-semibold text-foreground">{itinerary.prompt}</p>
      {itinerary.destination && (
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
          <span className="text-xs text-muted-foreground">{itinerary.destination}</span>
        </div>
      )}
      {itinerary.days && itinerary.days.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {itinerary.days.slice(0, 3).map((day, i) => (
            <span key={i} className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Day {day.day}: {day.title}
            </span>
          ))}
          {itinerary.days.length > 3 && (
            <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-muted-foreground">
              +{itinerary.days.length - 3} {t("trips.more", "more")}
            </span>
          )}
        </div>
      )}
      {itinerary.budget && itinerary.budget.length > 0 && (
        <div className="mb-4 rounded-xl bg-primary/5 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("trips.estimatedBudget", "Estimated Budget")}</p>
          <div className="space-y-1">
            {itinerary.budget.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.category}</span>
                <span className="font-semibold text-foreground">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => onRemove(itinerary.id)}
        className="flex items-center gap-1.5 text-xs font-medium text-red-400/70 transition hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        {t("common.remove", "Remove")}
      </button>
    </motion.article>
  );
}

/* ── Tab button helper ──────────────────────────────────────── */

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-95",
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[9px] font-bold text-primary">
          {badge}
        </span>
      )}
    </button>
  );
}

/* ── Main Travel page (merged with Trips) ─────────────────── */

type TravelTab = "explore" | "trips" | "planner";

export default function Travel() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { itineraries, removeItinerary } = useTravel();
  const [activeTab, setActiveTab] = useState<TravelTab>("explore");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState<string>("");
  const [videoDest, setVideoDest] = useState<TrendingDestination | null>(null);

  const toggleSave = useCallback((id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleWatchVideo = useCallback((dest: TrendingDestination) => {
    if (dest.videoUrl) setVideoDest(dest);
  }, []);

  const handleRemoveItinerary = useCallback(
    (id: string) => removeItinerary(id),
    [removeItinerary],
  );

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return CATEGORIES;
    const q = query.toLowerCase();
    // If searching, filter destinations across all categories
    const hasMatches = DESTINATIONS.some(
      (d) =>
        d.country.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q),
    );
    return hasMatches ? CATEGORIES : [];
  }, [query]);

  return (
    <div className="min-h-screen px-5 pt-16 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springIn}
        className="mb-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Plane className="h-5 w-5 text-primary" strokeWidth={2.2} />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">{t("nav.travel", "Travel")}</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold leading-tight">
          {t("travel.heading", "Explore the world's")}
          <br />
          <span className="text-gold-gradient">{t("travel.headingAccent", "most amazing places")}</span>
        </h1>
      </motion.div>

      {/* Tab switcher + Plan with AI button */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.3 }}
        className="mb-5 flex items-center gap-2"
      >
        <div className="glass flex items-center gap-1 rounded-2xl p-1">
          <TabButton
            active={activeTab === "explore"}
            onClick={() => setActiveTab("explore")}
            icon={<Flame className="h-3.5 w-3.5" />}
            label={t("travel.destinations", "Destinations")}
          />
          <TabButton
            active={activeTab === "trips"}
            onClick={() => setActiveTab("trips")}
            icon={<Briefcase className="h-3.5 w-3.5" />}
            label={t("nav.trips", "My Trips")}
            badge={itineraries.length}
          />
        </div>
        <button
          onClick={() => setActiveTab("planner")}
          className={cn(
            "gold-gradient ml-auto flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg transition active:scale-95",
            activeTab === "planner" && "ring-2 ring-primary/40",
          )}
        >
          <Sparkles className="h-4 w-4" />
          {t("travel.planWithAI", "Plan with AI")}
        </button>
      </motion.div>

      {/* AI Planner tab */}
      <AnimatePresence mode="wait">
        {activeTab === "planner" && (
          <motion.div
            key="planner"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <Suspense fallback={<div className="flex justify-center py-20"><div className="oxen-skeleton-globe" /></div>}>
              <Planner />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My Trips tab */}
      <AnimatePresence mode="wait">
        {activeTab === "trips" && (
          <motion.div
            key="trips"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {/* Trips sub-header */}
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {itineraries.length > 0
                  ? `${itineraries.length} ${t("trips.saved", "saved")} ${itineraries.length === 1 ? t("trips.itinerary", "itinerary") : t("trips.itineraries", "itineraries")}`
                  : t("trips.empty", "Plan your first trip and it'll appear here.")
                }
              </p>
            </div>

            {/* Create new trip button */}
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, ...cardSpring }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab("planner")}
              className="gold-gradient mb-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-xl transition hover:scale-[1.02] active:scale-95"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              {t("trips.planNew", "Plan a New Trip")}
            </motion.button>

            {itineraries.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {itineraries.map((it, i) => (
                    <ItineraryCard
                      key={it.id}
                      itinerary={it}
                      index={i}
                      onRemove={handleRemoveItinerary}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, ...cardSpring }}
                className="glass flex flex-col items-center justify-center rounded-3xl py-16 text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-foreground">{t("trips.noTrips", "No trips yet")}</h3>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  {t("trips.noTripsDesc", "Use the AI planner to create your first itinerary. It'll be saved here automatically.")}
                </p>
                <button
                  onClick={() => setActiveTab("planner")}
                  className="mt-5 rounded-full bg-white/5 px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/10 active:scale-95"
                >
                  {t("trips.startPlanning", "Start Planning")} →
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Destinations tab (original Travel content) */}
      <AnimatePresence mode="wait">
        {activeTab === "explore" && (
          <motion.div
            key="explore"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="glass mb-5 flex items-center gap-3 rounded-2xl px-4 py-3"
            >
              <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("travel.searchPlaceholder", "Search destinations...")}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t("common.clear", "Clear")}
                </button>
              )}
            </motion.div>

            {/* Category sections */}
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => (
                <DestinationSection
                  key={cat.key}
                  category={cat}
                  saved={saved}
                  onToggleSave={toggleSave}
                  onWatchVideo={handleWatchVideo}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground/30" strokeWidth={1.5} />
                <p className="mt-4 text-sm text-muted-foreground">{t("travel.noResults", "No destinations found for")} "{query}"</p>
                <button
                  onClick={() => setQuery("")}
                  className="mt-4 rounded-full bg-white/5 px-5 py-2 text-sm font-medium text-foreground transition hover:bg-white/10"
                >
                  {t("travel.clearSearch", "Clear search")}
                </button>
              </div>
            )}

            {/* Video player modal */}
            {videoDest && videoDest.videoUrl && createPortal(
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md"
                  onClick={() => setVideoDest(null)}
                >
                  <button
                    onClick={() => setVideoDest(null)}
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
                    <div className="mb-3 text-center">
                      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{videoDest.flag} {videoDest.country}</p>
                      <h3 className="font-display text-2xl font-extrabold text-white">{videoDest.city}</h3>
                    </div>
                    <VideoPlayer
                      src={videoDest.videoUrl}
                      poster={videoDest.imageUrl}
                      autoPlay
                      className="aspect-video w-full"
                    />
                  </motion.div>
                </motion.div>
              </AnimatePresence>,
              document.body,
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
