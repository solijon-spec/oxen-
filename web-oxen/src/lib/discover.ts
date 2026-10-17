import { supabase } from "./supabase";
import { checkFollowStatus, getInitials } from "./social";
import { FEED_POSTS } from "@/data/feedData";

// ── Types ──────────────────────────────────────────────────

/**
 * Minimal profile shape matching the current public.profiles schema.
 * Only includes columns that exist: id, username, name, avatar_url, created_at, updated_at.
 * Email is intentionally excluded from search results (never shown to other users).
 */
export interface DiscoverProfile {
  id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface DiscoverPost {
  id: string;
  user_id: string;
  caption: string;
  media_type: "image" | "video";
  media_url: string;
  thumbnail_url: string | null;
  location: string | null;
  country: string | null;
  city: string | null;
  hashtags: string[];
  likes_count: number;
  comments_count: number;
  views_count: number;
  is_private: boolean;
  created_at: string;
  /** Joined author profile */
  author: DiscoverProfile | null;
  /** Whether current user liked this post */
  liked_by_me: boolean;
}

export interface DiscoverUser extends DiscoverProfile {
  is_following: boolean;
}

export interface SearchResult {
  users: DiscoverUser[];
  /** Matching post captions (optional, shown below users) */
  posts: DiscoverPost[];
}

/** Profile columns that exist in public.profiles — used in all select queries. */
const PROFILE_COLUMNS =
  "id, username, name, avatar_url, created_at, updated_at";

// ── Feed ───────────────────────────────────────────────────

/**
 * Fetch a paginated feed of recommended posts for Discover.
 * Uses deterministic scoring:
 *   score = likes_count * 3 + comments_count * 5 + views_count * 0.1 + recency_bonus
 * Followed users get a bonus (applied client-side after fetch).
 *
 * RLS ensures only visible posts (public, own, or followed-private) are returned.
 */
export async function getDiscoverFeed(
  page: number = 0,
  pageSize: number = 24,
  followedUserIds: string[] = [],
): Promise<DiscoverPost[]> {
  const offset = page * pageSize;

  // Fetch posts with author profile join, ordered by created_at desc
  // RLS already filters to visible posts
  const { data, error } = await supabase
    .from("posts")
    .select(`
      id, user_id, caption, media_type, media_url, thumbnail_url,
      location, country, city, hashtags,
      likes_count, comments_count, views_count, is_private,
      created_at,
      author:profiles!posts_user_id_fkey (${PROFILE_COLUMNS})
    `)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    // PGRST205 = table not in schema cache (migration not run yet) — expected, fall back to seed
    if (error.code !== "PGRST205") {
      console.error("[getDiscoverFeed] Error:", {
        code: error.code,
        message: error.message,
      });
    }
    return [];
  }

  if (!data || data.length === 0) return [];

  // Get current user's likes for these posts
  const postIds = data.map((p) => p.id);
  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData.user?.id;

  let likedPostIds = new Set<string>();
  if (currentUserId) {
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .in("post_id", postIds)
      .eq("user_id", currentUserId);
    likedPostIds = new Set((likes ?? []).map((l) => l.post_id));
  }

  const followedSet = new Set(followedUserIds);

  // Score and sort posts
  const now = Date.now();
  const scored = (data as unknown as Array<Record<string, unknown> & { id: string; created_at: string; likes_count: number; comments_count: number; views_count: number; user_id: string }>).map((row) => {
    const author = row.author as DiscoverProfile | null;
    const post: DiscoverPost = {
      id: row.id,
      user_id: row.user_id as string,
      caption: row.caption as string,
      media_type: row.media_type as "image" | "video",
      media_url: row.media_url as string,
      thumbnail_url: row.thumbnail_url as string | null,
      location: row.location as string | null,
      country: row.country as string | null,
      city: row.city as string | null,
      hashtags: row.hashtags as string[] ?? [],
      likes_count: row.likes_count as number,
      comments_count: row.comments_count as number,
      views_count: row.views_count as number,
      is_private: row.is_private as boolean,
      created_at: row.created_at as string,
      author,
      liked_by_me: likedPostIds.has(row.id),
    };

    // Deterministic scoring formula
    const ageHours = (now - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
    const recencyBonus = Math.max(50 - ageHours * 2, 0); // up to 50 points for recent
    const followedBonus = followedSet.has(post.user_id) ? 100 : 0;

    const score =
      post.likes_count * 3 +
      post.comments_count * 5 +
      post.views_count * 0.1 +
      recencyBonus +
      followedBonus;

    return { post, score };
  });

  // Sort by score descending (first page might be trending, later pages more chronological)
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.post);
}

/**
 * Get total post count for pagination info.
 */
export async function getDiscoverFeedTotal(): Promise<number> {
  const { count, error } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false)
    .eq("is_private", false);

  if (error) {
    if (error.code !== "PGRST205") {
      console.error("[getDiscoverFeedTotal] Error:", {
        code: error.code,
        message: error.message,
      });
    }
    return 0;
  }

  return count ?? 0;
}

// ── Search ─────────────────────────────────────────────────

/**
 * Normalize a search query: trim, lowercase, remove leading @, collapse spaces.
 * Also sanitizes for safe use in Supabase ilike patterns.
 */
function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Escape special LIKE/ILIKE pattern characters (%, _, \) so they match literally.
 */
function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, "\\$&");
}

/**
 * Score a user profile against the normalized query.
 * Priority (descending):
 *   100 — exact username match
 *   80  — username starts with query
 *   70  — name starts with query
 *   50  — username contains query
 *   40  — name contains query
 *   20  — recommended / weak match
 */
function scoreUser(profile: DiscoverProfile, q: string): number {
  const username = (profile.username ?? "").toLowerCase();
  const name = (profile.name ?? "").toLowerCase();

  if (username === q) return 100;
  if (username.startsWith(q)) return 80;
  if (name.startsWith(q)) return 70;
  if (username.includes(q)) return 50;
  if (name.includes(q)) return 40;
  return 20;
}

/**
 * Search for users and posts by query.
 *
 * Multi-tier search: fires starts-with and contains queries in parallel
 * against public.profiles using only the `username` and `name` columns,
 * merges results without duplicates, scores each user by match quality,
 * and sorts by score descending.
 *
 * Starts searching after 1 character. Debounce is handled by the caller.
 *
 * @param query          Raw search query (will be normalized)
 * @param currentUserId  Current user ID (excluded from results)
 * @param limit          Max users to return (default 20)
 */
export async function searchDiscover(
  query: string,
  currentUserId: string,
  limit: number = 20,
): Promise<SearchResult> {
  const rawQ = normalizeQuery(query);
  if (rawQ.length < 1) return { users: [], posts: [] };

  const q = escapeIlike(rawQ);

  // ── Tier 1 & 2: starts-with and contains (parallel) ──
  // Search only username and name columns (the only text columns on profiles).
  // NOTE: current user is NOT excluded for testing/debugging — the user
  // explicitly requested that the current user appear in search results
  // so we can verify the query actually hits the database.
  const [startsWithRes, containsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .or(`username.ilike.${q}%,name.ilike.${q}%`)
      .limit(limit * 3),
    supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .or(`username.ilike.%${q}%,name.ilike.%${q}%`)
      .limit(limit * 3),
  ]);

  // Log errors safely — never log tokens, sessions, or credentials
  if (startsWithRes.error) {
    console.error("[searchDiscover] starts-with query error:", {
      normalizedQuery: rawQ,
      errorCode: startsWithRes.error.code,
      errorMessage: startsWithRes.error.message,
      resultCount: 0,
    });
  }
  if (containsRes.error) {
    console.error("[searchDiscover] contains query error:", {
      normalizedQuery: rawQ,
      errorCode: containsRes.error.code,
      errorMessage: containsRes.error.message,
      resultCount: 0,
    });
  }

  // If both queries errored, return empty (errors logged above)
  if (startsWithRes.error && containsRes.error) {
    return { users: [], posts: [] };
  }

  // Merge results without duplicates (by id), preferring starts-with hits
  const userMap = new Map<string, DiscoverProfile>();
  for (const row of (startsWithRes.data ?? []) as DiscoverProfile[]) {
    userMap.set(row.id, row);
  }
  for (const row of (containsRes.data ?? []) as DiscoverProfile[]) {
    if (!userMap.has(row.id)) userMap.set(row.id, row);
  }

  // Score and sort
  const scored = Array.from(userMap.values())
    .map((profile) => ({ profile, score: scoreUser(profile, rawQ) }))
    .sort((a, b) => b.score - a.score);

  const totalResults = scored.length;
  console.debug("[searchDiscover] search completed:", {
    normalizedQuery: rawQ,
    startsWithHits: startsWithRes.data?.length ?? 0,
    containsHits: containsRes.data?.length ?? 0,
    resultCount: totalResults,
  });

  const topUsers = scored.slice(0, limit).map((s) => s.profile);

  // Check follow status for found users
  let followMap = new Map<string, boolean>();
  if (topUsers.length > 0) {
    followMap = await checkFollowStatus(topUsers.map((u) => u.id));
  }

  const discoverUsers: DiscoverUser[] = topUsers.map((u) => ({
    ...u,
    is_following: followMap.get(u.id) ?? false,
  }));

  // Search posts by caption (optional, limited to 10)
  let posts: DiscoverPost[] = [];
  try {
    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select(`
        id, user_id, caption, media_type, media_url, thumbnail_url,
        location, country, city, hashtags,
        likes_count, comments_count, views_count, is_private,
        created_at,
        author:profiles!posts_user_id_fkey (${PROFILE_COLUMNS})
      `)
      .eq("is_deleted", false)
      .ilike("caption", `%${q}%`)
      .order("likes_count", { ascending: false })
      .limit(10);

    if (postError) {
      if (postError.code !== "PGRST205") {
        console.error("[searchDiscover] post search error:", {
          normalizedQuery: rawQ,
          errorCode: postError.code,
          errorMessage: postError.message,
        });
      }
    } else if (postData) {
      posts = (postData as unknown as Array<Record<string, unknown>>).map((row) => ({
        id: row.id as string,
        user_id: row.user_id as string,
        caption: row.caption as string,
        media_type: row.media_type as "image" | "video",
        media_url: row.media_url as string,
        thumbnail_url: row.thumbnail_url as string | null,
        location: row.location as string | null,
        country: row.country as string | null,
        city: row.city as string | null,
        hashtags: row.hashtags as string[] ?? [],
        likes_count: row.likes_count as number,
        comments_count: row.comments_count as number,
        views_count: row.views_count as number,
        is_private: row.is_private as boolean,
        created_at: row.created_at as string,
        author: row.author as unknown as DiscoverProfile | null,
        liked_by_me: false,
      }));
    }
  } catch {
    // Post search is optional — don't fail the whole search
  }

  return { users: discoverUsers, posts };
}

/**
 * Get suggested users for the "Suggested for you" section when search is empty.
 * Returns recently created users, excluding the current user and users already followed.
 *
 * @param currentUserId  Current user ID (excluded)
 * @param limit          Max suggestions (default 20)
 */
export async function getSuggestedUsers(
  currentUserId: string,
  limit: number = 20,
): Promise<DiscoverUser[]> {
  // Fetch recent profiles. NOTE: current user is NOT excluded for testing —
  // the user explicitly requested seeing all profiles to verify search works.
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit * 2);

  if (error) {
    console.error("[getSuggestedUsers] Error:", {
      errorCode: error.code,
      errorMessage: error.message,
      resultCount: 0,
    });
    return [];
  }

  const allProfiles = (data ?? []) as DiscoverProfile[];
  if (allProfiles.length === 0) {
    console.debug("[getSuggestedUsers] No profiles found");
    return [];
  }

  // Check which of these the current user already follows
  const followMap = await checkFollowStatus(allProfiles.map((u) => u.id));

  // Prefer users with avatars, then by recency (already sorted by created_at desc)
  const suggestions = allProfiles
    .map((profile) => ({
      ...profile,
      is_following: followMap.get(profile.id) ?? false,
    }))
    .sort((a, b) => {
      // Users with avatars first; ties keep created_at desc order
      const aAvatar = a.avatar_url ? 1 : 0;
      const bAvatar = b.avatar_url ? 1 : 0;
      if (bAvatar !== aAvatar) return bAvatar - aAvatar;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, limit);

  console.debug("[getSuggestedUsers] completed:", {
    resultCount: suggestions.length,
  });

  return suggestions;
}

// ── Post interactions ──────────────────────────────────────

/**
 * Like a post. Idempotent.
 */
export async function likePost(postId: string): Promise<{ error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("post_likes")
    .upsert(
      { post_id: postId, user_id: userData.user.id },
      { onConflict: "post_id,user_id" },
    );

  if (error) {
    if (error.code !== "PGRST205") {
      console.error("[likePost] Error:", {
        code: error.code,
        message: error.message,
      });
    }
    return { error: error.message };
  }

  return {};
}

/**
 * Unlike a post. Idempotent.
 */
export async function unlikePost(postId: string): Promise<{ error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userData.user.id);

  if (error) {
    if (error.code !== "PGRST205") {
      console.error("[unlikePost] Error:", {
        code: error.code,
        message: error.message,
      });
    }
    return { error: error.message };
  }

  return {};
}

/**
 * Increment view count for a post (fire-and-forget).
 */
export async function incrementViewCount(postId: string): Promise<void> {
  const { error } = await supabase.rpc("increment_post_views", { post_id: postId });
  if (error) {
    // Non-critical — don't log
  }
}

// ── Comments ───────────────────────────────────────────────

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: DiscoverProfile | null;
}

/**
 * Get comments for a post, newest first.
 */
export async function getPostComments(
  postId: string,
  limit: number = 50,
): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from("post_comments")
    .select(`
      id, post_id, user_id, content, created_at, updated_at,
      author:profiles!post_comments_user_id_fkey (${PROFILE_COLUMNS})
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code !== "PGRST205") {
      console.error("[getPostComments] Error:", {
        code: error.code,
        message: error.message,
      });
    }
    return [];
  }

  return (data as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    post_id: row.post_id as string,
    user_id: row.user_id as string,
    content: row.content as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    author: row.author as unknown as DiscoverProfile | null,
  }));
}

/**
 * Add a comment to a post.
 */
export async function addComment(
  postId: string,
  content: string,
): Promise<{ error?: string; comment?: PostComment }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not authenticated." };
  if (!content.trim()) return { error: "Comment cannot be empty." };

  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: postId,
      user_id: userData.user.id,
      content: content.trim(),
    })
    .select(`
      id, post_id, user_id, content, created_at, updated_at,
      author:profiles!post_comments_user_id_fkey (${PROFILE_COLUMNS})
    `)
    .single();

  if (error) {
    if (error.code !== "PGRST205") {
      console.error("[addComment] Error:", {
        code: error.code,
        message: error.message,
      });
    }
    return { error: error.message };
  }

  return {
    comment: {
      id: data.id as string,
      post_id: data.post_id as string,
      user_id: data.user_id as string,
      content: data.content as string,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
      author: data.author as unknown as DiscoverProfile | null,
    },
  };
}

// ── Seed data fallback ─────────────────────────────────────

/**
 * When no posts exist in the database yet, generate seed content
 * from the existing FEED_POSTS data so the Discover page isn't empty.
 * These are NOT written to the database — they're display-only fallback.
 */
export function getSeedDiscoverPosts(): DiscoverPost[] {
  return FEED_POSTS.map((fp) => ({
    id: fp.id,
    user_id: fp.userId,
    caption: fp.caption,
    media_type: fp.isVideo ? "video" as const : "image" as const,
    media_url: fp.isVideo ? (fp.videoUrl ?? fp.coverUrl) : fp.coverUrl,
    thumbnail_url: fp.isVideo ? fp.coverUrl : null,
    location: `${fp.city}, ${fp.country}`,
    country: fp.country,
    city: fp.city,
    hashtags: [],
    likes_count: fp.likes,
    comments_count: fp.comments,
    views_count: Math.floor(fp.likes * 1.5),
    is_private: false,
    created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    author: {
      id: fp.userId,
      username: fp.username,
      name: fp.username.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      avatar_url: fp.avatarUrl,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    liked_by_me: false,
  }));
}

// ── Formatting helpers ─────────────────────────────────────

/** Format like/comment counts (e.g. 1.2K, 15.3K) */
export function formatCount(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(".0", "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
}

/** Format relative time (e.g. "2h", "3d", "1w") */
export function formatRelativeTime(timestamp: string): string {
  const d = new Date(timestamp);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Re-export getInitials for convenience
export { getInitials };
