import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Search, X, Building2, ShieldCheck, MapPin, Package as PackageIcon, ArrowRight, Calendar, Clock, Users, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense, lazy, useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import DestinationModal from "@/components/DestinationModal";
import GlobeFilterPanel, { FilterButton } from "@/components/GlobeFilterPanel";
import TravelOptionsPanel from "@/components/TravelOptionsPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useTravel } from "@/contexts/TravelContext";
import { COUNTRIES, type Country } from "@/data/countries";
import { fetchPublishedAgencies, fetchAgencyServiceCount, type ConsultingCompany } from "@/lib/consulting";
import { fetchPublishedTourPosts, formatPrice, calculateDiscount, calculateDuration, type TourPost } from "@/lib/tour-posts";
import PackageFinder from "@/components/PackageFinder";

const OXEN_LOGO = "/logo.png";

const Globe = lazy(() => import("@/components/Globe"));

/* ------------------------------------------------------------------ */
/*  Modal flow steps                                                   */
/* ------------------------------------------------------------------ */

type ModalStep = "closed" | "destination" | "options";

/* ── Tour Agencies section ─────────────────────────────────────────── */

function AgencyCard({ agency, index }: { agency: ConsultingCompany; index: number }) {
  const navigate = useNavigate();
  const { data: serviceCount } = useQuery({
    queryKey: ["agency-service-count", agency.id],
    queryFn: () => fetchAgencyServiceCount(agency.id),
    staleTime: 60_000,
  });

  const specialties = agency.specialties ?? [];
  const isVerified = agency.verification_status === "verified";

  return (
    <motion.article
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring" as const, stiffness: 260, damping: 24, mass: 0.8 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/agency/${agency.id}`)}
      className="group relative w-[280px] shrink-0 cursor-pointer overflow-hidden rounded-3xl"
    >
      <div className="glass-card overflow-hidden rounded-3xl">
        {/* Cover image */}
        <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-transparent">
          {agency.cover_image_url ? (
            <img src={agency.cover_image_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/30">
              <Building2 className="h-8 w-8" />
            </div>
          )}
        </div>

        {/* Logo + name */}
        <div className="relative px-4 pb-4">
          <div className="-mt-8 flex items-end gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border-3 border-card bg-card" style={{ borderWidth: 3 }}>
              {agency.logo_url ? (
                <img src={agency.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/15 text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="mb-1 flex flex-col gap-1">
              {isVerified && (
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <ShieldCheck className="h-2.5 w-2.5" /> Verified
                </span>
              )}
            </div>
          </div>

          <h3 className="mt-2 truncate font-display text-sm font-bold text-foreground">{agency.name}</h3>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {[agency.city, agency.country].filter(Boolean).join(", ") || "Location not set"}
          </div>

          {agency.short_description && (
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{agency.short_description}</p>
          )}

          {specialties.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {specialties.slice(0, 3).map((s) => (
                <span key={s} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{s}</span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
              <PackageIcon className="h-3 w-3" />
              {serviceCount ?? 0} {(serviceCount ?? 0) === 1 ? "service" : "services"}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary transition group-hover:gap-1.5">
              View Agency <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function TourAgenciesSection() {
  const { t } = useLanguage();
  const { data: agencies, isLoading } = useQuery({
    queryKey: ["published-agencies"],
    queryFn: () => fetchPublishedAgencies(),
    staleTime: 60_000,
    retry: false,
  });

  // Don't render the section at all if there are no agencies
  if (!isLoading && (!agencies || agencies.length === 0)) return null;

  return (
    <section className="relative z-10 pt-6 pb-10">
      <div className="mb-4 flex items-center justify-between px-5">
        <div>
          <h2 className="font-display text-lg font-bold">{t("home.tourAgencies", "Trusted Travel Agencies")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("home.tourAgenciesDesc", "Real agencies you can trust for your next trip")}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 px-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[260px] w-[280px] shrink-0 animate-pulse rounded-3xl bg-white/[0.04]" />
          ))}
        </div>
      ) : (
        <div className="-mx-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-4 px-5">
            {agencies!.map((agency, i) => (
              <AgencyCard key={agency.id} agency={agency} index={i} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Tour Packages section (below globe) ────────────────────────────── */

type TourFilter = "all" | "popular" | "upcoming" | "budget";

function TourPackageCard({ post, index }: { post: TourPost; index: number }) {
  const navigate = useNavigate();
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
      <div className="glass-card overflow-hidden rounded-3xl">
        {/* Cover image */}
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

        {/* Content */}
        <div className="p-4">
          {post.destination_country && (
            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
              <MapPin className="h-3 w-3" />
              {[post.destination_city, post.destination_country].filter(Boolean).join(", ")}
            </p>
          )}
          <h3 className="truncate font-display text-sm font-bold text-foreground">{post.title}</h3>

          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            {duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{duration}</span>}
            {post.departure_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(post.departure_date).toLocaleDateString("en", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>

          {/* Price */}
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
            {post.available_seats !== null && post.available_seats <= 5 && (
              <span className={"rounded-full px-2 py-0.5 text-[9px] font-bold " + (post.available_seats === 0 ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400")}>
                {post.available_seats === 0 ? "Sold out" : `${post.available_seats} left`}
              </span>
            )}
          </div>

          {/* Agency */}
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
                View Tour <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function TourPackagesSection({
  selectedCountry,
  onClearCountry,
}: {
  selectedCountry: string | null;
  onClearCountry: () => void;
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TourFilter>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch published tour posts (filtered by selected country from globe)
  const { data: posts, isLoading } = useQuery({
    queryKey: ["tour-posts-published", selectedCountry],
    queryFn: () => fetchPublishedTourPosts(selectedCountry ?? undefined, 24),
    staleTime: 60_000,
    retry: false,
  });

  // Apply lightweight filters on the client side
  const filtered = useMemo(() => {
    if (!posts || posts.length === 0) return [];
    const now = Date.now();
    switch (filter) {
      case "popular":
        return [...posts].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 12);
      case "upcoming":
        return posts
          .filter((p) => p.departure_date && new Date(p.departure_date).getTime() > now)
          .sort((a, b) => new Date(a.departure_date!).getTime() - new Date(b.departure_date!).getTime())
          .slice(0, 12);
      case "budget":
        return [...posts].sort((a, b) => (a.price ?? 0) - (b.price ?? 0)).slice(0, 12);
      default:
        return posts.slice(0, 12);
    }
  }, [posts, filter]);

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  // Don't render the section if there are no published posts (and not loading)
  if (!isLoading && (!filtered || filtered.length === 0)) return null;

  const filters: { key: TourFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "popular", label: "Popular" },
    { key: "upcoming", label: "Upcoming" },
    { key: "budget", label: "Budget" },
  ];

  return (
    <section className="relative z-10 pt-6 pb-10">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between px-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold truncate sm:text-lg">
            {selectedCountry ? `Tours in ${selectedCountry}` : "Tour Packages"}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {selectedCountry
              ? "Discover offers for your selected destination"
              : "Discover offers from travel agencies on OXEN."}
          </p>
        </div>
        {/* Scroll arrows (desktop) */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <button onClick={() => scrollBy(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:bg-white/12 hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => scrollBy(1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:bg-white/12 hover:text-foreground">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Country filter banner */}
      {selectedCountry && (
        <div className="mb-3 flex items-center gap-2 px-4 sm:px-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <MapPin className="h-3 w-3" /> {selectedCountry}
            <button onClick={onClearCountry} className="ml-1 text-primary/70 hover:text-primary">
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}

      {/* Filter chips */}
      {!selectedCountry && (
        <div className="mb-3 flex gap-1.5 px-5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                "rounded-full px-3 py-1 text-xs font-semibold transition " +
                (filter === f.key ? "bg-primary/15 text-primary" : "bg-white/[0.04] text-muted-foreground hover:text-foreground")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="flex items-center gap-3 px-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[340px] w-[300px] shrink-0 animate-pulse rounded-3xl bg-white/[0.04]" />
          ))}
        </div>
      )}

      {/* Cards carousel */}
      {!isLoading && filtered.length > 0 && (
        <div ref={scrollRef} className="-mx-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-4 px-5">
            {filtered.map((post, i) => (
              <TourPackageCard key={post.id} post={post} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state — no fake tours */}
      {!isLoading && (!posts || posts.length === 0) && (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-muted-foreground">No tour packages available yet.</p>
          <p className="mt-1 text-xs text-muted-foreground/70">New offers from OXEN travel agencies will appear here.</p>
        </div>
      )}
    </section>
  );
}

/* ── Search overlay ────────────────────────────────────────────────── */

function SearchOverlay({
  query,
  setQuery,
  onSelect,
  onClose,
}: {
  query: string;
  setQuery: (v: string) => void;
  onSelect: (country: Country) => void;
  onClose: () => void;
}) {
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q) ||
        c.cities.some((city) => city.name.toLowerCase().includes(q)),
    ).slice(0, 8);
  }, [query]);

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
        className="mx-auto mt-20 w-full max-w-md px-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search bar */}
        <div className="glass-strong flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-2xl">
          <Search className="h-5 w-5 shrink-0 text-white/40" strokeWidth={2} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by country, city, or attraction..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/50 transition hover:bg-white/20 hover:text-white"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
            className="glass-strong mt-3 overflow-hidden rounded-2xl shadow-2xl"
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
                <Sparkles className="h-4 w-4 text-white/20" strokeWidth={2} />
              </motion.button>
            ))}
          </motion.div>
        )}

        {query.trim() && results.length === 0 && (
          <div className="glass-strong mt-3 rounded-2xl px-4 py-8 text-center shadow-2xl">
            <p className="text-sm text-white/40">No destinations found for "{query}"</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Main Index page ───────────────────────────────────────────────── */

export default function Index() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isOpen: sidebarOpen } = useSidebar();
  const { visited, wishlist } = useTravel();

  const visitedSet = useMemo(() => new Set(visited), [visited]);
  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);

  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [modalStep, setModalStep] = useState<ModalStep>("closed");
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [zoomTarget, setZoomTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);

  const handleCountrySelect = useCallback((country: Country) => {
    setSelectedCountry(country);
    setModalStep("destination");
  }, []);

  const handleShowOptions = useCallback(() => {
    setModalStep("options");
  }, []);

  const handleCloseAll = useCallback(() => {
    setModalStep("closed");
    setTimeout(() => setSelectedCountry(null), 350);
  }, []);

  // Tapping ocean on the globe closes the open panel (but keeps the globe
  // fully interactive — rotate/drag/zoom are never blocked).
  const handleBackgroundTap = useCallback(() => {
    if (modalStep !== "closed") handleCloseAll();
  }, [modalStep, handleCloseAll]);

  const handleSearchSelect = useCallback((country: Country) => {
    setSelectedCountry(country);
    setModalStep("destination");
    setZoomTarget({ lat: country.lat, lng: country.lng });
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  return (
    <div className="relative">
      {/* ── Hero globe ─────────────────────────────── */}
      <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden">
        <motion.div
          className="absolute inset-0 z-0"
          animate={{ x: sidebarOpen ? "28%" : "0%" }}
          transition={{ type: "spring", stiffness: 240, damping: 27, mass: 1 }}
        >
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Loading globe…
              </div>
            }
          >
            <Globe
              onCountrySelect={handleCountrySelect}
              onBackgroundTap={handleBackgroundTap}
              selectedCountry={selectedCountry}
              zoomTarget={zoomTarget}
              visitedIds={visitedSet}
              wishlistIds={wishlistSet}
            />
          </Suspense>
        </motion.div>

        {/* Top bar — logo + search */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 pt-4 sm:px-5 sm:pt-6"
        >
          <div className="flex items-center gap-2">
            <img
              src={OXEN_LOGO}
              alt="OXEN"
              className="h-8 w-8 rounded-xl object-contain shadow-lg sm:h-9 sm:w-9"
              loading="lazy"
              onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
            />
            <span className="font-display text-lg font-extrabold tracking-wide sm:text-xl">OXEN</span>
          </div>

          {/* Search + Filter buttons */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
            <FilterButton onClick={() => setFilterOpen(true)} />
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-2 backdrop-blur-xl border border-white/10 text-sm text-white/60 transition hover:bg-white/12 hover:text-white active:scale-95"
              aria-label="Search destinations"
            >
              <Search className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">Search destinations</span>
            </button>
          </div>
        </motion.div>

        {/* Bottom hero copy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="pointer-events-none absolute bottom-[6%] left-0 right-0 z-20 px-4 text-center sm:px-6"
        >
          <h1 className="font-display text-3xl font-extrabold leading-tight text-balance sm:text-5xl">
            {t("hero.title.line1", "See the world")}
            <br />
            <span className="text-gold-gradient">{t("hero.title.line2", "from above.")}</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-xs text-muted-foreground sm:mt-3 sm:text-sm">
            {t("hero.subtitle", "Spin the globe, discover countries, and let AI plan your next great escape.")}
          </p>
          <button
            onClick={() => navigate(selectedCountry ? `/planner?country=${encodeURIComponent(selectedCountry.name)}` : "/planner")}
            className="gold-gradient pointer-events-auto mx-auto mt-4 flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-xl transition hover:scale-105 active:scale-95 sm:mt-5 sm:px-6 sm:py-3 sm:text-sm"
          >
            <Sparkles className="h-4 w-4" />
            {t("hero.cta", "Plan a trip with AI")}
          </button>
        </motion.div>
      </section>

      {/* ── Package Finder (directly under globe) ──── */}
      <PackageFinder />

      {/* ── Tour Packages (below finder) ──────────── */}
      <TourPackagesSection selectedCountry={selectedCountry?.name ?? null} onClearCountry={() => { setSelectedCountry(null); setModalStep("closed"); }} />

      {/* ── Tour Agencies ──────────────────────────── */}
      <TourAgenciesSection />

      {/* ── Globe filter panel ─────────────────────── */}
      <GlobeFilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onViewGlobe={(country) => {
          setSelectedCountry(country);
          setModalStep("destination");
          setZoomTarget({ lat: country.lat, lng: country.lng });
        }}
      />

      {/* ── Search overlay ─────────────────────────── */}
      <AnimatePresence>
        {searchOpen && (
          <SearchOverlay
            query={searchQuery}
            setQuery={setSearchQuery}
            onSelect={handleSearchSelect}
            onClose={() => setSearchOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Modals ──────────────────────────────────── */}
      <AnimatePresence>
        {selectedCountry && modalStep === "destination" && (
          <DestinationModal
            key={`dest-${selectedCountry.id}`}
            country={selectedCountry}
            open
            onClose={handleCloseAll}
            onShowOptions={handleShowOptions}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCountry && modalStep === "options" && (
          <TravelOptionsPanel
            key={`opts-${selectedCountry.id}`}
            country={selectedCountry}
            open
            onClose={handleCloseAll}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
