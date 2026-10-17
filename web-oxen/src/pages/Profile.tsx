import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Settings, Plus, MapPin, Heart, Play,
  Grid3X3, Bookmark, Globe2, Clock, ChevronRight,
  MapPinCheck, Flag, Camera, UserPen, MessageSquare, ShieldAlert, Building2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useTravel } from "@/contexts/TravelContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSocial } from "@/contexts/SocialContext";
import { getFollowCounts } from "@/lib/social";
import { useToast } from "@/hooks/use-toast";
import { OptimizedImage } from "@/components/OptimizedImage";
import SettingsPanel from "@/components/SettingsPanel";
import ReportModal from "@/components/ReportModal";
import StoryCreator from "@/components/StoryCreator";
import StoryViewer from "@/components/StoryViewer";
import PostCreator from "@/components/PostCreator";
import { COUNTRIES } from "@/data/countries";
import { cn } from "@/lib/utils";

const OXEN_LOGO = "/logo.png";

/* ──────────────────────────────────────
   AnimatedCounter + CountUp (reusable)
   ────────────────────────────────────── */

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="font-display text-2xl font-extrabold tabular-nums"
    >
      <CountUp target={value} />
      {suffix}
    </motion.span>
  );
}

function CountUp({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target <= 0) { setDisplay(0); return; }
    const duration = 800;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setDisplay(target); clearInterval(timer); }
      else setDisplay(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  return <>{display}</>;
}

function formatStat(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/* ──────────────────────────────────────
   Post grid (photos & videos)
   ────────────────────────────────────── */

function PostsGrid() {
  const { posts } = useTravel();
  const { t } = useLanguage();

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-3xl opacity-30">📸</div>
        <p className="text-sm text-muted-foreground">{t("profile.noPosts", "No travel posts yet")}</p>
        <p className="mt-1 text-xs text-muted-foreground/60">{t("profile.noPostsDesc", "Use the button above to share your first adventure")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {posts.map((post, i) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 22 }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40"
        >
          {post.media[0]?.type === "video" ? (
            <video
              src={post.media[0].dataUrl}
              className="h-full w-full object-cover"
              muted
              loop
              playsInline
              onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
              onMouseLeave={(e) => { (e.currentTarget as HTMLVideoElement).pause(); (e.currentTarget as HTMLVideoElement).currentTime = 0; }}
            />
          ) : (
            <OptimizedImage
              src={post.media[0].dataUrl}
              alt={post.caption}
              placeholderType="post"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          {/* Video indicator */}
          {post.media[0]?.type === "video" && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
              <Play className="ml-0.5 h-4 w-4 text-white" fill="white" />
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 transition-opacity group-hover:opacity-100">
            <p className="text-[11px] font-medium leading-tight text-white/90 line-clamp-2">{post.caption}</p>
            <p className="mt-0.5 text-[10px] text-white/60">{post.location || post.country || post.city}</p>
          </div>
          {/* Multi-media badge */}
          {post.media.length > 1 && (
            <div className="absolute right-2 top-2 rounded-lg bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
              +{post.media.length - 1}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────
   Story bubbles row
   ────────────────────────────────────── */

function StoryBubbles({ onAdd, onView }: { onAdd: () => void; onView: (index: number) => void }) {
  const { stories } = useTravel();
  const { t } = useLanguage();

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
      {/* Add story button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.93 }}
        onClick={onAdd}
        className="flex shrink-0 flex-col items-center gap-1.5"
      >
        <div className="relative flex h-[74px] w-[74px] items-center justify-center rounded-full border-2 border-dashed border-white/[0.12] bg-white/[0.02] transition-colors hover:border-primary/30 hover:bg-primary/5">
          <Plus className="h-6 w-6 text-muted-foreground" />
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground">{t("profile.addStory", "Add Story")}</span>
      </motion.button>

      {/* Story bubbles */}
      {stories.map((story, i) => (
        <motion.button
          key={story.id}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.06 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.93 }}
          onClick={() => onView(i)}
          className="flex shrink-0 flex-col items-center gap-1.5"
        >
          <div className="relative flex h-[74px] w-[74px] items-center justify-center rounded-full bg-gradient-to-br from-amber-400/30 via-amber-500/20 to-orange-500/30 p-[2.5px]">
            <div className="flex h-full w-full items-center justify-center rounded-full overflow-hidden bg-card">
              {story.type === "video" ? (
                <video src={story.dataUrl} className="h-full w-full object-cover" muted />
              ) : (
                <img src={story.dataUrl} alt={story.caption} className="h-full w-full object-cover" />
              )}
            </div>
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground truncate max-w-[74px]">
            {story.caption || t("profile.story", "Story")}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────
   SavedList / TravelMapView / StoryArchive
   ────────────────────────────────────── */

function SavedList({ countries, navigate }: { countries: typeof COUNTRIES; navigate: (path: string) => void }) {
  const { t } = useLanguage();
  if (countries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bookmark className="mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{t("profile.noSaved", "No saved destinations yet")}</p>
        <p className="mt-1 text-xs text-muted-foreground/60">{t("profile.noSavedDesc", "Explore the globe and save your favorites")}</p>
        <button
          onClick={() => navigate("/")}
          className="gold-gradient mt-4 rounded-xl px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-lg transition hover:scale-105 active:scale-95"
        >
          {t("profile.exploreGlobe", "Explore globe")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {countries.map((country, i) => (
        <motion.button
          key={country.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(`/country/${country.id}`)}
          className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all hover:border-white/[0.12]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.04] text-2xl">
            {country.flag}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{country.name}</p>
            <p className="text-xs text-muted-foreground">{country.capital}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
        </motion.button>
      ))}
    </div>
  );
}

function TravelMapView({
  visited, wishlist, favorites,
}: { visited: typeof COUNTRIES; wishlist: typeof COUNTRIES; favorites: typeof COUNTRIES }) {
  const { t } = useLanguage();
  const totalCountries = 195;
  const percentVisited = Math.round((visited.length / totalCountries) * 100);

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl border border-white/[0.06] p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Globe2 className="h-7 w-7" />
          </div>
          <div>
            <p className="font-display text-lg font-extrabold">{visited.length} / {totalCountries}</p>
            <p className="text-xs text-muted-foreground">{t("profile.countriesVisited", "countries visited")} ({percentVisited}%)</p>
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentVisited}%` }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
          />
        </div>
      </div>
      {visited.length > 0 && (
        <div className="glass rounded-2xl border border-white/[0.06] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <MapPinCheck className="h-3.5 w-3.5 text-emerald-400" /> {t("profile.visited", "Visited")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {visited.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/10 px-3 py-1.5 text-xs font-medium">
                <span>{c.flag}</span> {c.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {wishlist.length > 0 && (
        <div className="glass rounded-2xl border border-white/[0.06] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-blue-400" /> {t("profile.wantToVisit", "Want to Visit")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {wishlist.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/10 border border-blue-500/10 px-3 py-1.5 text-xs font-medium">
                <span>{c.flag}</span> {c.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {favorites.length > 0 && (
        <div className="glass rounded-2xl border border-white/[0.06] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Heart className="h-3.5 w-3.5 text-rose-400" /> {t("profile.favorites", "Favorites")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {favorites.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/10 border border-rose-500/10 px-3 py-1.5 text-xs font-medium">
                <span>{c.flag}</span> {c.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StoryArchive() {
  const { stories } = useTravel();
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap gap-3">
      {stories.length === 0 ? (
        <div className="flex w-full flex-col items-center justify-center py-16 text-center">
          <Clock className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{t("profile.noArchive", "No story archive yet")}</p>
          <p className="mt-1 text-xs text-muted-foreground/60">{t("profile.noArchiveDesc", "Your stories will appear here after you create them")}</p>
        </div>
      ) : (
        stories.map((story, i) => (
          <motion.div
            key={story.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ scale: 1.04, y: -2 }}
            className="flex h-[100px] w-[100px] flex-col items-center justify-end rounded-2xl border border-white/[0.06] p-3 bg-black/40 overflow-hidden"
          >
            {story.type === "video" ? (
              <video src={story.dataUrl} className="absolute inset-0 h-full w-full object-cover opacity-60" muted />
            ) : (
              <img src={story.dataUrl} alt={story.caption} className="absolute inset-0 h-full w-full object-cover opacity-60" />
            )}
            <span className="relative text-[10px] font-semibold text-white/80 truncate max-w-full">{story.caption || "Story"}</span>
          </motion.div>
        ))
      )}
    </div>
  );
}

/* ──────────────────────────────────────
   Main Profile Page
   ────────────────────────────────────── */

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    visited, wishlist, favorites, stories, posts, profilePhoto, setProfilePhoto, extendedProfile,
  } = useTravel();
  const { t } = useLanguage();
  const { totalUnread } = useSocial();

  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"posts" | "saved" | "map" | "stories">("posts");
  const [storyCreatorOpen, setStoryCreatorOpen] = useState<boolean>(false);
  const [postCreatorOpen, setPostCreatorOpen] = useState<boolean>(false);
  const [storyViewerOpen, setStoryViewerOpen] = useState<boolean>(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState<number>(0);
  const [reportOpen, setReportOpen] = useState<boolean>(false);
  const [followCounts, setFollowCounts] = useState<{ followers: number; following: number }>({ followers: 0, following: 0 });

  // Load real follower/following counts from Supabase follows table
  useEffect(() => {
    if (!user?.id || user.isGuest) return;
    let active = true;
    void (async () => {
      const counts = await getFollowCounts(user.id);
      if (active) setFollowCounts(counts);
    })();
    return () => { active = false; };
  }, [user?.id, user?.isGuest]);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const wishlistCountries = useMemo(() => COUNTRIES.filter((c) => wishlist.includes(c.id)), [wishlist]);
  const visitedCountries = useMemo(() => COUNTRIES.filter((c) => visited.includes(c.id)), [visited]);
  const favoriteCountries = useMemo(() => COUNTRIES.filter((c) => favorites.includes(c.id)), [favorites]);

  const username = useMemo(
    () => `@${(user?.name ?? "explorer").toLowerCase().replace(/\s+/g, "_")}`,
    [user],
  );

  const initials = useMemo(() => {
    if (!user?.name) return "OX";
    return user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  }, [user]);

  /* Profile photo upload */
  const handleAvatarClick = useCallback(() => {
    avatarInputRef.current?.click();
  }, []);

  const handleAvatarFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setProfilePhoto(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [setProfilePhoto]);

  /* Story view */
  const handleOpenStoryViewer = useCallback((index: number) => {
    setStoryViewerIndex(index);
    setStoryViewerOpen(true);
  }, []);

  return (
    <>
      <div className="relative mx-auto max-w-2xl px-4 pt-2 pb-32">
        {/* ── Settings button ── */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
          onClick={() => setSettingsOpen(true)}
          className="absolute right-4 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-card/50 backdrop-blur-xl border border-white/10 text-muted-foreground shadow-lg transition-all hover:bg-card/70 hover:text-foreground hover:border-white/20 active:scale-95"
          aria-label="Open settings"
        >
          <Settings className="h-5 w-5" strokeWidth={2} />
        </motion.button>

        {/* ── Profile header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="flex flex-col items-center pt-4"
        >
          {/* Avatar with story button and photo upload */}
          <div className="relative">
            <button
              onClick={handleAvatarClick}
              className="group relative flex h-[110px] w-[110px] items-center justify-center rounded-full bg-gradient-to-br from-amber-400/30 via-amber-500/20 to-orange-500/30 p-[3px] shadow-lg shadow-amber-500/10 transition-transform hover:scale-[1.03] active:scale-95"
              aria-label="Change profile photo"
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-card overflow-hidden">
                {profilePhoto ? (
                  <OptimizedImage src={profilePhoto} alt={user.name} placeholderType="avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-4xl font-extrabold text-foreground/70">{initials}</span>
                )}
              </div>
              {/* Camera overlay on hover */}
              <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-7 w-7 text-white/70" />
              </div>
            </button>
            {/* Hidden file input */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFile}
            />
            {/* Story "+" button */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              whileHover={{ scale: 1.1 }}
              onClick={() => setStoryCreatorOpen(true)}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-[3px] ring-background transition-colors hover:bg-primary/90"
              aria-label="Create story"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </motion.button>
          </div>

          {/* Name & username */}
          <div className="mt-4 text-center">
            <h1 className="font-display text-xl font-extrabold">{extendedProfile.fullName || user.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{username}</p>
            {extendedProfile.bio && (
              <p className="mt-2 max-w-xs text-xs text-muted-foreground/80 leading-relaxed">{extendedProfile.bio}</p>
            )}
            {(extendedProfile.country || extendedProfile.city) && (
              <p className="mt-1.5 flex items-center justify-center gap-1 text-xs text-muted-foreground/70">
                <MapPin className="h-3 w-3" />
                {[extendedProfile.city, extendedProfile.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          {/* Action buttons row */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, type: "spring" as const, stiffness: 300, damping: 24 }}
            className="mt-4 flex items-center gap-2 sm:gap-2.5"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate("/profile/edit")}
              className="gold-gradient flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 text-xs font-bold text-primary-foreground shadow-lg"
            >
              <UserPen className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t("profile.editProfile", "Edit Profile")}</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate("/messages")}
              className="relative flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 text-xs font-bold text-foreground transition hover:bg-white/[0.08]"
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t("profile.messages", "Messages")}</span>
              {totalUnread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {totalUnread}
                </span>
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate("/my-agencies")}
              title={t("profile.agencyMessages", "Agencies")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground"
            >
              <Building2 className="h-3.5 w-3.5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => setReportOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-muted-foreground transition hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
              aria-label="Report"
            >
              <ShieldAlert className="h-4 w-4" />
            </motion.button>
          </motion.div>

          {/* Stats row */}
          <div className="mt-5 flex items-center gap-10">
            {[
              { value: posts.length, label: t("profile.posts", "Posts"), clickable: false, path: "" },
              { value: followCounts.followers, label: t("profile.followers", "Followers"), clickable: true, path: `/user/${user?.id}/followers` },
              { value: followCounts.following, label: t("profile.following", "Following"), clickable: true, path: `/user/${user?.id}/following` },
            ].map((stat) => (
              <button
                key={stat.label}
                disabled={!stat.clickable}
                onClick={() => stat.clickable && navigate(stat.path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 transition",
                  stat.clickable && "hover:opacity-80 active:scale-95",
                )}
              >
                <span className="font-display text-xl font-extrabold tabular-nums">
                  {formatStat(stat.value)}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {stat.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Story bubbles row ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 280, damping: 24 }}
          className="mt-5"
        >
          <StoryBubbles onAdd={() => setStoryCreatorOpen(true)} onView={handleOpenStoryViewer} />
        </motion.div>

        {/* ── Create Post button ── */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 22 }}
          onClick={() => setPostCreatorOpen(true)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary/10 border border-primary/20 py-3.5 text-sm font-bold text-primary transition-all hover:bg-primary/15 hover:border-primary/30 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          + {t("profile.createPost", "Create New Travel Post")}
        </motion.button>

        {/* ── Travel statistics cards ── */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {([
            { icon: MapPinCheck, label: t("profile.wantToVisit", "Want to Visit"), value: wishlist.length, gradient: "from-blue-500/10 to-cyan-500/5", iconBg: "bg-blue-500/15 text-blue-400" },
            { icon: Flag, label: t("profile.visited", "Visited"), value: visited.length, gradient: "from-emerald-500/10 to-teal-500/5", iconBg: "bg-emerald-500/15 text-emerald-400" },
            { icon: Heart, label: t("profile.favorites", "Favorites"), value: favorites.length, gradient: "from-rose-500/10 to-pink-500/5", iconBg: "bg-rose-500/15 text-rose-400" },
          ] as const).map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06, type: "spring", stiffness: 300, damping: 22 }}
              whileHover={{ y: -2, scale: 1.02 }}
              className={cn(
                "relative overflow-hidden rounded-2xl border border-white/[0.06] p-4 text-center",
                "bg-gradient-to-br",
                card.gradient,
                "backdrop-blur-sm",
              )}
            >
              <div className={cn("mx-auto flex h-9 w-9 items-center justify-center rounded-xl", card.iconBg)}>
                <card.icon className="h-4.5 w-4.5" />
              </div>
              <div className="mt-2">
                <AnimatedCounter value={card.value} />
              </div>
              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {card.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Content tabs ── */}
        <div className="mt-7">
          <div className="flex items-center border-b border-white/[0.06]">
            {([
              { id: "posts" as const, icon: Grid3X3, label: t("profile.posts", "Posts") },
              { id: "saved" as const, icon: Bookmark, label: t("profile.saved", "Saved") },
              { id: "map" as const, icon: Globe2, label: t("profile.travelMap", "Travel Map") },
              { id: "stories" as const, icon: Clock, label: t("profile.stories", "Stories") },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/70",
                )}
              >
                <tab.icon className="h-4 w-4" strokeWidth={2.2} />
                <span className="hidden sm:inline">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="profile-tab"
                    className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-4"
            >
              {activeTab === "posts" && <PostsGrid />}
              {activeTab === "saved" && <SavedList countries={wishlistCountries} navigate={navigate} />}
              {activeTab === "map" && <TravelMapView visited={visitedCountries} wishlist={wishlistCountries} favorites={favoriteCountries} />}
              {activeTab === "stories" && <StoryArchive />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Modals & panels ── */}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <StoryCreator open={storyCreatorOpen} onClose={() => setStoryCreatorOpen(false)} />
      <PostCreator open={postCreatorOpen} onClose={() => setPostCreatorOpen(false)} />
      <StoryViewer
        stories={stories}
        startIndex={storyViewerIndex}
        open={storyViewerOpen}
        onClose={() => setStoryViewerOpen(false)}
      />
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedUserId="guest-explorer"
        reportedUserName={extendedProfile.username}
        reportedUserAvatar={profilePhoto ?? undefined}
      />
    </>
  );
}
