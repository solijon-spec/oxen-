import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, UserPlus, UserCheck, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  getSocialProfile, getFollowers, getFollowing,
  followUser, unfollowUser, checkFollowStatus, getInitials,
  type SocialProfile,
} from "@/lib/social";
import { cn } from "@/lib/utils";

/**
 * Followers / Following list page.
 * Route: /user/:userId/followers or /user/:userId/following
 */
export default function FollowList() {
  const { userId, type } = useParams<{ userId: string; type: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [followStatus, setFollowStatus] = useState<Map<string, boolean>>(new Map());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("");

  const isFollowers = type === "followers";

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void (async () => {
      setLoading(true);
      const [list, profile] = await Promise.all([
        isFollowers ? getFollowers(userId) : getFollowing(userId),
        getSocialProfile(userId),
      ]);
      if (!active) return;
      setUsers(list);
      setProfileName(profile?.name ?? "User");
      setLoading(false);

      // Check follow status for all listed users (from current user's perspective)
      if (currentUser && !currentUser.isGuest && list.length > 0) {
        const status = await checkFollowStatus(list.map((u) => u.id));
        if (active) setFollowStatus(status);
      }
    })();
    return () => { active = false; };
  }, [userId, type, isFollowers, currentUser]);

  const handleFollowToggle = useCallback(async (targetId: string) => {
    setTogglingId(targetId);
    const isCurrentlyFollowing = followStatus.get(targetId) ?? false;
    try {
      if (isCurrentlyFollowing) {
        const { error } = await unfollowUser(targetId);
        if (error) {
          toast({ title: "Failed to unfollow", description: error, variant: "destructive" });
          return;
        }
        setFollowStatus((prev) => {
          const next = new Map(prev);
          next.set(targetId, false);
          return next;
        });
      } else {
        const { error } = await followUser(targetId);
        if (error) {
          toast({ title: "Failed to follow", description: error, variant: "destructive" });
          return;
        }
        setFollowStatus((prev) => {
          const next = new Map(prev);
          next.set(targetId, true);
          return next;
        });
      }
    } finally {
      setTogglingId(null);
    }
  }, [followStatus, toast]);

  const title = isFollowers ? "Followers" : "Following";

  return (
    <div className="relative mx-auto max-w-2xl px-4 pt-2 pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 pt-2 pb-4"
      >
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card/50 backdrop-blur-xl border border-white/10 text-muted-foreground transition hover:bg-card/70 hover:text-foreground active:scale-90"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold truncate">{title}</h1>
          <p className="text-xs text-muted-foreground truncate">{profileName}</p>
        </div>
      </motion.div>

      {/* List */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="oxen-skeleton-globe" aria-label="Loading" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03]">
            <UserPlus className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {isFollowers ? "No followers yet" : "Not following anyone yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {users.map((u, i) => {
              const isFollowing = followStatus.get(u.id) ?? false;
              const isSelf = currentUser?.id === u.id;
              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ delay: Math.min(i * 0.04, 0.2), type: "spring" as const, stiffness: 300, damping: 26 }}
                  className="glass flex w-full items-center gap-3 rounded-2xl p-3.5"
                >
                  {/* Avatar — clickable to profile */}
                  <button
                    onClick={() => navigate(`/user/${u.id}`)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt={u.name ?? "User"}
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400/30 to-primary/30 text-sm font-bold">
                        {getInitials(u.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{u.name ?? "Explorer"}</p>
                      {u.username && (
                        <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                      )}
                    </div>
                  </button>

                  {/* Follow/Following button */}
                  {!isSelf && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleFollowToggle(u.id)}
                      disabled={togglingId === u.id}
                      className={cn(
                        "shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                        isFollowing
                          ? "bg-white/[0.06] text-foreground hover:bg-white/[0.1]"
                          : "gold-gradient text-primary-foreground shadow-md",
                      )}
                    >
                      {togglingId === u.id ? "…" : isFollowing ? "Following" : "Follow"}
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
