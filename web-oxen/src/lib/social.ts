import { supabase, type Profile } from "./supabase";

// ── Types ──────────────────────────────────────────────────

/**
 * Public profile shape for social features.
 * Only id, username, name, avatar_url, email, created_at, updated_at
 * are guaranteed to exist on public.profiles. The remaining fields
 * are optional — they may exist if migrations 0010 added them, but
 * the queries below never SELECT them so the app works regardless.
 */
export interface SocialProfile {
  id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
  updated_at?: string | null;
  // Optional — only present if migration 0010 columns exist
  full_name?: string | null;
  bio?: string | null;
  followers_count?: number;
  following_count?: number;
  onboarding_completed?: boolean;
}

/** Columns that exist on public.profiles — used in all select queries.
 *  Includes full_name (added by migration 0007/0008) so the display name
 *  fallback chain works correctly. */
const SOCIAL_PROFILE_COLUMNS =
  "id, username, name, full_name, avatar_url, email, created_at, updated_at";

export interface FollowRecord {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  /** The other user in a 1:1 conversation. */
  other_user: SocialProfile | null;
  last_message: ChatMessage | null;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: "text" | "image" | "video";
  media_url: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

// ── Username helpers ───────────────────────────────────────

/**
 * Generate a base username from a name or email.
 * Lowercase, spaces→underscores, only a-z0-9_.
 */
export function generateBaseUsername(name: string | null | undefined, email: string | null | undefined): string {
  let base = name?.trim() || email?.split("@")[0] || "explorer";
  base = base.toLowerCase();
  base = base.replace(/\s+/g, "_");
  base = base.replace(/[^a-z0-9_.]/g, "");
  base = base.replace(/^[_.]+|[_.]+$/g, "");
  base = base.replace(/\.\.+/g, ".");
  if (!base) base = "explorer";
  return base;
}

/**
 * Find a unique username by appending a number if the base is taken.
 * Checks the database case-insensitively. Excludes the given user ID.
 */
export async function generateUniqueUsername(
  base: string,
  excludeUserId: string,
): Promise<string> {
  // First try the base itself
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", base)
    .neq("id", excludeUserId)
    .limit(1)
    .maybeSingle();

  if (!data) return base;

  // Append incrementing numbers until we find a unique one
  for (let i = 2; i <= 999; i++) {
    const candidate = `${base}${i}`;
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", candidate)
      .neq("id", excludeUserId)
      .limit(1)
      .maybeSingle();

    if (!existing) return candidate;
  }

  // Fallback — append a random suffix
  return `${base}${Math.floor(Math.random() * 90000 + 10000)}`;
}

/**
 * Check if a username is available (case-insensitive).
 * Excludes the current user.
 */
export async function checkUsernameAvailability(
  username: string,
  excludeUserId: string,
): Promise<"available" | "taken" | "invalid"> {
  const trimmed = username.trim().toLowerCase();
  if (!trimmed) return "invalid";
  if (trimmed.length < 3 || trimmed.length > 24) return "invalid";
  if (!/^[a-z0-9_.]+$/.test(trimmed)) return "invalid";
  if (/^[._]|[._]$/.test(trimmed)) return "invalid";
  if (trimmed.includes("..")) return "invalid";

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", trimmed)
    .neq("id", excludeUserId)
    .limit(1)
    .maybeSingle();

  if (error) {
    // On transient error, optimistically allow — DB unique index is the guard
    return "available";
  }

  return data ? "taken" : "available";
}

// ── Profile provisioning ───────────────────────────────────

/**
 * Ensure a profile has a username. If missing, generate one.
 * Called during ensureProfile() and onboarding.
 */
export async function ensureUsername(userId: string, name: string | null, email: string | null): Promise<string | null> {
  // Check if the user already has a username
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.username && profile.username.trim()) {
    return profile.username;
  }

  // Generate a unique username
  const base = generateBaseUsername(name, email);
  const unique = await generateUniqueUsername(base, userId);

  // Update the profile
  const { error } = await supabase
    .from("profiles")
    .update({ username: unique })
    .eq("id", userId);

  if (error) {
    console.error("[ensureUsername] Failed to set username:", error);
    return null;
  }

  return unique;
}

/**
 * Resolve the best display name for a profile.
 * Priority: username → full_name → name → email local-part → "User".
 * This ensures we never show "User" when a username or email is available.
 */
export function resolveDisplayName(profile: SocialProfile | null | undefined): string {
  if (!profile) return "User";
  if (profile.username && profile.username.trim()) return profile.username.trim();
  if (profile.full_name && profile.full_name.trim()) return profile.full_name.trim();
  if (profile.name && profile.name.trim()) return profile.name.trim();
  if (profile.email && profile.email.trim()) {
    const localPart = profile.email.split("@")[0];
    if (localPart && localPart.trim()) return localPart.trim();
  }
  return "User";
}

/**
 * Batch-fetch multiple social profiles by user IDs.
 * Uses a single query instead of N+1 individual fetches.
 * Returns a Map of userId → SocialProfile.
 */
export async function batchGetSocialProfiles(userIds: string[]): Promise<Map<string, SocialProfile>> {
  const result = new Map<string, SocialProfile>();
  if (userIds.length === 0) return result;

  const { data, error } = await supabase
    .from("profiles")
    .select(SOCIAL_PROFILE_COLUMNS)
    .in("id", userIds);

  if (error) {
    console.error("[batchGetSocialProfiles] Error:", error);
    return result;
  }

  for (const row of data ?? []) {
    result.set(row.id, row as SocialProfile);
  }

  return result;
}

/**
 * Get a social profile by user ID.
 */
export async function getSocialProfile(userId: string): Promise<SocialProfile | null> {
  console.log("[getSocialProfile] route ID:", userId);
  const { data, error } = await supabase
    .from("profiles")
    .select(SOCIAL_PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getSocialProfile] fetch error:", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return (data as SocialProfile) ?? null;
}

/**
 * Update the current user's profile (bio, avatar, etc).
 */
export async function updateMyProfile(updates: {
  username?: string;
  name?: string;
  avatar_url?: string;
}): Promise<{ error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not authenticated." };

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.username !== undefined) payload.username = updates.username.trim().toLowerCase();
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userData.user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "This username is already taken." };
    }
    return { error: error.message };
  }

  return {};
}

// ── Search ─────────────────────────────────────────────────

/**
 * Search users by username, full name, or email.
 * Case-insensitive, excludes the current user, limited results.
 */
export async function searchUsers(
  query: string,
  currentUserId: string,
  limit: number = 20,
): Promise<SocialProfile[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  // Use ilike for case-insensitive partial matching on username and name only
  const { data, error } = await supabase
    .from("profiles")
    .select(SOCIAL_PROFILE_COLUMNS)
    .neq("id", currentUserId)
    .or(`username.ilike.%${q}%,name.ilike.%${q}%`)
    .limit(limit);

  if (error) {
    console.error("[searchUsers] Error:", error);
    return [];
  }

  return (data as SocialProfile[]) ?? [];
}

// ── Follow system ──────────────────────────────────────────

/**
 * Follow a user. Idempotent — safe to call multiple times.
 */
export async function followUser(followingId: string): Promise<{ error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not authenticated." };
  if (userData.user.id === followingId) return { error: "You cannot follow yourself." };

  // Use upsert with onConflict to avoid duplicates
  const { error } = await supabase
    .from("follows")
    .upsert(
      { follower_id: userData.user.id, following_id: followingId },
      { onConflict: "follower_id,following_id" },
    );

  if (error) {
    console.error("[followUser] Error:", error);
    return { error: error.message };
  }

  return {};
}

/**
 * Unfollow a user. Idempotent.
 */
export async function unfollowUser(followingId: string): Promise<{ error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", userData.user.id)
    .eq("following_id", followingId);

  if (error) {
    console.error("[unfollowUser] Error:", error);
    return { error: error.message };
  }

  return {};
}

/**
 * Check if the current user is following a specific user.
 */
export async function isFollowing(followingId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", userData.user.id)
    .eq("following_id", followingId)
    .maybeSingle();

  if (error) {
    console.error("[isFollowing] Error:", error);
    return false;
  }

  return !!data;
}

/**
 * Check follow status for multiple users at once.
 * Returns a Map of userId → boolean.
 */
export async function checkFollowStatus(userIds: string[]): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (userIds.length === 0) return result;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return result;

  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userData.user.id)
    .in("following_id", userIds);

  if (error) {
    console.error("[checkFollowStatus] Error:", error);
    return result;
  }

  for (const row of data ?? []) {
    result.set(row.following_id, true);
  }

  return result;
}

/**
 * Get real follower and following counts directly from the follows table.
 * These are always accurate — no reliance on trigger-maintained profile columns.
 */
export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  return {
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  };
}

/**
 * Get the list of users that a user is following.
 */
export async function getFollowing(userId: string): Promise<SocialProfile[]> {
  const { data, error } = await supabase
    .from("follows")
    .select(`
      following_id,
      profiles!follows_following_id_fkey (
        ${SOCIAL_PROFILE_COLUMNS}
      )
    `)
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getFollowing] Error:", error);
    return [];
  }

  return (data ?? [])
    .map((row) => (row.profiles as unknown as SocialProfile) ?? null)
    .filter((p): p is SocialProfile => p !== null);
}

/**
 * Get the list of users following a user.
 */
export async function getFollowers(userId: string): Promise<SocialProfile[]> {
  const { data, error } = await supabase
    .from("follows")
    .select(`
      follower_id,
      profiles!follows_follower_id_fkey (
        ${SOCIAL_PROFILE_COLUMNS}
      )
    `)
    .eq("following_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getFollowers] Error:", error);
    return [];
  }

  return (data ?? [])
    .map((row) => (row.profiles as unknown as SocialProfile) ?? null)
    .filter((p): p is SocialProfile => p !== null);
}

// ── Messaging ──────────────────────────────────────────────

/**
 * Find or create a 1:1 conversation between the current user and another user.
 * Uses the `get_or_create_direct_conversation` Postgres RPC so that all
 * conversation + member inserts happen server-side under SECURITY DEFINER,
 * avoiding client-side RLS violations on the `conversations` table.
 * Never creates duplicate conversations for the same pair.
 *
 * `otherUserId` must be the other user's `auth.users.id` (which is the same
 * value as `profiles.id` — the two are identical in this schema).
 */
export async function getOrCreateConversation(otherUserId: string): Promise<{ conversationId: string | null; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { conversationId: null, error: "Not authenticated." };

  const currentUserId = userData.user.id;
  if (currentUserId === otherUserId) return { conversationId: null, error: "You cannot message yourself." };

  // Single RPC call — the Postgres function handles:
  //   1. Checking for an existing 1:1 conversation between these two users
  //   2. Creating a new conversation + adding both members if none exists
  //   3. Returning the conversation UUID (existing or newly created)
  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", {
    other_user_id: otherUserId,
  });

  if (error) {
    console.error("[getOrCreateConversation] RPC error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { conversationId: null, error: error.message };
  }

  // The RPC returns a single UUID value (the conversation id).
  // supabase.rpc unwraps scalar returns, so `data` is the UUID string.
  const conversationId = typeof data === "string" ? data : (data as { conversation_id?: string })?.conversation_id ?? null;

  if (!conversationId) {
    console.error("[getOrCreateConversation] RPC returned no conversation id:", data);
    return { conversationId: null, error: "Failed to create conversation." };
  }

  return { conversationId };
}

/**
 * Get all conversations for the current user with last message + other user info.
 * Uses batch queries to avoid N+1 performance issues.
 */
export async function getConversations(): Promise<Conversation[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const currentUserId = userData.user.id;

  // 1. Get all conversation memberships for the current user
  const { data: memberships, error: mError } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", currentUserId);

  if (mError || !memberships || memberships.length === 0) {
    return [];
  }

  const conversationIds = memberships.map((m) => m.conversation_id);

  // 2. Get ALL conversation members for these conversations in a single query
  const { data: allMembers, error: membersError } = await supabase
    .from("conversation_members")
    .select("conversation_id, user_id")
    .in("conversation_id", conversationIds);

  if (membersError || !allMembers) {
    console.error("[getConversations] members query error:", membersError);
    return [];
  }

  // 3. Find the OTHER user in each conversation
  const otherUserIds = new Set<string>();
  const convIdToOtherUserId = new Map<string, string>();

  for (const member of allMembers) {
    if (member.user_id !== currentUserId) {
      otherUserIds.add(member.user_id);
      convIdToOtherUserId.set(member.conversation_id, member.user_id);
    }
  }

  // 4. Batch-fetch all OTHER user profiles in a single query
  const profileMap = await batchGetSocialProfiles([...otherUserIds]);

  // 5. Batch-fetch all conversation metadata
  const { data: convs } = await supabase
    .from("conversations")
    .select("id, created_at, updated_at")
    .in("id", conversationIds);

  const convMap = new Map<string, { id: string; created_at: string; updated_at: string }>();
  for (const c of convs ?? []) {
    convMap.set(c.id, c);
  }

  // 6. Batch-fetch recent messages and pick the latest per conversation
  const { data: recentMessages } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, message_type, media_url, is_read, created_at, updated_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false })
    .limit(200);

  const lastMsgMap = new Map<string, ChatMessage>();
  for (const msg of recentMessages ?? []) {
    const existing = lastMsgMap.get(msg.conversation_id);
    if (!existing || new Date(msg.created_at) > new Date(existing.created_at)) {
      lastMsgMap.set(msg.conversation_id, msg as ChatMessage);
    }
  }

  // 7. Batch-fetch unread counts per conversation
  const { data: unreadRows } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", conversationIds)
    .neq("sender_id", currentUserId)
    .eq("is_read", false);

  const unreadMap = new Map<string, number>();
  for (const row of unreadRows ?? []) {
    unreadMap.set(row.conversation_id, (unreadMap.get(row.conversation_id) ?? 0) + 1);
  }

  // 8. Assemble conversation list
  const conversations: Conversation[] = [];

  for (const convId of conversationIds) {
    const conv = convMap.get(convId);
    if (!conv) continue;

    const otherUserId = convIdToOtherUserId.get(convId);
    const otherUser = otherUserId ? (profileMap.get(otherUserId) ?? null) : null;

    conversations.push({
      id: conv.id,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      other_user: otherUser,
      last_message: lastMsgMap.get(convId) ?? null,
      unread_count: unreadMap.get(convId) ?? 0,
    });
  }

  // Sort by latest message time (or conversation updated_at)
  conversations.sort((a, b) => {
    const aTs = a.last_message?.created_at ?? a.updated_at ?? a.created_at;
    const bTs = b.last_message?.created_at ?? b.updated_at ?? b.created_at;
    return new Date(bTs).getTime() - new Date(aTs).getTime();
  });

  return conversations;
}

/**
 * Get messages for a conversation (paginated, oldest first).
 */
export async function getMessages(
  conversationId: string,
  limit: number = 50,
  beforeTime?: string,
): Promise<ChatMessage[]> {
  let query = supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, message_type, media_url, is_read, created_at, updated_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (beforeTime) {
    query = query.lt("created_at", beforeTime);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getMessages] Error:", error);
    return [];
  }

  return (data as ChatMessage[]) ?? [];
}

/**
 * Send a text message in a conversation.
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  messageType: "text" | "image" | "video" = "text",
  mediaUrl: string | null = null,
): Promise<{ error?: string; message?: ChatMessage }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not authenticated." };

  if (!content.trim() && !mediaUrl) return { error: "Message cannot be empty." };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userData.user.id,
      content: content.trim(),
      message_type: messageType,
      media_url: mediaUrl,
    })
    .select("id, conversation_id, sender_id, content, message_type, media_url, is_read, created_at, updated_at")
    .single();

  if (error) {
    console.error("[sendMessage] Error:", error);
    return { error: error.message };
  }

  return { message: data as ChatMessage };
}

/**
 * Mark all messages in a conversation as read (for the current user).
 */
export async function markConversationRead(conversationId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userData.user.id)
    .eq("is_read", false);

  if (error) {
    console.error("[markConversationRead] Error:", error);
  }
}

/**
 * Get total unread message count for the current user.
 */
export async function getTotalUnreadCount(): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return 0;

  // Get conversation IDs for the current user
  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userData.user.id);

  if (!memberships || memberships.length === 0) return 0;

  const convIds = memberships.map((m) => m.conversation_id);

  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", convIds)
    .neq("sender_id", userData.user.id)
    .eq("is_read", false);

  return count ?? 0;
}

// ── Realtime subscriptions ─────────────────────────────────

/**
 * Subscribe to new messages in a conversation.
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new as ChatMessage);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        // is_read status changed — treat as an updated message
        onMessage(payload.new as ChatMessage);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to new/updated conversations for the current user.
 * Returns an unsubscribe function.
 */
export function subscribeToConversations(
  onChange: () => void,
): () => void {
  // supabase.auth.getUser() is async, but we need a sync return for the unsubscribe.
  // We subscribe unconditionally — the RLS policies on the server side ensure only
  // the current user's data is returned. The subscription is lightweight.
  // The user check is done by the caller (SocialContext only subscribes when authenticated).

  // Subscribe to messages table changes (which triggers conversation updates)
  const channel = supabase
    .channel("conversations:update")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to follow changes for the current user.
 * Returns an unsubscribe function.
 */
export function subscribeToFollows(
  onChange: () => void,
): () => void {
  // Same as subscribeToConversations — subscribe unconditionally.
  // RLS policies on the server side ensure security.
  // The caller (SocialContext) only subscribes when authenticated.

  const channel = supabase
    .channel("follows:update")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "follows",
      },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "follows",
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ── Formatting helpers ─────────────────────────────────────

/**
 * Helper: find the other user in a conversation by fetching conversation members.
 * Used as a fallback when the conversation isn't in the loaded list.
 */
export async function getSocialProfileForConversation(convId: string, currentUserId: string): Promise<SocialProfile | null> {
  // Fetch conversation members to find the OTHER participant
  const { data: members, error } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", convId)
    .neq("user_id", currentUserId);

  if (error || !members || members.length === 0) {
    console.error("[getSocialProfileForConversation] Error or no other member:", error);
    return null;
  }

  const otherUserId = members[0].user_id;
  return getSocialProfile(otherUserId);
}

/** Format message time for chat list (e.g. "3:45 PM", "Yesterday", "Jul 28"). */
export function formatMessageTime(timestamp: string): string {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** Format full message time for chat bubbles (e.g. "3:45 PM"). */
export function formatChatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Format date divider (Today, Yesterday, or date). */
export function formatDateDivider(timestamp: string): string {
  const d = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

/** Get initials from a name for avatar fallback. */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "OX";
  const parts = name.trim().split(/\s+/);
  return parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

// Re-export Profile for convenience
export type { Profile };
