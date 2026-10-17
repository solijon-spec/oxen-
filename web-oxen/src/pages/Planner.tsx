import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Loader2, Send, Sun, Sunset, Moon, Wallet, Lightbulb,
  Bookmark, Check, MapPin, Calendar, Users, Clock, Plane, Hotel,
  Utensils, Bus, FileCheck, Shield, UserCheck, Building2, Star,
  ChevronDown, X, Search, ArrowRight, MessageCircle, Eye, Crown,
  AlertCircle, Sliders, Phone, Mail, Globe as GlobeIcon,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useTravel } from "@/contexts/TravelContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";
import {
  recommendPackages, formatCriteriaSummary,
  type AIRecommendationResult, type TravelCriteria, type PackageMatch,
} from "@/lib/ai-planner";
import {
  formatPrice, calculateDuration, calculateDiscount,
  getAvailabilityLabel, parseStringArray,
} from "@/lib/tour-posts";
import { cn } from "@/lib/utils";

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "RUB", "UZS", "JPY"] as const;
const TRAVEL_STYLES = ["luxury", "budget", "adventure", "relax", "cultural", "family", "honeymoon", "business"] as const;
const INCLUDED_OPTIONS = ["flight", "hotel", "visa", "transfer", "meals", "insurance", "guide"] as const;

const springIn = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
};

export default function Planner() {
  const { toast } = useToast();
  const { saveItinerary } = useTravel();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Globe country context (from URL ?country=Turkey)
  const globeCountry = searchParams.get("country");

  const [prompt, setPrompt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AIRecommendationResult | null>(null);
  const [saved, setSaved] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [savedPackages, setSavedPackages] = useState<Set<string>>(new Set());

  // Structured filters
  const [filters, setFilters] = useState<Partial<TravelCriteria>>({
    travelers: 1,
    currency: "USD",
    includedPreferences: [],
  });

  useSEO({
    title: "AI Trip Planner | OXEN",
    description: "Describe your dream trip and OXEN AI will find real tour packages from travel agencies.",
  });

  const run = useCallback(async (text: string) => {
    if ((!text.trim() && !filters.destination) || loading) return;
    setLoading(true);
    setResult(null);
    setSaved(false);
    try {
      const res = await recommendPackages(
        text,
        filters,
        language,
        globeCountry,
      );
      setResult(res);
    } catch (err) {
      toast({
        title: t("planner.error", "The planner stumbled"),
        description: err instanceof Error ? err.message : t("planner.retry", "Please try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [loading, filters, language, globeCountry, toast, t]);

  const handleSaveItinerary = useCallback(() => {
    if (!result?.itinerary) return;
    saveItinerary(prompt || "AI Trip Plan", result.itinerary);
    setSaved(true);
    toast({ title: t("planner.saved", "Itinerary saved"), description: t("planner.savedDesc", "Find it on your dashboard.") });
  }, [result, prompt, saveItinerary, toast, t]);

  const toggleSavePackage = useCallback((postId: string) => {
    setSavedPackages((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }, []);

  const criteriaSummary = useMemo(() => {
    if (!result) return [];
    return formatCriteriaSummary(result.criteria);
  }, [result]);

  return (
    <div className="relative px-5 pt-7">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-widest">{t("planner.title", "AI Travel Planner")}</span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight">
          {t("planner.heading", "Describe your")} <span className="text-gold-gradient">{t("planner.headingAccent", "dream trip.")}</span>
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("planner.subtitle", "Tell OXEN where, how long, and your vibe — get a full itinerary in seconds.")}
        </p>
      </motion.div>

      {/* Globe context indicator */}
      {globeCountry && !result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
        >
          <GlobeIcon className="h-3.5 w-3.5" />
          {globeCountry} preselected from globe
        </motion.div>
      )}

      {/* Input */}
      <div className="mt-5">
        <div className="glass-strong rounded-2xl p-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("planner.placeholder", "e.g. I want to travel to Dubai with my wife in September for 5 days. My total budget is around $1200.")}
            rows={3}
            className="w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />

          {/* Expandable filters */}
          <div className="px-1 pb-1">
            <button
              onClick={() => setShowFilters((s) => !s)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <Sliders className="h-3.5 w-3.5" />
              Filters {Object.values(filters).some(v => v && (!Array.isArray(v) || v.length > 0) && v !== 1 && v !== "USD") && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">!</span>
              )}
              <ChevronDown className={cn("h-3 w-3 transition", showFilters && "rotate-180")} />
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <StructuredFilters filters={filters} onChange={setFilters} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => run(prompt)}
              disabled={loading || (!prompt.trim() && !filters.destination)}
              className="gold-gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? t("planner.loading", "Searching…") : "Find Packages"}
            </button>
          </div>
        </div>

        {/* Suggestions */}
        {!result && !loading && (
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setPrompt(s);
                  run(s);
                }}
                className="rounded-full border border-border bg-card/40 px-3.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && <LoadingSkeleton />}

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-7 space-y-5"
          >
            {/* AI Intro + Understood Preferences */}
            <div className="glass-strong rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="gold-gradient mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-relaxed text-foreground">{result.intro}</p>
                  {criteriaSummary.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {criteriaSummary.map((c, i) => (
                        <span key={i} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* No matches */}
            {result.allMatches.length === 0 && (
              <div className="glass rounded-2xl p-8 text-center">
                <AlertCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                <h3 className="font-display text-lg font-bold">No matching packages found</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  No OXEN tour packages match your criteria. Try adjusting your destination, budget, or dates.
                </p>
                <button
                  onClick={() => { setResult(null); setPrompt(""); }}
                  className="mt-4 rounded-xl border border-border bg-card/40 px-4 py-2 text-sm font-semibold transition hover:border-primary/40"
                >
                  Start over
                </button>
              </div>
            )}

            {/* Best Match */}
            {result.bestMatch && (
              <PackageCard
                match={result.bestMatch}
                isBestMatch
                travelers={result.criteria.travelers}
                budget={result.criteria.budget}
                saved={savedPackages.has(result.bestMatch.post.id)}
                onSave={() => toggleSavePackage(result.bestMatch!.post.id)}
                onNavigate={navigate}
              />
            )}

            {/* Alternatives */}
            {result.alternatives.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
                  <span className="text-muted-foreground">
                    {result.exactMatch ? "More Options" : "Closest Matches"}
                  </span>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {result.alternatives.length}
                  </span>
                </h3>
                <div className="space-y-4">
                  {result.alternatives.map((match) => (
                    <PackageCard
                      key={match.post.id}
                      match={match}
                      travelers={result.criteria.travelers}
                      budget={result.criteria.budget}
                      saved={savedPackages.has(match.post.id)}
                      onSave={() => toggleSavePackage(match.post.id)}
                      onNavigate={navigate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* AI Itinerary (clearly separated) */}
            {result.itinerary && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold">AI Suggested Trip Plan</h3>
                  <button
                    onClick={handleSaveItinerary}
                    disabled={saved}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition",
                      saved ? "bg-primary/15 text-primary" : "gold-gradient text-primary-foreground hover:scale-105",
                    )}
                  >
                    {saved ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                    {saved ? t("planner.savedBtn", "Saved") : t("common.save", "Save")}
                  </button>
                </div>

                {/* AI-generated disclaimer */}
                <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    This trip plan is AI-generated and separate from the real OXEN package data above. Hotels, prices, and offers in this plan are suggestions, not real bookings.
                  </p>
                </div>

                {/* Itinerary overview */}
                <div className="glass-strong mb-3 rounded-2xl p-5">
                  <h2 className="font-display text-xl font-extrabold">{result.itinerary.destination}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{result.itinerary.summary}</p>
                  {result.itinerary.bestTime && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <Sun className="h-3.5 w-3.5" /> {t("planner.bestTime", "Best time")}: {result.itinerary.bestTime}
                    </div>
                  )}
                </div>

                {/* Daily plan */}
                <div className="space-y-3">
                  {result.itinerary.days.map((day, i) => (
                    <motion.div
                      key={day.day}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="glass rounded-2xl p-4"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <span className="gold-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-primary-foreground">
                          {day.day}
                        </span>
                        <span className="font-display font-bold">{day.title}</span>
                      </div>
                      <div className="space-y-2.5 pl-1">
                        <Slot icon={Sun} label={t("planner.morning", "Morning")} text={day.morning} />
                        <Slot icon={Sunset} label={t("planner.afternoon", "Afternoon")} text={day.afternoon} />
                        <Slot icon={Moon} label={t("planner.evening", "Evening")} text={day.evening} />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Budget */}
                {result.itinerary.budget.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
                      <Wallet className="h-5 w-5 text-primary" /> {t("planner.budget", "Budget breakdown")}
                    </h3>
                    <div className="glass overflow-hidden rounded-2xl">
                      {result.itinerary.budget.map((b, i) => (
                        <div key={b.category} className={cn("flex items-center justify-between px-4 py-3", i !== 0 && "border-t border-border/50")}>
                          <span className="text-sm text-muted-foreground">{b.category}</span>
                          <span className="text-sm font-bold">{b.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tips */}
                {result.itinerary.tips.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
                      <Lightbulb className="h-5 w-5 text-primary" /> {t("planner.tips", "Insider tips")}
                    </h3>
                    <div className="space-y-2">
                      {result.itinerary.tips.map((tip, i) => (
                        <div key={i} className="glass flex items-start gap-3 rounded-xl p-3.5">
                          <span className="mt-0.5 text-primary">✦</span>
                          <span className="text-sm leading-relaxed text-muted-foreground">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Start over */}
            <button
              onClick={() => { setResult(null); setPrompt(""); }}
              className="w-full rounded-2xl border border-border bg-card/40 py-3 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              Plan another trip
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Package Recommendation Card ──────────────────────────────

function PackageCard({
  match,
  isBestMatch,
  travelers,
  budget,
  saved,
  onSave,
  onNavigate,
}: {
  match: PackageMatch;
  isBestMatch?: boolean;
  travelers: number;
  budget?: number;
  saved: boolean;
  onSave: () => void;
  onNavigate: (path: string) => void;
}) {
  const { post, score, estimatedTotal, withinBudget, differences, badges } = match;
  const coverImage = post.cover_image;
  const duration = calculateDuration(post.departure_date, post.return_date);
  const discount = calculateDiscount(post.price ?? 0, post.old_price);
  const availability = getAvailabilityLabel(post.available_seats ?? null);
  const gallery = parseStringArray(post.gallery);
  const company = post.company;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springIn}
      className={cn(
        "glass-strong relative overflow-hidden rounded-2xl",
        isBestMatch && "ring-1 ring-primary/30",
      )}
    >
      {/* Best Match badge */}
      {isBestMatch && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg">
          <Crown className="h-3 w-3" /> Best Match
        </div>
      )}

      {/* Match score badge */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-primary backdrop-blur-sm">
        <Star className="h-3 w-3 fill-primary" /> {score}% match
      </div>

      {/* Cover image */}
      {coverImage && (
        <div className="relative h-44 w-full overflow-hidden">
          <img
            src={coverImage}
            alt={post.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-display text-lg font-extrabold text-white">{post.title}</h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-white/80">
              {post.destination_country && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {post.destination_city ? `${post.destination_city}, ` : ""}{post.destination_country}
                </span>
              )}
              {duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {duration}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content (when no image, title goes here) */}
      <div className="p-4">
        {!coverImage && (
          <div className="mb-3">
            <h3 className="font-display text-lg font-extrabold">{post.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {post.destination_country && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {post.destination_city ? `${post.destination_city}, ` : ""}{post.destination_country}
                </span>
              )}
              {duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {duration}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Agency info */}
        {company && (
          <button
            onClick={() => onNavigate(`/agency/${company.id}`)}
            className="mb-3 flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-white/[0.04]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/15">
              {company.logo_url ? (
                <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-foreground">{company.name}</p>
              {company.verification_status === "verified" && (
                <p className="flex items-center gap-0.5 text-[10px] font-semibold text-primary">
                  <Shield className="h-2.5 w-2.5" /> Verified
                </p>
              )}
            </div>
          </button>
        )}

        {/* Pricing */}
        <div className="mb-3 flex items-end justify-between">
          <div>
            {post.old_price && discount && (
              <span className="mr-2 text-xs text-muted-foreground line-through">
                {formatPrice(post.old_price, post.currency)}
              </span>
            )}
            <span className="font-display text-2xl font-extrabold text-foreground">
              {formatPrice(post.price ?? 0, post.currency)}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">
              {post.price_type === "per_person" ? "/ person" : "total"}
            </span>
            {travelers > 1 && (
              <p className="mt-0.5 text-xs font-semibold text-primary">
                Est. total for {travelers}: {formatPrice(estimatedTotal, post.currency)}
              </p>
            )}
          </div>
          {discount && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
              -{discount}%
            </span>
          )}
        </div>

        {/* Budget warning */}
        {!withinBudget && budget && (
          <div className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-400">
            {differences.find(d => d.includes("above")) ?? "Slightly above your budget"}
          </div>
        )}

        {/* Included features */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          <FeatureTag included={post.flight_included} icon={Plane} label="Flight" />
          <FeatureTag included={post.hotel_included} icon={Hotel} label="Hotel" />
          <FeatureTag included={post.visa_included} icon={FileCheck} label="Visa" />
          <FeatureTag included={post.airport_transfer_included} icon={Bus} label="Transfer" />
          <FeatureTag included={post.meals_included} icon={Utensils} label="Meals" />
          <FeatureTag included={post.travel_insurance_included} icon={Shield} label="Insurance" />
          <FeatureTag included={post.guide_included} icon={UserCheck} label="Guide" />
        </div>

        {/* Dates */}
        {post.departure_date && (
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Departure: {new Date(post.departure_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            {post.return_date && (
              <span> → Return: {new Date(post.return_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
            )}
          </div>
        )}

        {/* Available seats */}
        {post.available_seats !== null && (
          <div className="mb-3 flex items-center gap-2 text-xs">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            {availability === "available" && <span className="text-green-400">{post.available_seats} seats available</span>}
            {availability === "limited" && <span className="text-amber-400">Only {post.available_seats} seats left!</span>}
            {availability === "sold_out" && <span className="text-red-400">Sold out</span>}
          </div>
        )}

        {/* Differences (closest match) */}
        {differences.length > 0 && (
          <div className="mb-3 space-y-1 rounded-lg bg-white/[0.04] px-3 py-2">
            {differences.map((d, i) => (
              <p key={i} className="text-[11px] text-muted-foreground">• {d}</p>
            ))}
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span key={b} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                {b}
              </span>
            ))}
          </div>
        )}

        {/* Short description */}
        {post.short_description && (
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{post.short_description}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate(`/tour/${post.id}`)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition hover:scale-[1.02] active:scale-95"
          >
            <Eye className="h-3.5 w-3.5" /> View Package
          </button>
          {company && (
            <button
              onClick={() => onNavigate(`/agency/${company.id}`)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card/40 px-3 py-2.5 text-xs font-bold text-foreground transition hover:border-primary/40"
            >
              <Building2 className="h-3.5 w-3.5" /> Agency
            </button>
          )}
          {company && (company.whatsapp || company.telegram || company.contact_phone) && (
            <ContactAgencyButton company={company} />
          )}
          <button
            onClick={onSave}
            className={cn(
              "flex items-center justify-center rounded-xl border px-3 py-2.5 transition",
              saved ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card/40 text-muted-foreground hover:border-primary/40",
            )}
            aria-label="Save package"
          >
            {saved ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Contact Agency Button ────────────────────────────────────

function ContactAgencyButton({ company }: { company: NonNullable<PackageMatch["post"]["company"]> }) {
  const [open, setOpen] = useState(false);
  const channels: { label: string; href: string; icon: typeof Phone }[] = [];

  if (company.whatsapp) {
    channels.push({
      label: "WhatsApp",
      href: company.whatsapp.startsWith("http") ? company.whatsapp : `https://wa.me/${company.whatsapp.replace(/[^0-9]/g, "")}`,
      icon: MessageCircle,
    });
  }
  if (company.telegram) {
    channels.push({
      label: "Telegram",
      href: company.telegram.startsWith("http") ? company.telegram : `https://t.me/${company.telegram.replace("@", "")}`,
      icon: Send,
    });
  }
  if (company.contact_phone) {
    channels.push({ label: "Phone", href: `tel:${company.contact_phone}`, icon: Phone });
  }

  if (channels.length === 0) return null;

  if (channels.length === 1) {
    const SingleIcon = channels[0].icon;
    return (
      <a
        href={channels[0].href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card/40 px-3 py-2.5 text-xs font-bold text-foreground transition hover:border-primary/40"
      >
        <SingleIcon className="h-3.5 w-3.5" /> Contact
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card/40 px-3 py-2.5 text-xs font-bold text-foreground transition hover:border-primary/40"
      >
        <MessageCircle className="h-3.5 w-3.5" /> Contact
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute right-0 top-11 z-[61] w-40 overflow-hidden rounded-xl border border-white/[0.08] bg-popover/95 shadow-2xl backdrop-blur-xl"
            >
              {channels.map((ch) => (
                <a
                  key={ch.label}
                  href={ch.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-foreground transition hover:bg-white/[0.04]"
                >
                  <ch.icon className="h-3.5 w-3.5 text-primary" /> {ch.label}
                </a>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Feature Tag ──────────────────────────────────────────────

function FeatureTag({
  included,
  icon: Icon,
  label,
}: {
  included: boolean;
  icon: typeof Plane;
  label: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        included ? "bg-primary/10 text-primary" : "bg-white/[0.03] text-muted-foreground/40",
      )}
    >
      {included ? <Icon className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

// ── Structured Filters Panel ─────────────────────────────────

function StructuredFilters({
  filters,
  onChange,
}: {
  filters: Partial<TravelCriteria>;
  onChange: (f: Partial<TravelCriteria>) => void;
}) {
  const update = (key: keyof TravelCriteria, value: unknown) => {
    onChange({ ...filters, [key]: value });
  };

  const toggleIncluded = (opt: string) => {
    const current = filters.includedPreferences ?? [];
    update("includedPreferences", current.includes(opt)
      ? current.filter((p) => p !== opt)
      : [...current, opt]);
  };

  return (
    <div className="space-y-3 px-2 pb-2 pt-1">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Destination country"
          value={filters.destination ?? ""}
          onChange={(e) => update("destination", e.target.value || undefined)}
          className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Destination city"
          value={filters.destinationCity ?? ""}
          onChange={(e) => update("destinationCity", e.target.value || undefined)}
          className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Departure city"
          value={filters.departureCity ?? ""}
          onChange={(e) => update("departureCity", e.target.value || undefined)}
          className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none"
        />
        <select
          value={filters.currency ?? "USD"}
          onChange={(e) => update("currency", e.target.value)}
          className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-foreground focus:border-primary/40 focus:outline-none"
        >
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-0.5 block text-[10px] font-semibold text-muted-foreground">Travelers</label>
          <input
            type="number"
            min={1}
            max={20}
            value={filters.travelers ?? 1}
            onChange={(e) => update("travelers", Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-foreground focus:border-primary/40 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-semibold text-muted-foreground">Duration (days)</label>
          <input
            type="number"
            min={1}
            max={90}
            value={filters.durationDays ?? ""}
            onChange={(e) => update("durationDays", e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-foreground focus:border-primary/40 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-semibold text-muted-foreground">Budget</label>
          <input
            type="number"
            min={0}
            value={filters.budget ?? ""}
            onChange={(e) => update("budget", e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-foreground focus:border-primary/40 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-0.5 block text-[10px] font-semibold text-muted-foreground">Departure date</label>
          <input
            type="date"
            value={filters.travelDates?.start ?? ""}
            onChange={(e) => update("travelDates", { ...filters.travelDates, start: e.target.value || undefined })}
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-foreground focus:border-primary/40 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-semibold text-muted-foreground">Return date</label>
          <input
            type="date"
            value={filters.travelDates?.end ?? ""}
            onChange={(e) => update("travelDates", { ...filters.travelDates, end: e.target.value || undefined })}
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-foreground focus:border-primary/40 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-0.5 block text-[10px] font-semibold text-muted-foreground">Travel style</label>
        <select
          value={filters.travelStyle ?? ""}
          onChange={(e) => update("travelStyle", e.target.value || undefined)}
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-foreground focus:border-primary/40 focus:outline-none"
        >
          <option value="">Any</option>
          {TRAVEL_STYLES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {/* Included preferences */}
      <div>
        <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Must include</label>
        <div className="flex flex-wrap gap-1.5">
          {INCLUDED_OPTIONS.map((opt) => {
            const active = (filters.includedPreferences ?? []).includes(opt);
            return (
              <button
                key={opt}
                onClick={() => toggleIncluded(opt)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize transition",
                  active ? "bg-primary text-primary-foreground" : "bg-white/[0.04] text-muted-foreground hover:text-foreground",
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="mt-7 space-y-4">
      {/* Intro skeleton */}
      <div className="glass-strong relative overflow-hidden rounded-2xl p-5">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="mt-3 h-3 w-full rounded bg-muted/60" />
        <div className="mt-2 h-3 w-1/2 rounded bg-muted/60" />
        <div className="absolute inset-0 -translate-x-full" style={{ background: "linear-gradient(90deg, transparent, hsl(40 60% 60% / 0.08), transparent)", animation: "shimmer 1.6s infinite" }} />
      </div>

      {/* Package card skeleton */}
      {[0, 1].map((i) => (
        <div key={i} className="glass-strong relative overflow-hidden rounded-2xl">
          <div className="h-44 w-full bg-muted" />
          <div className="p-4">
            <div className="h-5 w-3/4 rounded bg-muted" />
            <div className="mt-3 h-4 w-1/3 rounded bg-muted/60" />
            <div className="mt-3 flex gap-1.5">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="h-5 w-14 rounded-full bg-muted/40" />
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <div className="h-9 flex-1 rounded-xl bg-muted/40" />
              <div className="h-9 w-20 rounded-xl bg-muted/40" />
            </div>
          </div>
          <div className="absolute inset-0 -translate-x-full" style={{ background: "linear-gradient(90deg, transparent, hsl(40 60% 60% / 0.08), transparent)", animation: "shimmer 1.6s infinite", animationDelay: `${i * 0.3}s` }} />
        </div>
      ))}
    </div>
  );
}

// ── Slot (for itinerary) ─────────────────────────────────────

function Slot({ icon: Icon, label, text }: { icon: typeof Sun; label: string; text: string }) {
  if (!text) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
      <div>
        <span className="text-xs font-semibold text-foreground">{label}: </span>
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}

// ── Suggestions ──────────────────────────────────────────────

const SUGGESTIONS = [
  "I want to travel to Dubai with my wife in September for 5 days. Budget around $1200.",
  "5 relaxing days in Turkey, all-inclusive hotel, flight from Tashkent, under $800 per person.",
  "Honeymoon trip to South Korea, 7 days, luxury hotels, flights included, $3000 budget.",
  "Family vacation to Saudi Arabia for Umrah, 10 days, visa and hotel included.",
];
