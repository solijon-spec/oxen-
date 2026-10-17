/**
 * PackageFinder — compact Liquid Glass search panel that sits directly
 * under the OXEN globe. Lets users pick From country, To country, and
 * a budget, then queries REAL published tour packages from Supabase.
 *
 * Reuses:
 *  - COUNTRIES from @/data/countries (no duplicate country DB)
 *  - usePreferences() for currency
 *  - findTourPackages() from @/lib/tour-posts (queries consulting_posts)
 *  - TourPost card layout matching the existing TourPackageCard design
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Search, X, MapPin, Plane, Wallet, ArrowRight, Loader2,
  Building2, ShieldCheck, Clock, Calendar, ImageIcon, Package as PackageIcon,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { COUNTRIES, type Country } from "@/data/countries";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import {
  findTourPackages, formatPrice, calculateDuration, calculateDiscount,
  type TourPost,
} from "@/lib/tour-posts";

/* ── Country picker modal (reuses SearchOverlay pattern from Index) ── */

function CountryPicker({
  open, query, setQuery, onSelect, onClose, title,
}: {
  open: boolean;
  query: string;
  setQuery: (v: string) => void;
  onSelect: (country: Country) => void;
  onClose: () => void;
  title: string;
}) {
  const results = useMemo(() => {
    if (!query.trim()) return COUNTRIES.slice(0, 12);
    const q = query.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ type: "spring" as const, stiffness: 300, damping: 28 }}
        className="mx-auto mt-16 w-full max-w-md px-4 sm:mt-20 sm:px-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-2 text-center text-sm font-semibold text-white/60">{title}</p>
        <div className="glass-strong flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-2xl">
          <Search className="h-5 w-5 shrink-0 text-white/40" strokeWidth={2} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/50 transition hover:bg-white/20 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
            className="glass-strong mt-3 max-h-[50vh] overflow-y-auto rounded-2xl shadow-2xl"
          >
            {results.map((country, i) => (
              <motion.button
                key={country.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.2 }}
                onClick={() => onSelect(country)}
                className="flex w-full items-center gap-3 border-b border-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.05] last:border-0"
              >
                <span className="text-2xl">{country.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{country.name}</p>
                  <p className="truncate text-xs text-white/40">
                    {country.capital} · {country.continent}
                  </p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
        {query.trim() && results.length === 0 && (
          <div className="glass-strong mt-3 rounded-2xl px-4 py-8 text-center shadow-2xl">
            <p className="text-sm text-white/40">No countries found for "{query}"</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Result card (matches existing TourPackageCard design) ── */

function FinderPackageCard({
  post, index, isAlternative,
}: {
  post: TourPost;
  index: number;
  isAlternative?: boolean;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const duration = calculateDuration(post.departure_date, post.return_date);
  const discount = calculateDiscount(post.price ?? 0, post.old_price);
  const company = post.company;
  const isVerified = company?.verification_status === "verified";

  return (
    <motion.article
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring" as const, stiffness: 260, damping: 24, mass: 0.8 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/tour/${post.id}`)}
      className="group relative w-[300px] shrink-0 cursor-pointer overflow-hidden rounded-3xl"
    >
      {isAlternative && (
        <div className="absolute left-2 top-2 z-10 rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[10px] font-bold text-white">
          {t("packageFinder.alternative", "Alternative")}
        </div>
      )}
      <div className="glass-card overflow-hidden rounded-3xl">
        <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-transparent">
          {post.cover_image ? (
            <img src={post.cover_image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/30">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
          {discount && (
            <div className="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
              -{discount}%
            </div>
          )}
        </div>
        <div className="p-4">
          {post.destination_country && (
            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
              <MapPin className="h-3 w-3" />
              {[post.destination_city, post.destination_country].filter(Boolean).join(", ")}
            </p>
          )}
          <h3 className="truncate font-display text-sm font-bold text-foreground">{post.title}</h3>
          {post.short_description && (
            <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{post.short_description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            {duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{duration}</span>}
            {post.departure_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(post.departure_date).toLocaleDateString("en", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              {post.old_price && post.old_price > (post.price ?? 0) && (
                <span className="mr-1.5 text-[11px] text-muted-foreground line-through">
                  {formatPrice(post.old_price, post.currency)}
                </span>
              )}
              <span className="font-display text-lg font-bold text-foreground">
                {post.price ? formatPrice(post.price, post.currency) : "—"}
              </span>
            </div>
          </div>
          {company && (
            <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3">
              <div className="h-7 w-7 shrink-0 overflow-hidden rounded-lg bg-primary/15">
                {company.logo_url ? (
                  <img src={company.logo_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-primary">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-[11px] font-semibold text-foreground">{company.name}</p>
                  {isVerified && <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />}
                </div>
              </div>
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-primary transition group-hover:gap-1.5">
                {t("packageFinder.viewDetails", "View Details")} <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

/* ── Main PackageFinder component ── */

export default function PackageFinder() {
  const { t } = useLanguage();
  const { currency, currencyMeta } = usePreferences();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [fromCountry, setFromCountry] = useState<Country | null>(null);
  const [toCountry, setToCountry] = useState<Country | null>(null);
  const [budgetStr, setBudgetStr] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState<"from" | "to" | null>(null);
  const [pickerQuery, setPickerQuery] = useState<string>("");

  const [searching, setSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [withinBudget, setWithinBudget] = useState<TourPost[]>([]);
  const [alternatives, setAlternatives] = useState<TourPost[]>([]);

  const handleSelectCountry = useCallback((country: Country) => {
    if (pickerOpen === "from") setFromCountry(country);
    else if (pickerOpen === "to") setToCountry(country);
    setPickerOpen(null);
    setPickerQuery("");
  }, [pickerOpen]);

  const handleSearch = useCallback(async () => {
    if (!toCountry || !budgetStr) return;
    const budget = parseFloat(budgetStr);
    if (isNaN(budget) || budget <= 0) return;

    setSearching(true);
    setHasSearched(true);
    try {
      const result = await findTourPackages(toCountry.name, budget, currency);
      setWithinBudget(result.withinBudget);
      setAlternatives(result.alternatives);
    } catch (err) {
      console.error("PackageFinder search error:", err);
      setWithinBudget([]);
      setAlternatives([]);
    } finally {
      setSearching(false);
    }
  }, [toCountry, budgetStr, currency]);

  const budgetNum = parseFloat(budgetStr);
  const canSearch = !!fromCountry && !!toCountry && !isNaN(budgetNum) && budgetNum > 0;

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <section className="relative z-10 px-5 pt-2 pb-6">
      {/* ── Search panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mx-auto max-w-4xl"
      >
        <div className="glass rounded-3xl p-5 sm:p-6">
          {/* Title */}
          <div className="mb-4 flex items-center gap-2">
            <PackageIcon className="h-5 w-5 text-primary" />
            <h2 className="font-display text-base font-bold text-foreground">
              {t("packageFinder.title", "Find Tour Packages")}
            </h2>
          </div>

          {/* Fields — row on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* From */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                {t("packageFinder.from", "From")}
              </label>
              <button
                onClick={() => { setPickerOpen("from"); setPickerQuery(""); }}
                className="flex w-full items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm transition hover:bg-white/[0.05]"
              >
                {fromCountry ? (
                  <>
                    <span className="text-xl">{fromCountry.flag}</span>
                    <span className="truncate font-medium text-foreground">{fromCountry.name}</span>
                  </>
                ) : (
                  <>
                    <Plane className="h-4 w-4 text-muted-foreground/50" />
                    <span className="text-muted-foreground/60">{t("packageFinder.fromPlaceholder", "Select your country")}</span>
                  </>
                )}
              </button>
            </div>

            {/* To */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                {t("packageFinder.to", "To")}
              </label>
              <button
                onClick={() => { setPickerOpen("to"); setPickerQuery(""); }}
                className="flex w-full items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm transition hover:bg-white/[0.05]"
              >
                {toCountry ? (
                  <>
                    <span className="text-xl">{toCountry.flag}</span>
                    <span className="truncate font-medium text-foreground">{toCountry.name}</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 text-muted-foreground/50" />
                    <span className="text-muted-foreground/60">{t("packageFinder.toPlaceholder", "Where do you want to go?")}</span>
                  </>
                )}
              </button>
            </div>

            {/* Budget */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                {t("packageFinder.budget", "Budget")}
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 transition focus-within:border-primary/30">
                <Wallet className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="any"
                  value={budgetStr}
                  onChange={(e) => setBudgetStr(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder={t("packageFinder.budgetPlaceholder", "800")}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">{currencyMeta.code}</span>
              </div>
            </div>
          </div>

          {/* Search button */}
          <button
            onClick={handleSearch}
            disabled={!canSearch || searching}
            className="gold-gradient mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition enabled:hover:scale-[1.02] enabled:active:scale-95 disabled:opacity-40 disabled:saturate-50"
          >
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("packageFinder.searching", "Searching…")}
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                {t("packageFinder.findButton", "Find Tour Packages")}
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* ── Results ── */}
      {hasSearched && !searching && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto mt-6 max-w-4xl"
        >
          {/* Within budget */}
          {withinBudget.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {t("packageFinder.resultsTitle", "Recommended Tour Packages")}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {toCountry?.name} · {t("packageFinder.withinBudget", "within")} {currencyMeta.symbol}{budgetNum.toLocaleString()} {currencyMeta.code}
                  </p>
                </div>
                <div className="hidden items-center gap-1.5 sm:flex">
                  <button onClick={() => scrollBy(-1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:bg-white/12 hover:text-foreground">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => scrollBy(1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:bg-white/12 hover:text-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div ref={scrollRef} className="-mx-5 overflow-x-auto no-scrollbar">
                <div className="flex gap-4 px-5">
                  {withinBudget.map((post, i) => (
                    <FinderPackageCard key={post.id} post={post} index={i} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No within-budget results + alternatives */}
          {withinBudget.length === 0 && (
            <div className="mb-4 rounded-2xl bg-white/[0.03] border border-white/[0.04] px-5 py-6 text-center">
              <p className="text-sm font-semibold text-foreground">
                {t("packageFinder.noResults", "No exact packages found within your budget.")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("packageFinder.noResultsDesc", "Try increasing your budget or explore alternatives below.")}
              </p>
            </div>
          )}

          {/* Alternatives */}
          {alternatives.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-display text-base font-bold text-foreground">
                {t("packageFinder.alternativesTitle", "Closest Alternatives")}
              </h3>
              <div className="-mx-5 overflow-x-auto no-scrollbar">
                <div className="flex gap-4 px-5">
                  {alternatives.map((post, i) => (
                    <FinderPackageCard key={post.id} post={post} index={i} isAlternative />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Absolutely no results at all */}
          {withinBudget.length === 0 && alternatives.length === 0 && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.04] px-5 py-12 text-center">
              <p className="text-sm font-semibold text-foreground">
                {t("packageFinder.noPackages", "No tour packages found for this destination.")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("packageFinder.noPackagesDesc", "New offers from OXEN travel agencies will appear here.")}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Country picker modal ── */}
      <AnimatePresence>
        {pickerOpen && (
          <CountryPicker
            open={!!pickerOpen}
            query={pickerQuery}
            setQuery={setPickerQuery}
            onSelect={handleSelectCountry}
            onClose={() => { setPickerOpen(null); setPickerQuery(""); }}
            title={pickerOpen === "from"
              ? t("packageFinder.from", "From")
              : t("packageFinder.to", "To")}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
