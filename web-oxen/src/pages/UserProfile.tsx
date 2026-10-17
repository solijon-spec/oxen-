import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, UserPlus, UserCheck, MessageSquare, Users, Edit3,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  getSocialProfile, followUser, unfollowUser, isFollowing,
  getOrCreateConversation, getFollowers, getFollowing, getFollowCounts, getInitials,
  type SocialProfile,
} from "@/lib/social";
import { cn } from "@/lib/utils";

/**
 * Public user profile page — shows another user's profile with
 * Follow/Unfollow and Message buttons. Does NOT show those buttons
 * on the current user's own profile.
 */
export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [following, setFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);
  const [msgLoading, setMsgLoading] = useState<boolean>(false);
  const [followCounts, setFollowCounts] = useState<{ followers: number; following: number }>({ followers: 0, following: 0 });
  const [postsCount] = useState<number>(0);

  const isOwnProfile = currentUser?.id === userId;

  // Load profile + follow status
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void (async () => {
      setLoading(true);
      const p = await getSocialProfile(userId);
      if (!active) return;
      setProfile(p);
      setLoading(false);

      if (!isOwnProfile && currentUser && !currentUser.isGuest) {
        const isFollowed = await isFollowing(userId);
        if (active) setFollowing(isFollowed);
      }

      // Load real follower/following counts from follows table
      const counts = await getFollowCounts(userId);
      if (active) setFollowCounts(counts);
    })();
    return () => { active = false; };
  }, [userId, currentUser?.id, isOwnProfile, currentUser]);

  const handleFollowToggle = useCallback(async () => {
    if (!profile || !userId) return;
    setFollowLoading(true);
    try {
      if (following) {
        const { error } = await unfollowUser(userId);
        if (error) {
          toast({ title: "Failed to unfollow", description: error, variant: "destructive" });
        } else {
          setFollowing(false);
          setFollowCounts((prev) => ({ ...prev, followers: Math.max(prev.followers - 1, 0) }));
        }
      } else {
        const { error } = await followUser(userId);
        if (error) {
          toast({ title: "Failed to follow", description: error, variant: "destructive" });
        } else {
          setFollowing(true);
          setFollowCounts((prev) => ({ ...prev, followers: prev.followers + 1 }));
        }
      }
    } finally {
      setFollowLoading(false);
    }
  }, [following, profile, userId, toast]);

  const handleMessage = useCallback(async () => {
    if (!userId) return;
    setMsgLoading(true);
    try {
      const { conversationId, error } = await getOrCreateConversation(userId);
      if (error || !conversationId) {
        toast({ title: "Failed to start conversation", description: error ?? "Please try again.", variant: "destructive" });
        return;
      }
      navigate(`/messages?conv=${conversationId}`);
    } finally {
      setMsgLoading(false);
    }
  }, [userId, navigate, toast]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="oxen-skeleton-globe" aria-label="Loading" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-10 pb-32 text-center">
        <p className="text-sm text-muted-foreground">User not found.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 rounded-xl bg-white/[0.06] px-5 py-2.5 text-sm font-bold transition hover:bg-white/[0.1] active:scale-95"
        >
          Go Back
        </button>
      </div>
    );
  }

  const displayName = profile.name ?? "Explorer";

  return (
    <div className="relative mx-auto max-w-2xl px-4 pt-2 pb-32">
      {/* Header with back button */}
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
          <h1 className="font-display text-lg font-extrabold truncate">Profile</h1>
          <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
        </div>
      </motion.div>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring" as const, stiffness: 260, damping: 24 }}
        className="glass rounded-3xl border border-white/[0.06] p-6 text-center"
      >
        {/* Avatar */}
        <div className="relative mx-auto mb-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-24 w-24 rounded-full object-cover ring-2 ring-white/10"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-400/30 to-primary/30 text-2xl font-bold ring-2 ring-white/10">
              {getInitials(displayName)}
            </div>
          )}
        </div>

        {/* Name + username */}
        <h2 className="font-display text-xl font-extrabold">{displayName}</h2>
        {profile.username && (
          <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
        )}

        {/* Bio */}


        {/* Stats row */}
        <div className="mt-5 flex items-center justify-center gap-6">
          <button
            onClick={() => navigate(`/user/${userId}/followers`)}
            className="flex flex-col items-center transition active:scale-95"
          >
            <span className="font-display text-lg font-extrabold tabular-nums">{followCounts.followers}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Followers</span>
          </button>
          <div className="h-8 w-px bg-white/[0.08]" />
          <button
            onClick={() => navigate(`/user/${userId}/following`)}
            className="flex flex-col items-center transition active:scale-95"
          >
            <span className="font-display text-lg font-extrabold tabular-nums">{followCounts.following}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Following</span>
          </button>
          <div className="h-8 w-px bg-white/[0.08]" />
          <div className="flex flex-col items-center">
            <span className="font-display text-lg font-extrabold tabular-nums">{postsCount}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Posts</span>
          </div>
        </div>

        {/* Action buttons — only for other users' profiles */}
        {!isOwnProfile && (
          <div className="mt-6 flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all",
                following
                  ? "bg-white/[0.06] text-foreground hover:bg-white/[0.1]"
                  : "gold-gradient text-primary-foreground shadow-lg shadow-primary/20",
              )}
            >
              {followLoading ? (
                <div className="oxen-skeleton-globe" aria-label="Loading" />
              ) : following ? (
                <>
                  <UserCheck className="h-4 w-4" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Follow
                </>
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleMessage}
              disabled={msgLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/[0.06] py-3 text-sm font-bold text-foreground transition hover:bg-white/[0.1]"
            >
              {msgLoading ? (
                <div className="oxen-skeleton-globe" aria-label="Loading" />
              ) : (
                <>
                  <MessageSquare className="h-4 w-4" />
                  Message
                </>
              )}
            </motion.button>
          </div>
        )}

        {/* Edit button for own profile */}
        {isOwnProfile && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/profile/edit")}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.06] py-3 text-sm font-bold text-foreground transition hover:bg-white/[0.1] active:scale-95"
          >
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
