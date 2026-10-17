import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Play, Heart, MessageCircle, Send, Bookmark,
  MapPin, Users, Compass, Loader2, Heart as HeartFilled,
} from "lucide-react";
import {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { OptimizedImage } from "@/components/OptimizedImage";
import VideoPlayer from "@/components/VideoPlayer";
import { useAuth } from "@/contexts/AuthContext";
import { useSocial } from "@/contexts/SocialContext";
import { useToast } from "@/hooks/use-toast";
import {
  getDiscoverFeed, getSeedDiscoverPosts, searchDiscover, getSuggestedUsers,
  likePost, unlikePost, getPostComments, addComment,
  formatCount, formatRelativeTime, getInitials,
  type DiscoverPost, type DiscoverUser, type PostComment,
} from "@/lib/discover";
import { followUser, unfollowUser } from "@/lib/social";
import { cn } from "@/lib/utils";

const springIn = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.9,
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: Math.min(i * 0.03, 0.3), type: "spring" as const, stiffness: 260, damping: 22 },
  }),
};

/* ── Post Detail Viewer (modal) ─────────────────────────────── */

function PostDetailViewer({
  post,
  onClose,
}: {
  post: DiscoverPost;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState<boolean>(post.liked_by_me);
  const [likeCount, setLikeCount] = useState<number>(post.likes_count);
  const [saved, setSaved] = useState<boolean>(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState<string>("");
  const [loadingComments, setLoadingComments] = useState<boolean>(true);
  const [sendingComment, setSendingComment] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const isOwnPost = user?.id === post.user_id;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingComments(true);
      const fetched = await getPostComments(post.id);
      if (!cancelled) {
        setComments(fetched);
        setLoadingComments(false);
      }
    })();
    return () => { cancelled = true; };
  }, [post.id]);

  const handleLike = useCallback(async () => {
    if (!user || user.isGuest) {
      toast({ title: "Sign in required", description: "Please sign in to like posts." });
      return;
    }
    // Optimistic toggle
    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(c - 1, 0));
      await unlikePost(post.id);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await likePost(post.id);
    }
  }, [liked, post.id, user, toast]);

  const handleSave = useCallback(() => {
    setSaved((s) => !s);
  }, []);

  const handleSendComment = useCallback(async () => {
    if (!user || user.isGuest) {
      toast({ title: "Sign in required", description: "Please sign in to comment." });
      return;
    }
    if (!commentText.trim() || sendingComment) return;
    setSendingComment(true);
    const { error, comment } = await addComment(post.id, commentText);
    if (error) {
      toast({ title: "Failed to comment", description: error, variant: "destructive" });
    } else if (comment) {
      setComments((prev) => [comment, ...prev]);
      setCommentText("");
    }
    setSendingComment(false);
  }, [post.id, commentText, sendingComment, user, toast]);

  const handleFollowToggle = useCallback(async () => {
    if (!user || user.isGuest) return;
    if (isFollowing) {
      await unfollowUser(post.user_id);
      setIsFollowing(false);
    } else {
      await followUser(post.user_id);
      setIsFollowing(true);
    }
  }, [isFollowing, post.user_id, user]);

  const handleAuthorClick = useCallback(() => {
    onClose();
    navigate(`/user/${post.user_id}`);
  }, [post.user_id, navigate, onClose]);

  const authorName = post.author?.name ?? "Explorer";
  const authorUsername = post.author?.username;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-90"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={springIn}
          className="relative flex h-full w-full max-w-4xl flex-col overflow-hidden bg-card/95 md:flex-row md:rounded-3xl md:h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Media side */}
          <div className="relative flex h-[40vh] items-center justify-center bg-black sm:h-[45vh] md:h-full md:flex-1">
            {post.media_type === "video" ? (
              <VideoPlayer
                src={post.media_url}
                poster={post.thumbnail_url ?? undefined}
                autoPlay
                className="h-full w-full"
              />
            ) : (
              <OptimizedImage
                src={post.media_url}
                alt={post.caption || "Post"}
                placeholderType="post"
                className="h-full w-full object-contain"
              />
            )}
          </div>

          {/* Details side */}
          <div className="flex flex-1 flex-col overflow-hidden border-t border-white/[0.06] md:border-l md:border-t-0">
            {/* Author header */}
            <div className="flex items-center gap-3 border-b border-white/[0.06] p-4">
              <button onClick={handleAuthorClick} className="flex items-center gap-3 flex-1 min-w-0">
                {post.author?.avatar_url ? (
                  <img
                    src={post.author.avatar_url}
                    alt={authorName}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400/30 to-primary/30 text-sm font-bold">
                    {getInitials(authorName)}
                  </div>
                )}
                <div className="min-w-0 text-left">
                  <p className="text-sm font-bold truncate">{authorName}</p>
                  {authorUsername && (
                    <p className="text-xs text-muted-foreground truncate">@{authorUsername}</p>
                  )}
                </div>
              </button>
              {!isOwnPost && user && !user.isGuest && (
                <button
                  onClick={handleFollowToggle}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition active:scale-95",
                    isFollowing
                      ? "bg-white/[0.08] text-muted-foreground"
                      : "gold-gradient text-primary-foreground",
                  )}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>

            {/* Caption + location */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(post.location || post.country) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {post.location || `${post.city ?? ""}, ${post.country ?? ""}`}
                </div>
              )}
              {post.caption && (
                <p className="text-sm leading-relaxed text-foreground">{post.caption}</p>
              )}
              {post.hashtags.length > 0 && (
                <p className="text-xs text-primary">
                  {post.hashtags.map((h) => `#${h}`).join(" ")}
                </p>
              )}

              {/* Comments */}
              <div className="pt-2 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Comments ({comments.length})
                </p>
                {loadingComments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No comments yet</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-2.5">
                      {c.author?.avatar_url ? (
                        <img
                          src={c.author.avatar_url}
                          alt={c.author?.name ?? "User"}
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-bold">
                          {getInitials(c.author?.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs">
                          <span className="font-bold">{c.author?.username ?? c.author?.name ?? "User"}</span>{" "}
                          <span className="text-muted-foreground">{c.content}</span>
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                          {formatRelativeTime(c.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action bar */}
            <div className="border-t border-white/[0.06] p-3 space-y-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLike}
                  className="flex items-center gap-1.5 transition active:scale-90"
                >
                  {liked ? (
                    <HeartFilled className="h-5 w-5 fill-red-500 text-red-500" />
                  ) : (
                    <Heart className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-xs font-semibold">{formatCount(likeCount)}</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs font-semibold">{formatCount(post.comments_count)}</span>
                </div>
                <button
                  onClick={handleSave}
                  className="ml-auto transition active:scale-90"
                >
                  <Bookmark
                    className={cn("h-5 w-5", saved ? "fill-primary text-primary" : "text-muted-foreground")}
                  />
                </button>
              </div>

              {/* Comment input */}
              {user && !user.isGuest ? (
                <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                    placeholder="Add a comment…"
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                  <button
                    onClick={handleSendComment}
                    disabled={!commentText.trim() || sendingComment}
                    className="text-primary transition active:scale-90 disabled:opacity-30"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="text-center text-[10px] text-muted-foreground/50">
                  Sign in to comment
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

/* ── User Result Card ───────────────────────────────────────── */

function UserResultCard({
  user: u,
  index,
  onSelect,
}: {
  user: DiscoverUser;
  index: number;
  onSelect: (u: DiscoverUser) => void;
}) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [following, setFollowing] = useState<boolean>(u.is_following);
  const [busy, setBusy] = useState<boolean>(false);

  const handleFollow = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || currentUser.isGuest) {
      toast({ title: "Sign in required", description: "Please sign in to follow users." });
      return;
    }
    setBusy(true);
    if (following) {
      await unfollowUser(u.id);
      setFollowing(false);
    } else {
      await followUser(u.id);
      setFollowing(true);
    }
    setBusy(false);
  }, [following, u.id, currentUser, toast]);

  const displayName = u.name ?? "Explorer";

  return (
    <motion.button
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(u)}
      className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all hover:border-white/[0.12]"
    >
      {u.avatar_url ? (
        <img
          src={u.avatar_url}
          alt={displayName}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400/30 to-primary/30 text-sm font-bold">
          {getInitials(displayName)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate">{displayName}</p>
        {u.username && (
          <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
        )}
      </div>
      {currentUser && !currentUser.isGuest && currentUser.id !== u.id && (
        <button
          onClick={handleFollow}
          disabled={busy}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition active:scale-90 disabled:opacity-50",
            following
              ? "bg-white/[0.08] text-muted-foreground"
              : "gold-gradient text-primary-foreground",
          )}
        >
          {following ? "Following" : "Follow"}
        </button>
      )}
    </motion.button>
  );
}

/* ── Media Grid Item ────────────────────────────────────────── */

function MediaGridItem({
  post,
  index,
  onClick,
}: {
  post: DiscoverPost;
  index: number;
  onClick: () => void;
}) {
  const thumbnail = post.thumbnail_url ?? post.media_url;

  return (
    <motion.button
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-xl bg-white/[0.02]"
    >
      <OptimizedImage
        src={thumbnail}
        alt={post.caption || "Post"}
        placeholderType="post"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
      />
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Video indicator */}
      {post.media_type === "video" && (
        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
          <Play className="h-3 w-3 fill-white text-white" />
        </div>
      )}

      {/* Likes indicator */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <HeartFilled className="h-3 w-3 fill-white text-white" />
        <span className="text-[10px] font-bold text-white">{formatCount(post.likes_count)}</span>
      </div>
    </motion.button>
  );
}

/* ── Main Discover Page ─────────────────────────────────────── */

export default function Discover() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [query, setQuery] = useState<string>("");
  const [feed, setFeed] = useState<DiscoverPost[]>([]);
  const [loadingFeed, setLoadingFeed] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const [searchResults, setSearchResults] = useState<SearchResultData>({ users: [], posts: [] });
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const [suggestedUsers, setSuggestedUsers] = useState<DiscoverUser[]>([]);
  const [loadingSuggested, setLoadingSuggested] = useState<boolean>(true);

  const [selectedPost, setSelectedPost] = useState<DiscoverPost | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqRef = useRef<number>(0);
  const loadingRef = useRef<boolean>(false);

  interface SearchResultData {
    users: DiscoverUser[];
    posts: DiscoverPost[];
  }

  // Load initial feed + suggested users
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingFeed(true);
      setLoadingSuggested(true);

      const [posts, suggested] = await Promise.all([
        getDiscoverFeed(0, 24, []),
        user && !user.isGuest ? getSuggestedUsers(user.id, 20) : Promise.resolve([] as DiscoverUser[]),
      ]);

      if (cancelled) return;

      if (posts.length === 0) {
        // Fall back to seed data so the page isn't empty
        const seed = getSeedDiscoverPosts();
        setFeed(seed);
        setHasMore(false);
      } else {
        setFeed(posts);
        setHasMore(posts.length >= 24);
      }
      setLoadingFeed(false);

      setSuggestedUsers(suggested);
      setLoadingSuggested(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Load more feed (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const more = await getDiscoverFeed(nextPage, 24, []);
    if (more.length === 0) {
      setHasMore(false);
    } else {
      setFeed((prev) => [...prev, ...more]);
      setPage(nextPage);
      setHasMore(more.length >= 24);
    }
    setLoadingMore(false);
  }, [page, loadingMore, hasMore]);

  // Debounced search — starts after 1 character, 300ms debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSearchResults({ users: [], posts: [] });
      setLoadingSearch(false);
      return;
    }

    setLoadingSearch(true);
    debounceRef.current = setTimeout(async () => {
      if (!user || user.isGuest) {
        setLoadingSearch(false);
        return;
      }
      const reqId = ++reqRef.current;
      const result = await searchDiscover(query, user.id, 20);
      if (reqId === reqRef.current) {
        setSearchResults(result);
        setLoadingSearch(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, user]);

  const handleSelectUser = useCallback((u: DiscoverUser) => {
    navigate(`/user/${u.id}`);
  }, [navigate]);

  const handlePostClick = useCallback((post: DiscoverPost) => {
    setSelectedPost(post);
  }, []);

  const isSearching = query.trim().length > 0;

  return (
    <div className="min-h-screen pt-16 pb-10">
      {/* Sticky search bar */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springIn}
        className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl px-4 pt-2 pb-3"
      >
        <div className="mx-auto max-w-5xl">
          <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={2} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people by username"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-muted-foreground transition hover:text-foreground active:scale-90"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Content area */}
      <div className="mx-auto max-w-5xl px-4">
        {isSearching ? (
          /* ── Search Results ── */
          <div className="space-y-4">
            {/* Users section */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  People
                </h2>
              </div>
              {loadingSearch ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.users.length > 0 ? (
                <div className="space-y-2">
                  <AnimatePresence>
                    {searchResults.users.map((u, i) => (
                      <UserResultCard
                        key={u.id}
                        user={u}
                        index={i}
                        onSelect={handleSelectUser}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
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
            </div>

            {/* Posts section (optional, below users) */}
            {searchResults.posts.length > 0 && (
              <div className="pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Matching Posts
                  </h2>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
                  {searchResults.posts.map((post, i) => (
                    <MediaGridItem
                      key={post.id}
                      post={post}
                      index={i}
                      onClick={() => handlePostClick(post)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Default Feed (Suggested Users + Instagram-style grid) ── */
          <div>
            {/* Suggested for you section */}
            {user && !user.isGuest && (
              <div className="mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, duration: 0.3 }}
                  className="mb-3 flex items-center gap-2"
                >
                  <Users className="h-4 w-4 text-primary" strokeWidth={2.2} />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Suggested for you
                  </h2>
                  {suggestedUsers.length > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground/60">
                      {suggestedUsers.length} people
                    </span>
                  )}
                </motion.div>

                {loadingSuggested ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="glass flex items-center gap-3 rounded-2xl p-3"
                      >
                        <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-white/[0.04]" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-32 animate-pulse rounded bg-white/[0.04]" />
                          <div className="h-2.5 w-24 animate-pulse rounded bg-white/[0.03]" />
                        </div>
                        <div className="h-7 w-20 animate-pulse rounded-full bg-white/[0.04]" />
                      </div>
                    ))}
                  </div>
                ) : suggestedUsers.length > 0 ? (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {suggestedUsers.map((u, i) => (
                        <UserResultCard
                          key={u.id}
                          user={u}
                          index={i}
                          onSelect={handleSelectUser}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="glass flex flex-col items-center justify-center rounded-2xl py-8 text-center">
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.03]">
                      <Users className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                    <p className="text-xs text-muted-foreground/70">
                      No suggestions yet. New community members will appear here.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Feed Header */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="mb-4 flex items-center gap-2"
            >
              <Compass className="h-5 w-5 text-primary" strokeWidth={2.2} />
              <h1 className="font-display text-xl font-extrabold">Discover</h1>
              <span className="ml-auto text-xs text-muted-foreground">Recommended for you</span>
            </motion.div>

            {loadingFeed ? (
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square animate-pulse rounded-xl bg-white/[0.03]"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  />
                ))}
              </div>
            ) : feed.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
                  {feed.map((post, i) => (
                    <MediaGridItem
                      key={post.id}
                      post={post}
                      index={i}
                      onClick={() => handlePostClick(post)}
                    />
                  ))}
                </div>

                {/* Load more */}
                {hasMore && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="glass flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-white/[0.08] active:scale-95 disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      {loadingMore ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03]">
                  <Compass className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No posts yet</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground/60">
                  Be the first to share your travel moments. Posts from the OXEN community will appear here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post detail viewer */}
      {selectedPost && (
        <PostDetailViewer
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}
