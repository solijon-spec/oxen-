import { motion, AnimatePresence } from "framer-motion";
import { Search, X, UserPlus, ArrowLeft, Users } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { searchUsers, checkFollowStatus, getInitials, type SocialProfile } from "@/lib/social";
import { cn } from "@/lib/utils";

interface UserSearchPanelProps {
  onClose?: () => void;
  embedded?: boolean;
}

/**
 * User search panel — searchable by username, full name, or email.
 * Shows results while typing, excludes the current user.
 * Each result shows avatar, name, username, and follow status.
 */
export default function UserSearchPanel({ onClose, embedded = false }: UserSearchPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [followStatus, setFollowStatus] = useState<Map<string, boolean>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqRef = useRef<number>(0);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      if (!user || user.isGuest) {
        setLoading(false);
        return;
      }
      const reqId = ++reqRef.current;
      const found = await searchUsers(query, user.id, 20);
      // Only apply if this is the latest request
      if (reqId === reqRef.current) {
        setResults(found);
        // Check follow status for all results
        if (found.length > 0) {
          const status = await checkFollowStatus(found.map((p) => p.id));
          if (reqId === reqRef.current) {
            setFollowStatus(status);
          }
        } else {
          setFollowStatus(new Map());
        }
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, user]);

  const handleSelectUser = useCallback(
    (profile: SocialProfile) => {
      navigate(`/user/${profile.id}`);
      onClose?.();
    },
    [navigate, onClose],
  );

  const containerClass = embedded
    ? "space-y-3"
    : "fixed inset-0 z-[60] bg-background flex flex-col";

  return (
    <div className={containerClass}>
      {!embedded && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shrink-0"
        >
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:bg-white/[0.12] active:scale-90"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-extrabold">Find People</h1>
        </motion.div>
      )}

      {/* Search input */}
      <div className="relative px-4">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or name…"
          autoFocus={!embedded}
          className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] py-3 pl-11 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 focus:bg-white/[0.06] transition"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-6 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="oxen-skeleton-globe" aria-label="Loading" />
          </div>
        )}

        {!loading && query.trim() && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03]">
              <Users className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No users found</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Try searching by username or name
            </p>
          </div>
        )}

        {!query.trim() && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03]">
              <Search className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Search for people on OXEN</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Find travelers by username or name
            </p>
          </div>
        )}

        <AnimatePresence>
          {results.map((profile, i) => {
            const isFollowing = followStatus.get(profile.id) ?? false;
            return (
              <motion.button
                key={profile.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ delay: Math.min(i * 0.04, 0.2), type: "spring" as const, stiffness: 300, damping: 26 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectUser(profile)}
                className="glass flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-all hover:border-white/[0.12]"
              >
                {/* Avatar */}
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name ?? "User"}
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400/30 to-primary/30 text-sm font-bold">
                    {getInitials(profile.name)}
                  </div>
                )}

                {/* Name + username */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">
                    {profile.name ?? "Explorer"}
                  </p>
                  {profile.username && (
                    <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
                  )}
                </div>

                {/* Follow badge */}
                {isFollowing && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    Following
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
