import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Play,
  Search,
  Share2,
  Bookmark,
  X,
  GraduationCap,
  Award,
  Users,
  Sparkles,
  ChevronDown,
  SlidersHorizontal,
  Trophy,
  Coins,
  Eye,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Loader2,
  MapPin,
  Globe2,
} from "lucide-react";
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import DestinationModal from "@/components/DestinationModal";
import { OptimizedImage } from "@/components/OptimizedImage";
import UniversityModal from "@/components/UniversityModal";
import type { UniversityMarkerData } from "@/components/Globe";
import VideoPlayer from "@/components/VideoPlayer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useTravel } from "@/contexts/TravelContext";
import { useUniversity } from "@/contexts/UniversityContext";
import { COUNTRIES, type Country } from "@/data/countries";
import {
  UNIVERSITIES,
  UNIVERSITY_VIDEO_CATEGORIES,
  searchUniversities,
  getUniversity,
  type University,
  type UniversityPost,
} from "@/data/universities";
import { getUniversityRecommendations, type UniversityAIInput, type UniversityRecommendation } from "@/lib/uniAI";

const OXEN_LOGO = "/logo.png";
const Globe = lazy(() => import("@/components/Globe"));

/* ── Filter state ────────────────────────────────────────────────── */

interface FilterState {
  country: string;
  tuitionMax: string;
  rankingMax: string;
  language: string;
  hasScholarship: boolean;
  degreeType: string;
  uniType: string;
  ieltsRequired: boolean;
  toeflRequired: boolean;
  satRequired: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  country: "",
  tuitionMax: "",
  rankingMax: "",
  language: "",
  hasScholarship: false,
  degreeType: "",
  uniType: "",
  ieltsRequired: false,
  toeflRequired: false,
  satRequired: false,
};

type SortOption = "highest-ranking" | "lowest-tuition" | "most-popular" | "most-scholarships" | "recently-added";

/* ── University discover card ─────────────────────────────────────── */

function UniversityDiscoverCardInner({ uni, index }: { uni: University; index: number }) {
  const navigate = useNavigate();
  const { isWishlisted, toggleWishlist } = useUniversity();
  const [saved, setSaved] = useState<boolean>(isWishlisted(uni.id));

  const handleSave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(uni.id);
    setSaved((prev) => !prev);
  }, [toggleWishlist, uni.id]);

  const handleNavigate = useCallback(() => {
    navigate(`/universities/${uni.id}`);
  }, [navigate, uni.id]);

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ title: uni.name, text: uni.shortDescription }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`Check out ${uni.name} on OXEN!`);
      toast.success("Link copied");
    }
  }, [uni.name, uni.shortDescription]);

  return (
    <motion.article
      initial={{ opacity: 0, x: 48, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        delay: index * 0.07,
        type: "spring" as const,
        stiffness: 280,
        damping: 26,
        mass: 0.85,
      }}
      whileTap={{ scale: 0.97 }}
      onClick={handleNavigate}
      className="feed-card group relative w-[260px] shrink-0 cursor-pointer overflow-hidden rounded-3xl"
    >
      <div className="relative h-[340px] w-full overflow-hidden">
        <OptimizedImage
          src={uni.coverImage}
          alt={uni.name}
          placeholderType="university"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* QS Ranking badge */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-md">
          <Trophy className="h-3 w-3 text-amber-400" strokeWidth={2} />
          <span className="text-xs font-bold text-amber-400">QS #{uni.qsRanking}</span>
        </div>

        {/* Save button */}
        <div className="absolute right-0 top-0 flex flex-col gap-2 p-3">
          <button
            onClick={handleShare}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/70 backdrop-blur-md transition hover:bg-black/60 hover:text-white active:scale-90"
            aria-label="Share"
          >
            <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button
            onClick={handleSave}
            className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90 ${
              saved ? "bg-amber-500/30 text-amber-400" : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white"
            }`}
            aria-label="Save"
          >
            <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-amber-400" : ""}`} strokeWidth={2} />
          </button>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-white/70">
            <span className="text-base">{uni.flag}</span>
            <span>{uni.city}, {uni.country}</span>
          </div>
          <p className="mb-3 line-clamp-2 text-base font-bold text-white">{uni.name}</p>
          <div className="flex items-center gap-3 text-xs text-white/70">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {uni.studentsCount >= 1000 ? `${(uni.studentsCount / 1000).toFixed(0)}K` : uni.studentsCount}
            </span>
            <span className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              {uni.tuition.split("/")[0]}
            </span>
            {uni.hasScholarship && (
              <span className="flex items-center gap-1 text-amber-400">
                <Award className="h-3 w-3" />
                Scholarship
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

const UniversityDiscoverCard = React.memo(UniversityDiscoverCardInner);

/* ── University post card (Instagram-style) ───────────────────────── */

function UniversityPostCardInner({ post, index }: { post: UniversityPost; index: number }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState<boolean>(post.liked ?? false);
  const [likeCount, setLikeCount] = useState<number>(post.likes);
  const [saved, setSaved] = useState<boolean>(post.saved ?? false);
  const [showVideo, setShowVideo] = useState<boolean>(false);

  const toggleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  }, []);

  const toggleSave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved((prev) => !prev);
  }, []);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring" as const, stiffness: 260, damping: 24 }}
      className="glass-strong group relative w-full overflow-hidden rounded-3xl"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <OptimizedImage
          src={post.coverUrl}
          alt={`${post.city}, ${post.country}`}
          placeholderType="post"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {post.isVideo && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowVideo(true); }}
            className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition group-hover:scale-110 active:scale-90"
          >
            <Play className="h-6 w-6 fill-white text-white ml-0.5" strokeWidth={0} />
          </button>
        )}

        <div className="absolute left-0 right-0 top-0 flex items-center gap-2.5 p-4">
          <OptimizedImage
            src={post.avatarUrl}
            alt={post.username}
            placeholderType="avatar"
            className="h-9 w-9 rounded-full border-2 border-white/30 object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-bold text-white">{post.username}</p>
            <p className="truncate text-xs text-white/60">{post.flag} {post.city}, {post.country}</p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="mb-3 line-clamp-2 text-sm text-white/85">{post.caption}</p>
          <div className="flex items-center gap-4">
            <button onClick={toggleLike} className="flex items-center gap-1.5 transition active:scale-90">
              <Heart className={liked ? "h-4 w-4 fill-red-500 text-red-500" : "h-4 w-4 text-white/80"} strokeWidth={2} />
              <span className="text-xs font-semibold text-white/80">
                {likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount}
              </span>
            </button>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-white/80" strokeWidth={2} />
              <span className="text-xs font-semibold text-white/80">
                {post.comments >= 1000 ? `${(post.comments / 1000).toFixed(1)}K` : post.comments}
              </span>
            </span>
            <button onClick={toggleSave} className="ml-auto transition active:scale-90">
              <Bookmark className={`h-4 w-4 ${saved ? "fill-amber-400 text-amber-400" : "text-white/80"}`} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {showVideo && post.videoUrl && createPortal(
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
              <VideoPlayer src={post.videoUrl} poster={post.coverUrl} autoPlay className="aspect-video w-full" />
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body,
      )}
    </motion.article>
  );
}

const UniversityPostCard = React.memo(UniversityPostCardInner);

/* ── Lazy feed section — renders children only when scrolled into view */
/* Deferred rendering prevents thousands of DOM nodes (cards/images) from being created on initial page load. */
function LazySection({ children, className, minHeight = 200 }: { children: React.ReactNode; className?: string; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ minHeight: visible ? undefined : minHeight }}>
      {visible ? children : null}
    </div>
  );
}

/* ── Unified search overlay (countries + universities) ────────────── */

type SearchResult =
  | { type: "country"; country: Country }
  | { type: "university"; uni: University };

function UnifiedSearchOverlay({
  query,
  setQuery,
  onSelect,
  onClose,
}: {
  query: string;
  setQuery: (v: string) => void;
  onSelect: (result: SearchResult) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const countries = COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q) ||
        c.continent.toLowerCase().includes(q),
    ).slice(0, 5);
    const unis = searchUniversities(query).slice(0, 8);
    return [
      ...countries.map((country) => ({ type: "country" as const, country })),
      ...unis.map((uni) => ({ type: "university" as const, uni })),
    ];
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
        <div className="glass-strong flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-2xl">
          <Search className="h-5 w-5 shrink-0 text-white/40" strokeWidth={2} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("uni.searchPlaceholder", "Search countries or universities...")}
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

        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
            className="glass-strong mt-3 max-h-[60vh] overflow-y-auto no-scrollbar rounded-2xl shadow-2xl"
          >
            {results.map((result, i) => (
              <motion.button
                key={result.type === "country" ? `c-${result.country.id}` : `u-${result.uni.id}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.2 }}
                onClick={() => onSelect(result)}
                className="flex w-full items-center gap-3 border-b border-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.05] last:border-0"
              >
                {result.type === "country" ? (
                  <>
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-xl">
                      {result.country.flag}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{result.country.name}</p>
                      <p className="truncate text-xs text-white/40">
                        {result.country.capital} · {result.country.continent}
                      </p>
                    </div>
                    <Globe2 className="h-4 w-4 shrink-0 text-blue-400/60" strokeWidth={2} />
                  </>
                ) : (
                  <>
                    <OptimizedImage src={result.uni.logo} alt={result.uni.name} placeholderType="university" className="h-10 w-10 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{result.uni.name}</p>
                      <p className="truncate text-xs text-white/40">
                        {result.uni.flag} {result.uni.city} · QS #{result.uni.qsRanking}
                      </p>
                    </div>
                    <GraduationCap className="h-4 w-4 shrink-0 text-amber-400/60" strokeWidth={2} />
                  </>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}

        {query.trim() && results.length === 0 && (
          <div className="glass-strong mt-3 rounded-2xl px-4 py-8 text-center shadow-2xl">
            <p className="text-sm text-white/40">No results found for "{query}"</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Filter panel ─────────────────────────────────────────────────── */

function FilterPanel({
  filters,
  setFilters,
  onClose,
}: {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const countries = useMemo(() => [...new Set(UNIVERSITIES.map((u) => u.country))].sort(), []);
  const languages = useMemo(() => [...new Set(UNIVERSITIES.map((u) => u.language))].sort(), []);

  const update = (key: keyof FilterState, value: string | boolean) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring" as const, stiffness: 300, damping: 28 }}
        className="glass-strong absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto no-scrollbar rounded-t-[28px] p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{t("uni.filters", "Filters")}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Country */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">{t("uni.country", "Country")}</label>
            <select
              value={filters.country}
              onChange={(e) => update("country", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white focus:outline-none"
            >
              <option value="" className="bg-[#14161f]">{t("uni.allCountries", "All Countries")}</option>
              {countries.map((c) => (
                <option key={c} value={c} className="bg-[#14161f]">{c}</option>
              ))}
            </select>
          </div>

          {/* Tuition max */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">{t("uni.maxTuition", "Max Tuition (USD/yr)")}</label>
            <select
              value={filters.tuitionMax}
              onChange={(e) => update("tuitionMax", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white focus:outline-none"
            >
              <option value="" className="bg-[#14161f]">Any</option>
              <option value="5000" className="bg-[#14161f]">Under $5,000</option>
              <option value="15000" className="bg-[#14161f]">Under $15,000</option>
              <option value="30000" className="bg-[#14161f]">Under $30,000</option>
              <option value="50000" className="bg-[#14161f]">Under $50,000</option>
              <option value="999999" className="bg-[#14161f]">Any price</option>
            </select>
          </div>

          {/* Ranking max */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">{t("uni.maxRanking", "Max QS Ranking (number)")}</label>
            <select
              value={filters.rankingMax}
              onChange={(e) => update("rankingMax", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white focus:outline-none"
            >
              <option value="" className="bg-[#14161f]">Any ranking</option>
              <option value="10" className="bg-[#14161f]">Top 10</option>
              <option value="30" className="bg-[#14161f]">Top 30</option>
              <option value="50" className="bg-[#14161f]">Top 50</option>
              <option value="100" className="bg-[#14161f]">Top 100</option>
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">{t("uni.languageOfInstruction", "Language")}</label>
            <select
              value={filters.language}
              onChange={(e) => update("language", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white focus:outline-none"
            >
              <option value="" className="bg-[#14161f]">Any</option>
              {languages.map((l) => (
                <option key={l} value={l} className="bg-[#14161f]">{l}</option>
              ))}
            </select>
          </div>

          {/* Degree type */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">{t("uni.degreeType", "Degree Type")}</label>
            <select
              value={filters.degreeType}
              onChange={(e) => update("degreeType", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white focus:outline-none"
            >
              <option value="" className="bg-[#14161f]">Any</option>
              <option value="bachelor" className="bg-[#14161f]">Bachelor</option>
              <option value="master" className="bg-[#14161f]">Master</option>
              <option value="phd" className="bg-[#14161f]">PhD</option>
            </select>
          </div>

          {/* University type */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">{t("uni.type", "University Type")}</label>
            <select
              value={filters.uniType}
              onChange={(e) => update("uniType", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white focus:outline-none"
            >
              <option value="" className="bg-[#14161f]">Any</option>
              <option value="public" className="bg-[#14161f]">Public</option>
              <option value="private" className="bg-[#14161f]">Private</option>
            </select>
          </div>

          {/* Boolean filters */}
          <div className="space-y-2.5">
            {[
              { key: "hasScholarship" as const, label: t("uni.hasScholarship", "Has Scholarships") },
              { key: "ieltsRequired" as const, label: "IELTS Required" },
              { key: "toeflRequired" as const, label: "TOEFL Required" },
              { key: "satRequired" as const, label: "SAT Required" },
            ].map((item) => (
              <label key={item.key} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
                <input
                  type="checkbox"
                  checked={filters[item.key]}
                  onChange={(e) => update(item.key, e.target.checked)}
                  className="h-4 w-4 accent-blue-500"
                />
                <span className="text-sm text-white/70">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={() => { setFilters(DEFAULT_FILTERS); }}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-medium text-white/60 transition hover:text-white"
          >
            {t("uni.reset", "Reset")}
          </button>
          <button
            onClick={onClose}
            className="gold-gradient flex-1 rounded-xl py-3 text-sm font-bold text-primary-foreground"
          >
            {t("uni.apply", "Apply")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Compare panel ────────────────────────────────────────────────── */

function ComparePanel({
  compareIds,
  onClose,
}: {
  compareIds: string[];
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { clearCompare, toggleCompare } = useUniversity();
  const unis = useMemo(() => compareIds.map((id) => getUniversity(id)).filter(Boolean) as University[], [compareIds]);

  if (unis.length === 0) return null;

  const compareFields = [
    { key: "qsRanking", label: t("uni.qsRanking", "QS Ranking"), format: (u: University) => `#${u.qsRanking}` },
    { key: "tuition", label: t("uni.tuition", "Tuition"), format: (u: University) => u.tuition },
    { key: "hasScholarship", label: t("uni.scholarship", "Scholarships"), format: (u: University) => u.hasScholarship ? "✓" : "—" },
    { key: "acceptanceRate", label: t("uni.acceptanceRate", "Acceptance"), format: (u: University) => `${u.acceptanceRate}%` },
    { key: "programsCount", label: t("uni.programs", "Programs"), format: (u: University) => String(u.programsCount) },
    { key: "campusSize", label: t("uni.campusSize", "Campus Size"), format: (u: University) => u.campusSize },
    { key: "city", label: t("uni.location", "Location"), format: (u: University) => `${u.city}, ${u.country}` },
    { key: "livingCost", label: t("uni.livingCost", "Living Cost"), format: (u: University) => u.livingCost },
    { key: "ieltsRequirement", label: "IELTS", format: (u: University) => u.ieltsRequirement },
    { key: "toeflRequirement", label: "TOEFL", format: (u: University) => u.toeflRequirement },
    { key: "satRequirement", label: "SAT", format: (u: University) => u.satRequirement },
    { key: "deadline", label: t("uni.deadline", "Deadline"), format: (u: University) => u.deadline },
    { key: "housingAvailable", label: t("uni.housing", "Housing"), format: (u: University) => u.housingAvailable ? "✓" : "—" },
    { key: "employmentRate", label: t("uni.employmentRate", "Employment"), format: (u: University) => `${u.employmentRate}%` },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring" as const, stiffness: 300, damping: 28 }}
        className="glass-strong absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto no-scrollbar rounded-t-[28px]"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}
      >
        <div className="mx-auto mb-4 mt-3 h-1 w-10 rounded-full bg-white/15" />
        <div className="mb-5 flex items-center justify-between px-5">
          <h3 className="font-display text-lg font-bold">{t("uni.compareUniversities", "Compare Universities")}</h3>
          <div className="flex gap-2">
            <button
              onClick={clearCompare}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
              aria-label="Clear compare"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto no-scrollbar px-5">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-[#11131b] p-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                  {t("uni.field", "Field")}
                </th>
                {unis.map((u) => (
                  <th key={u.id} className="min-w-[140px] p-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <OptimizedImage src={u.logo} alt={u.name} placeholderType="university" className="h-10 w-10 rounded-lg object-cover" />
                      <span className="text-xs font-bold text-white">{u.name}</span>
                      <button
                        onClick={() => toggleCompare(u.id)}
                        className="text-[10px] text-white/40 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareFields.map((field, i) => (
                <tr key={field.key} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                  <td className="sticky left-0 z-10 bg-[#11131b] p-3 text-xs font-medium text-white/50">
                    {field.label}
                  </td>
                  {unis.map((u) => (
                    <td key={u.id} className="p-3 text-center text-xs font-semibold text-white/80">
                      {field.format(u)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── AI recommendation form ───────────────────────────────────────── */

function AIRecommendationSection() {
  const { t, language } = useLanguage();
  const { wishlist, visited } = useUniversity();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UniversityRecommendation[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [formInput, setFormInput] = useState<UniversityAIInput>({
    preferredCountry: "",
    budget: "",
    ieltsScore: "",
    toeflScore: "",
    satScore: "",
    academicDegree: "",
    major: "",
    careerGoals: "",
    scholarshipPreference: "",
    language: "",
  });

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getUniversityRecommendations(
        { ...formInput, savedUniversities: wishlist, visitedUniversities: visited },
        language,
      );
      setResults(response.recommendations);
      setSummary(response.summary);
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI recommendation failed");
    } finally {
      setLoading(false);
    }
  }, [formInput, wishlist, visited, language]);

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/40";

  return (
    <section className="relative z-10 pt-8 pb-10 px-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("uni.aiRecommendations", "AI University Recommendations")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("uni.aiDesc", "Get personalized university suggestions powered by AI")}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-strong overflow-hidden rounded-3xl"
          >
            <div className="space-y-3 p-5">
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder={t("uni.preferredCountry", "Preferred country")}
                  value={formInput.preferredCountry}
                  onChange={(e) => setFormInput({ ...formInput, preferredCountry: e.target.value })}
                  className={inputClass}
                />
                <input
                  placeholder={t("uni.budget", "Budget (e.g. $30,000/yr)")}
                  value={formInput.budget}
                  onChange={(e) => setFormInput({ ...formInput, budget: e.target.value })}
                  className={inputClass}
                />
                <input
                  placeholder="IELTS score (e.g. 7.0)"
                  value={formInput.ieltsScore}
                  onChange={(e) => setFormInput({ ...formInput, ieltsScore: e.target.value })}
                  className={inputClass}
                />
                <input
                  placeholder="TOEFL score (e.g. 100)"
                  value={formInput.toeflScore}
                  onChange={(e) => setFormInput({ ...formInput, toeflScore: e.target.value })}
                  className={inputClass}
                />
                <input
                  placeholder="SAT score (e.g. 1500)"
                  value={formInput.satScore}
                  onChange={(e) => setFormInput({ ...formInput, satScore: e.target.value })}
                  className={inputClass}
                />
                <input
                  placeholder={t("uni.degree", "Degree (Bachelor/Master/PhD)")}
                  value={formInput.academicDegree}
                  onChange={(e) => setFormInput({ ...formInput, academicDegree: e.target.value })}
                  className={inputClass}
                />
                <input
                  placeholder={t("uni.major", "Major / Field of study")}
                  value={formInput.major}
                  onChange={(e) => setFormInput({ ...formInput, major: e.target.value })}
                  className={inputClass}
                />
                <input
                  placeholder={t("uni.languagePref", "Language preference")}
                  value={formInput.language}
                  onChange={(e) => setFormInput({ ...formInput, language: e.target.value })}
                  className={inputClass}
                />
              </div>
              <input
                placeholder={t("uni.careerGoals", "Career goals")}
                value={formInput.careerGoals}
                onChange={(e) => setFormInput({ ...formInput, careerGoals: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder={t("uni.scholarshipPref", "Scholarship preference")}
                value={formInput.scholarshipPreference}
                onChange={(e) => setFormInput({ ...formInput, scholarshipPreference: e.target.value })}
                className={inputClass}
              />
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-medium text-white/60"
                >
                  {t("uni.cancel", "Cancel")}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {t("uni.analyzing", "Analyzing...")}</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> {t("uni.getRecommendations", "Get Recommendations")}</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              onClick={() => setShowForm(true)}
              className="glass-strong flex w-full items-center gap-3 rounded-2xl p-4 text-left transition hover:border-primary/30"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <Sparkles className="h-5 w-5 text-primary" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{t("uni.findYourMatch", "Find Your Perfect University")}</p>
                <p className="text-xs text-white/40">{t("uni.aiSubtext", "Tell us your preferences and AI will match you")}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-white/30" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI results */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-3"
        >
          <p className="text-sm text-white/60">{summary}</p>
          {results.map((rec, i) => {
            const uni = getUniversity(rec.id);
            if (!uni) return null;
            return (
              <motion.button
                key={rec.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => navigate(`/universities/${rec.id}`)}
                className="glass-strong flex w-full items-center gap-3 rounded-2xl p-4 text-left transition hover:border-primary/30"
              >
                <OptimizedImage src={uni.logo} alt={uni.name} placeholderType="university" className="h-12 w-12 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-white">{uni.name}</p>
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">
                      {rec.matchScore}% {t("uni.match", "match")}
                    </span>
                  </div>
                  <p className="truncate text-xs text-white/40">{uni.flag} {uni.city} · QS #{uni.qsRanking}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {rec.reasons.slice(0, 2).map((reason, idx) => (
                      <span key={idx} className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-white/50">{reason}</span>
                    ))}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-white/30" />
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </section>
  );
}

/* ── Main Universities page ────────────────────────────────────────── */

export default function Universities() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isOpen: sidebarOpen } = useSidebar();
  const { wishlist, visited, compareList } = useUniversity();
  const { visited: travelVisited, wishlist: travelWishlist } = useTravel();

  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);
  const visitedSet = useMemo(() => new Set(visited), [visited]);
  const travelVisitedSet = useMemo(() => new Set(travelVisited), [travelVisited]);
  const travelWishlistSet = useMemo(() => new Set(travelWishlist), [travelWishlist]);

  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countryModalOpen, setCountryModalOpen] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [zoomTarget, setZoomTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>("highest-ranking");
  const [showCompare, setShowCompare] = useState<boolean>(false);
  const [showCountries, setShowCountries] = useState<boolean>(true);
  const [showUniversities, setShowUniversities] = useState<boolean>(true);
  const [postsLimit, setPostsLimit] = useState<number>(12); // Start with 12 posts, load more on demand

  // ── Lightweight country popup (flag + name only, no large modal) ──
  const [countryPopup, setCountryPopup] = useState<{ id: string; name: string; flag: string } | null>(null);

  // ── University lazy loading with in-memory cache ──
  const [uniLoading, setUniLoading] = useState<string | null>(null);
  const [uniError, setUniError] = useState<string | null>(null);
  const universityCacheRef = useRef<Map<string, University>>(new Map());
  const failedUniIdRef = useRef<string | null>(null);

  // ── Lazy-load university by ID with caching ──
  // Cache hit = instant. Cache miss = brief loading indicator, then load + cache.
  const loadUniversityById = useCallback((uniId: string) => {
    setCountryPopup(null);
    setUniError(null);

    // Cache hit — instant, no loading state
    const cached = universityCacheRef.current.get(uniId);
    if (cached) {
      setSelectedUniversity(cached);
      setModalOpen(true);
      setZoomTarget({ lat: cached.latitude, lng: cached.longitude });
      return;
    }

    // Cache miss — show loading indicator, then load
    setUniLoading(uniId);
    setTimeout(() => {
      const uni = getUniversity(uniId);
      if (uni) {
        universityCacheRef.current.set(uniId, uni);
        setSelectedUniversity(uni);
        setModalOpen(true);
        setZoomTarget({ lat: uni.latitude, lng: uni.longitude });
      } else {
        setUniError("University details not found. Please try again.");
        failedUniIdRef.current = uniId;
      }
      setUniLoading(null);
    }, 300);
  }, []);

  const handleRetryUniLoad = useCallback(() => {
    const failedId = failedUniIdRef.current;
    setUniError(null);
    failedUniIdRef.current = null;
    if (failedId) loadUniversityById(failedId);
  }, [loadUniversityById]);

  const handleCountrySelect = useCallback((country: Country) => {
    setSelectedCountry(country);
    setCountryPopup({ id: country.id, name: country.name, flag: country.flag });
  }, []);

  const handleCloseUniModal = useCallback(() => {
    setModalOpen(false);
    setTimeout(() => setSelectedUniversity(null), 350);
  }, []);

  const handleCloseCountryModal = useCallback(() => {
    setCountryModalOpen(false);
    setTimeout(() => setSelectedCountry(null), 350);
  }, []);

  // Stabilize handleBackgroundTap with refs — prevents Globe re-render when modal state changes
  const modalOpenRef = useRef(false);
  const countryModalOpenRef = useRef(false);
  modalOpenRef.current = modalOpen;
  countryModalOpenRef.current = countryModalOpen;

  const handleBackgroundTap = useCallback(() => {
    if (modalOpenRef.current) handleCloseUniModal();
    if (countryModalOpenRef.current) handleCloseCountryModal();
    setCountryPopup(null);
  }, [handleCloseUniModal, handleCloseCountryModal]);

  const handleSearchSelect = useCallback((result: SearchResult) => {
    if (result.type === "country") {
      setSelectedCountry(result.country);
      setCountryPopup({ id: result.country.id, name: result.country.name, flag: result.country.flag });
      setZoomTarget({ lat: result.country.lat, lng: result.country.lng });
    } else {
      // Cache the university from search results for instant access
      universityCacheRef.current.set(result.uni.id, result.uni);
      loadUniversityById(result.uni.id);
    }
    setSearchOpen(false);
    setSearchQuery("");
  }, [loadUniversityById]);

  /* ── Filter + sort logic ── */
  const filteredUniversities = useMemo(() => {
    let result = [...UNIVERSITIES];

    if (filters.country) result = result.filter((u) => u.country === filters.country);
    if (filters.tuitionMax) result = result.filter((u) => u.tuitionNumeric <= Number(filters.tuitionMax));
    if (filters.rankingMax) result = result.filter((u) => u.qsRanking <= Number(filters.rankingMax));
    if (filters.language) result = result.filter((u) => u.language.toLowerCase().includes(filters.language.toLowerCase()));
    if (filters.degreeType === "bachelor") result = result.filter((u) => u.bachelorPrograms.length > 0);
    if (filters.degreeType === "master") result = result.filter((u) => u.masterPrograms.length > 0);
    if (filters.degreeType === "phd") result = result.filter((u) => u.phdPrograms.length > 0);
    if (filters.uniType) result = result.filter((u) => u.type === filters.uniType);
    if (filters.hasScholarship) result = result.filter((u) => u.hasScholarship);
    if (filters.ieltsRequired) result = result.filter((u) => u.ieltsRequirement !== "Not required");
    if (filters.toeflRequired) result = result.filter((u) => u.toeflRequirement !== "Not required");
    if (filters.satRequired) result = result.filter((u) => u.satRequirement !== "Not required");

    switch (sortBy) {
      case "highest-ranking":
        result.sort((a, b) => a.qsRanking - b.qsRanking);
        break;
      case "lowest-tuition":
        result.sort((a, b) => a.tuitionNumeric - b.tuitionNumeric);
        break;
      case "most-popular":
        result.sort((a, b) => b.studentsCount - a.studentsCount);
        break;
      case "most-scholarships":
        result.sort((a, b) => (b.hasScholarship ? 1 : 0) - (a.hasScholarship ? 1 : 0));
        break;
      case "recently-added":
        result.reverse();
        break;
    }

    return result;
  }, [filters, sortBy]);

  // ── Lightweight marker data for the globe (only id, name, coords, logo) ──
  // Passes minimal data to Globe instead of full University objects with heavy nested data.
  const universityMarkerData = useMemo<UniversityMarkerData[]>(() => {
    return filteredUniversities.map((u) => ({
      id: u.id,
      name: u.name,
      latitude: u.latitude,
      longitude: u.longitude,
      logo: u.logo,
    }));
  }, [filteredUniversities]);

  /* ── All posts from all universities ── */
  const allPosts = useMemo(() => {
    return UNIVERSITIES.flatMap((u) => u.posts);
  }, []);

  /* ── All videos from all universities ── */
  const allVideos = useMemo(() => {
    return UNIVERSITIES.flatMap((u) => u.videos.map((v) => ({ ...v, uniName: u.name, uniId: u.id, uniFlag: u.flag })));
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.country) count++;
    if (filters.tuitionMax) count++;
    if (filters.rankingMax) count++;
    if (filters.language) count++;
    if (filters.degreeType) count++;
    if (filters.uniType) count++;
    if (filters.hasScholarship) count++;
    if (filters.ieltsRequired) count++;
    if (filters.toeflRequired) count++;
    if (filters.satRequired) count++;
    return count;
  }, [filters]);

  /* ── Themed recommendation feed sections (memoized, sorted lazily) ── */
  const themedFeeds = useMemo(() => {
    const ivyIds = new Set(["harvard", "stanford", "mit", "princeton", "yale", "columbia", "upenn", "caltech", "uchicago", "cornell", "duke", "johnshopkins"]);
    // Precompute sorted arrays once — reuse for multiple sections to avoid repeated sorts
    const byStudentsDesc = [...UNIVERSITIES].sort((a, b) => b.studentsCount - a.studentsCount);
    const byRankingAsc = [...UNIVERSITIES].sort((a, b) => a.qsRanking - b.qsRanking);
    const byTuitionAsc = [...UNIVERSITIES].sort((a, b) => a.tuitionNumeric - b.tuitionNumeric);
    return [
      { icon: "🔥", title: t("uni.trending", "Trending Universities"), items: byStudentsDesc.slice(0, 12) },
      { icon: "⭐", title: t("uni.topRanked", "Top Ranked"), items: byRankingAsc.slice(0, 12) },
      { icon: "💰", title: t("uni.affordable", "Affordable Universities"), items: byTuitionAsc.slice(0, 12) },
      { icon: "🎓", title: t("uni.bestScholarships", "Best Scholarships"), items: UNIVERSITIES.filter((u) => u.hasScholarship).slice(0, 12) },
      { icon: "🌍", title: t("uni.studyAbroad", "Study Abroad Picks"), items: UNIVERSITIES.filter((u) => u.continent !== "North America").slice(0, 12) },
      { icon: "🏛", title: t("uni.ivyLeague", "Ivy League"), items: UNIVERSITIES.filter((u) => ivyIds.has(u.id)).slice(0, 12) },
      { icon: "💻", title: t("uni.bestCS", "Best Computer Science"), items: UNIVERSITIES.filter((u) => u.bachelorPrograms.some((p) => p.name.toLowerCase().includes("computer"))).slice(0, 12) },
      { icon: "🤖", title: t("uni.aiUniversities", "AI Universities"), items: UNIVERSITIES.filter((u) => u.bachelorPrograms.some((p) => p.name.toLowerCase().includes("ai") || p.name.toLowerCase().includes("machine"))).slice(0, 12) },
      { icon: "🩺", title: t("uni.medical", "Medical Universities"), items: UNIVERSITIES.filter((u) => u.bachelorPrograms.some((p) => p.name.toLowerCase().includes("medicine") || p.name.toLowerCase().includes("medical"))).slice(0, 12) },
      { icon: "⚙", title: t("uni.engineering", "Engineering Universities"), items: UNIVERSITIES.filter((u) => u.bachelorPrograms.some((p) => p.name.toLowerCase().includes("engineer"))).slice(0, 12) },
      { icon: "📈", title: t("uni.businessSchools", "Business Schools"), items: UNIVERSITIES.filter((u) => u.bachelorPrograms.some((p) => p.name.toLowerCase().includes("business") || p.name.toLowerCase().includes("economics") || p.name.toLowerCase().includes("mba"))).slice(0, 12) },
      { icon: "🎨", title: t("uni.artDesign", "Art & Design"), items: UNIVERSITIES.filter((u) => u.bachelorPrograms.some((p) => p.name.toLowerCase().includes("art") || p.name.toLowerCase().includes("design") || p.name.toLowerCase().includes("architecture"))).slice(0, 12) },
    ];
  }, [t]);

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
              selectedCountry={selectedCountry}
              onCountrySelect={handleCountrySelect}
              onBackgroundTap={handleBackgroundTap}
              zoomTarget={zoomTarget}
              visitedIds={travelVisitedSet}
              wishlistIds={travelWishlistSet}
              universityMode
              universities={universityMarkerData}
              selectedUniversityId={selectedUniversity?.id ?? null}
              onUniversitySelect={loadUniversityById}
              uniWishlistIds={wishlistSet}
              uniVisitedIds={visitedSet}
              showCountries={showCountries}
              showUniversities={showUniversities}
              reducedAnimation={modalOpen}
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
            <img src={OXEN_LOGO} alt="OXEN" className="h-8 w-8 rounded-xl object-contain shadow-lg sm:h-9 sm:w-9" loading="lazy" onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }} />
            <span className="font-display text-lg font-extrabold tracking-wide sm:text-xl">OXEN</span>
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
            {/* Compare button */}
            {compareList.length > 0 && (
              <button
                onClick={() => setShowCompare(true)}
                className="flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-2 backdrop-blur-xl border border-blue-500/20 text-xs font-semibold text-blue-400 transition active:scale-95"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {compareList.length}
              </button>
            )}
            {/* Layer toggles */}
            <div className="flex items-center gap-1 rounded-full bg-white/[0.06] px-1.5 py-1.5 backdrop-blur-xl border border-white/10 sm:gap-1.5 sm:px-2">
              <button
                onClick={() => setShowCountries((v) => !v)}
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition active:scale-95 sm:gap-1.5 sm:px-2.5 sm:text-xs ${
                  showCountries ? "bg-blue-500/20 text-blue-400" : "text-white/40"
                }`}
                aria-label="Toggle country markers"
              >
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span className="hidden sm:inline">{t("uni.countries", "Countries")}</span>
              </button>
              <button
                onClick={() => setShowUniversities((v) => !v)}
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition active:scale-95 sm:gap-1.5 sm:px-2.5 sm:text-xs ${
                  showUniversities ? "bg-amber-500/20 text-amber-400" : "text-white/40"
                }`}
                aria-label="Toggle university markers"
              >
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="hidden sm:inline">{t("uni.universities", "Universities")}</span>
              </button>
            </div>
            {/* Filter button */}
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-2 backdrop-blur-xl border border-white/10 text-sm text-white/60 transition hover:bg-white/12 hover:text-white active:scale-95"
              aria-label="Filters"
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
              {activeFilterCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-2 backdrop-blur-xl border border-white/10 text-sm text-white/60 transition hover:bg-white/12 hover:text-white active:scale-95 sm:px-4"
              aria-label="Search universities"
            >
              <Search className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">{t("uni.search", "Search")}</span>
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
            {t("uni.heroTitle1", "Explore universities")}
            <br />
            <span className="text-gold-gradient">{t("uni.heroTitle2", "around the world.")}</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-xs text-muted-foreground sm:mt-3 sm:text-sm">
            {t("uni.heroSubtitle", "Spin the globe, discover universities, and let AI find your perfect match.")}
          </p>
        </motion.div>

        {/* Floating legend */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="pointer-events-none absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 sm:flex"
        >
          <div className="glass-strong flex items-center gap-2 rounded-full px-3 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.6)]" />
            <span className="text-xs font-medium text-white/70">{t("uni.countryCapital", "Country Capital")}</span>
          </div>
          <div className="glass-strong flex items-center gap-2 rounded-full px-3 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
            <span className="text-xs font-medium text-white/70">{t("uni.university", "University")}</span>
          </div>
        </motion.div>
      </section>

      {/* ── Sort selector ─────────────────────────── */}
      <section className="relative z-10 px-4 pt-6 pb-2 sm:px-5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: "highest-ranking", label: t("uni.sortHighestRanking", "Highest Ranking") },
            { key: "lowest-tuition", label: t("uni.sortLowestTuition", "Lowest Tuition") },
            { key: "most-popular", label: t("uni.sortMostPopular", "Most Popular") },
            { key: "most-scholarships", label: t("uni.sortMostScholarships", "Most Scholarships") },
            { key: "recently-added", label: t("uni.sortRecentlyAdded", "Recently Added") },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key as SortOption)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 ${
                sortBy === opt.key
                  ? "bg-primary text-primary-foreground"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {filteredUniversities.length} {t("uni.universitiesFound", "universities found")}
        </p>
      </section>

      {/* ── Themed Recommendation Feeds (lazy rendered via IntersectionObserver) ── */}
      {themedFeeds.map((section, sectionIdx) => (
        <LazySection key={sectionIdx} className="relative z-10 pt-4 pb-3" minHeight={280}>
          <div className="mb-3 flex items-center justify-between px-4 sm:px-5">
            <h2 className="flex items-center gap-2 font-display text-base font-bold sm:text-lg">
              <span className="text-xl">{section.icon}</span>
              {section.title}
            </h2>
          </div>
          <div className="-mx-0 overflow-x-auto no-scrollbar">
            <div className="flex gap-3 px-4 sm:gap-4 sm:px-5">
              {section.items.map((uni, i) => (
                <UniversityDiscoverCard key={uni.id} uni={uni} index={i} />
              ))}
            </div>
          </div>
        </LazySection>
      ))}

      {/* ── Campus Videos (lazy rendered) ──────────── */}
      <LazySection className="relative z-10 pt-4 pb-6" minHeight={240}>
        <div className="mb-4 px-4 sm:px-5">
          <h2 className="font-display text-base font-bold sm:text-lg">{t("uni.campusVideos", "Campus Videos")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("uni.campusVideosDesc", "Tour campuses from around the world")}</p>
        </div>
        <div className="-mx-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-3 px-4 sm:gap-4 sm:px-5">
            {allVideos.slice(0, 10).map((video, i) => (
              <CampusVideoCard key={`${video.id}-${i}`} video={video} index={i} />
            ))}
          </div>
        </div>
      </LazySection>

      {/* ── University Posts (lazy rendered, paginated) ── */}
      <LazySection className="relative z-10 pt-4 pb-6 px-4 sm:px-5" minHeight={400}>
        <div className="mb-4">
          <h2 className="font-display text-base font-bold sm:text-lg">{t("uni.universityPosts", "University Posts")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("uni.postsDesc", "Student experiences and campus life")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {allPosts.slice(0, postsLimit).map((post, i) => (
            <UniversityPostCard key={post.id} post={post} index={i} />
          ))}
        </div>
        {allPosts.length > postsLimit && (
          <div className="mt-5 flex justify-center">
            <button
              onClick={() => setPostsLimit((prev) => prev + 12)}
              className="glass-button rounded-full px-6 py-3 text-sm font-semibold text-foreground transition active:scale-95"
            >
              {t("uni.loadMore", "Load More Posts")}
            </button>
          </div>
        )}
      </LazySection>

      {/* ── AI Recommendations ────────────────────── */}
      <AIRecommendationSection />

      {/* ── My Universities (Wishlist, lazy rendered) ── */}
      {wishlist.length > 0 && (
        <LazySection className="relative z-10 pt-4 pb-10" minHeight={280}>
          <div className="mb-4 px-4 sm:px-5">
            <h2 className="flex items-center gap-2 font-display text-base font-bold sm:text-lg">
              <Heart className="h-5 w-5 text-rose-400" />
              {t("uni.myUniversities", "My Universities")}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("uni.myUniversitiesDesc", "Your saved universities")}</p>
          </div>
          <div className="-mx-0 overflow-x-auto no-scrollbar">
            <div className="flex gap-3 px-4 sm:gap-4 sm:px-5">
              {wishlist.map((id) => getUniversity(id)).filter(Boolean).map((uni, i) => (
                <UniversityDiscoverCard key={uni!.id} uni={uni!} index={i} />
              ))}
            </div>
          </div>
        </LazySection>
      )}

      {/* ── Search overlay ─────────────────────────── */}
      <AnimatePresence>
        {searchOpen && (
          <UnifiedSearchOverlay
            query={searchQuery}
            setQuery={setSearchQuery}
            onSelect={handleSearchSelect}
            onClose={() => setSearchOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Filter panel ───────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <FilterPanel filters={filters} setFilters={setFilters} onClose={() => setShowFilters(false)} />
        )}
      </AnimatePresence>

      {/* ── Compare panel ──────────────────────────── */}
      <AnimatePresence>
        {showCompare && (
          <ComparePanel compareIds={compareList} onClose={() => setShowCompare(false)} />
        )}
      </AnimatePresence>

      {/* ── University info modal ──────────────────── */}
      <AnimatePresence>
        {selectedUniversity && modalOpen && (
          <UniversityModal
            key={`uni-modal-${selectedUniversity.id}`}
            university={selectedUniversity}
            open={modalOpen}
            onClose={handleCloseUniModal}
          />
        )}
      </AnimatePresence>

      {/* ── Country popup (lightweight flag + name) ── */}
      <AnimatePresence>
        {countryPopup && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: "spring" as const, stiffness: 300, damping: 26 }}
            className="fixed left-1/2 top-20 z-30 -translate-x-1/2"
          >
            <div className="glass-strong flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl">
              <span className="text-2xl">{countryPopup.flag}</span>
              <span className="text-sm font-bold text-foreground">{countryPopup.name}</span>
              <button
                onClick={() => setCountryPopup(null)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-muted-foreground transition hover:bg-white/20 hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── University loading indicator ── */}
      <AnimatePresence>
        {uniLoading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed left-1/2 top-20 z-30 -translate-x-1/2"
          >
            <div className="glass-strong flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Loading university…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── University load error with retry ── */}
      <AnimatePresence>
        {uniError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed left-1/2 top-20 z-30 -translate-x-1/2"
          >
            <div className="glass-strong flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl">
              <span className="text-sm text-red-400">{uniError}</span>
              <button
                onClick={handleRetryUniLoad}
                className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary transition hover:bg-primary/25"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Country info modal (kept for future use, not triggered in current flow) ── */}
      <AnimatePresence>
        {selectedCountry && countryModalOpen && (
          <DestinationModal
            key={`country-modal-${selectedCountry.id}`}
            country={selectedCountry}
            open
            onClose={handleCloseCountryModal}
            onShowOptions={handleCloseCountryModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Campus video card ────────────────────────────────────────────── */

function CampusVideoCardInner({
  video,
  index,
}: {
  video: {
    id: string;
    title: string;
    url: string;
    thumbnail: string;
    uniName: string;
    uniId: string;
    uniFlag: string;
  };
  index: number;
}) {
  const navigate = useNavigate();
  const [showVideo, setShowVideo] = useState(false);

  return (
    <>
      <motion.button
        initial={{ opacity: 0, x: 48, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{
          delay: index * 0.06,
          type: "spring" as const,
          stiffness: 280,
          damping: 26,
          mass: 0.85,
        }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowVideo(true)}
        className="group relative w-[280px] shrink-0 overflow-hidden rounded-3xl"
      >
        <div className="relative h-[180px] w-full overflow-hidden">
          <OptimizedImage
            src={video.thumbnail}
            alt={video.title}
            placeholderType="video"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition group-hover:scale-110">
            <Play className="h-5 w-5 fill-white text-white ml-0.5" strokeWidth={0} />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-xs text-white/60">{video.uniFlag} {video.uniName}</p>
            <p className="line-clamp-1 text-sm font-bold text-white">{video.title}</p>
          </div>
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
              <p className="mt-3 text-center text-sm font-semibold text-white">{video.title}</p>
              <button
                onClick={() => { setShowVideo(false); navigate(`/universities/${video.uniId}`); }}
                className="mx-auto mt-3 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                {video.uniName} <ArrowRight className="h-3 w-3" />
              </button>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

const CampusVideoCard = React.memo(CampusVideoCardInner);
