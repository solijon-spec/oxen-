import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, MapPin, Trash2, Calendar, Sparkles, Plus } from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useTravel, type SavedItinerary } from "@/contexts/TravelContext";
import { useLanguage } from "@/contexts/LanguageContext";

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

/* ── Itinerary card ────────────────────────────────────────────────── */

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
      {/* Date badge */}
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Calendar className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
        </span>
        <span className="text-xs font-medium text-muted-foreground">{dateStr}</span>
      </div>

      {/* Prompt */}
      <p className="mb-3 line-clamp-2 text-sm font-semibold text-foreground">{itinerary.prompt}</p>

      {/* Trip summary */}
      {itinerary.destination && (
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
          <span className="text-xs text-muted-foreground">{itinerary.destination}</span>
        </div>
      )}

      {/* Days count */}
      {itinerary.days && itinerary.days.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {itinerary.days.slice(0, 3).map((day, i) => (
            <span
              key={i}
              className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
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

      {/* Budget */}
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

      {/* Delete button */}
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

/* ── Main Trips page ───────────────────────────────────────────────── */

export default function Trips() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { itineraries, removeItinerary } = useTravel();

  const handleRemove = useCallback(
    (id: string) => {
      removeItinerary(id);
    },
    [removeItinerary],
  );

  return (
    <div className="min-h-screen px-5 pt-16 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springIn}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="h-5 w-5 text-primary" strokeWidth={2.2} />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">{t("nav.trips", "My Trips")}</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold leading-tight">
          {t("trips.heading", "Your saved")}
          <br />
          <span className="text-gold-gradient">{t("trips.headingAccent", "adventures")}</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {itineraries.length > 0
            ? `${itineraries.length} ${t("trips.saved", "saved")} ${itineraries.length === 1 ? t("trips.itinerary", "itinerary") : t("trips.itineraries", "itineraries")}`
            : t("trips.empty", "Plan your first trip and it'll appear here.")}
        </p>
      </motion.div>

      {/* Create new trip button */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, ...cardSpring }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/planner")}
        className="gold-gradient mb-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-xl transition hover:scale-[1.02] active:scale-95"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        {t("trips.planNew", "Plan a New Trip")}
      </motion.button>

      {/* Itineraries */}
      {itineraries.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {itineraries.map((it, i) => (
              <ItineraryCard
                key={it.id}
                itinerary={it}
                index={i}
                onRemove={handleRemove}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ...cardSpring }}
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
            onClick={() => navigate("/planner")}
            className="mt-5 rounded-full bg-white/5 px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/10 active:scale-95"
          >
            {t("trips.startPlanning", "Start Planning")} →
          </button>
        </motion.div>
      )}
    </div>
  );
}
