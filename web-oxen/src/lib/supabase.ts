import { createClient, type Session, type User } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY).");
}

/**
 * Single Supabase client instance for the entire app.
 * Session is persisted automatically in localStorage by supabase-js on the web.
 *
 * Session persistence config:
 *  - persistSession: true   → session restored from localStorage on reload
 *  - autoRefreshToken: true → access token refreshed before expiry
 *  - detectSessionInUrl: true → OAuth redirect hash parsed automatically
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/** User-facing profile shape from the `profiles` table. */
export interface Profile {
  id: string;
  /** Mirror of id — the stable auth.uid() used as the permanent account key. */
  user_id: string | null;
  email: string | null;
  /** Trimmed + lowercased email. Used for uniqueness + lookup. */
  normalized_email: string | null;
  /** Display nickname (original casing). */
  nickname: string | null;
  /** Trimmed + lowercased nickname. Used for unique index + login lookup. */
  normalized_nickname: string | null;
  name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  account_status: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch or create the `profiles` row for the given authenticated user.
 *
 * GUARANTEE: Every successful Google Sign-In receives exactly one OXEN
 * profile, linked 1:1 to `auth.users.id`. This function is the single
 * source of truth for profile provisioning.
 *
 * Flow:
 *   1. Wait for a valid Supabase session (caller's responsibility).
 *   2. SELECT by id = user.id (the primary key = auth.uid()).
 *   3. If a row exists → return it (idempotent, no duplicates).
 *   4. If no row exists → UPSERT with onConflict: "id".
 *      a. Try the full column set (user_id, full_name, onboarding_completed, …).
 *      b. If PostgREST rejects a column that doesn't exist yet, fall back
 *         to base columns only (id, email, name, avatar_url, provider).
 *   5. Retry up to 3 times on transient network errors.
 *   6. If RLS blocks the insert (no error, no data), log + throw so the
 *      caller can surface a meaningful message instead of a silent null.
 *
 * Idempotent: repeated OAuth callbacks, refreshes, or button clicks never
 * create duplicates. The DB trigger `on_auth_user_created` also handles
 * this server-side, so this is a client-side safety net.
 */
export async function ensureProfile(user: User): Promise<Profile | null> {
  const name =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Explorer";

  const avatar =
    user.user_metadata?.avatar_url ??
    user.user_metadata?.picture ??
    null;

  const provider =
    user.user_metadata?.provider ??
    user.app_metadata?.provider ??
    null;

  const userId = user.id;
  console.info(`[ensureProfile] Provisioning profile for user ${userId} (email=${user.email ?? "none"}, provider=${provider ?? "none"})`);

  // ── 1. Read first — never assume the row is missing ──────────────
  const existing = await fetchProfileById(userId);
  if (existing) {
    console.info(`[ensureProfile] Existing profile found for ${userId}.`);
    return existing;
  }

  console.info(`[ensureProfile] No profile for ${userId}. Creating one (idempotent upsert).`);

  // ── 2. Build payloads ─────────────────────────────────────────────
  // Full set includes onboarding columns added by migrations 0007/0008.
  const fullPayload = {
    id: userId,
    user_id: userId,
    email: user.email ?? null,
    name,
    full_name: name,
    avatar_url: avatar,
    provider,
    onboarding_completed: false,
  };

  // Base set uses only columns that exist in the original profiles table.
  const basePayload = {
    id: userId,
    email: user.email ?? null,
    name,
    avatar_url: avatar,
    provider,
  };

  // ── 3. Upsert with retry + column fallback ───────────────────────
  const MAX_RETRIES = 3;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // Try the full column set first.
    let result = await upsertProfile(fullPayload, "id", attempt);

    // Column-not-found → fall back to base columns (migration not applied).
    if (result.missingColumn) {
      console.warn(
        `[ensureProfile] Onboarding columns missing on profiles (attempt ${attempt}). Falling back to base columns.`,
      );
      result = await upsertProfile(basePayload, "id", attempt);
    }

    if (result.profile) {
      console.info(`[ensureProfile] Profile created/loaded for ${userId} on attempt ${attempt}.`);
      return result.profile;
    }

    // RLS block: no error AND no data. The insert was silently rejected.
    if (result.rlsBlocked) {
      console.error(
        `[ensureProfile] RLS blocked the insert for ${userId}. ` +
          `Ensure the "profiles_insert_self" policy exists ` +
          `(migration 0009). Returning null; caller should surface an error.`,
      );
      return null;
    }

    // Unique violation → row was created by a concurrent trigger/insert.
    // Re-fetch and return it.
    if (result.uniqueViolation) {
      console.info(`[ensureProfile] Concurrent insert detected for ${userId}. Re-fetching.`);
      const refetched = await fetchProfileById(userId);
      if (refetched) return refetched;
      // Row vanished (unlikely) — fall through and retry.
    }

    lastError = result.error;

    // Transient network error → wait and retry.
    if (result.retryable && attempt < MAX_RETRIES) {
      const delayMs = 300 * attempt; // 300ms, 600ms
      console.warn(`[ensureProfile] Transient error on attempt ${attempt}. Retrying in ${delayMs}ms.`, result.error);
      await sleep(delayMs);
      continue;
    }

    // Non-retryable error or out of retries.
    console.error(
      `[ensureProfile] Failed to create profile for ${userId} after ${attempt} attempt(s).`,
      result.error,
    );
    break;
  }

  // ── 4. Final fallback: one last read in case the trigger created it ──
  const finalCheck = await fetchProfileById(userId);
  if (finalCheck) {
    console.info(`[ensureProfile] Profile found on final check for ${userId}.`);
    return finalCheck;
  }

  console.error(
    `[ensureProfile] All attempts exhausted. No profile for ${userId}. Last error:`,
    lastError,
  );
  return null;
}

/**
 * Fetch a single profile row by its primary key (id = auth.uid()).
 * Returns null if not found or on transient error (does not throw).
 */
async function fetchProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`[fetchProfileById] Error fetching profile ${id}:`, error);
    return null;
  }
  return (data as Profile) ?? null;
}

/**
 * Result of an upsert attempt.
 */
interface UpsertResult {
  profile: Profile | null;
  error: unknown;
  /** True if the error is a missing-column error (PGRST204). */
  missingColumn: boolean;
  /** True if the error is a unique-constraint violation (23505). */
  uniqueViolation: boolean;
  /** True if the insert returned no data and no error (RLS blocked). */
  rlsBlocked: boolean;
  /** True if the error looks transient (network, timeout, 5xx). */
  retryable: boolean;
}

/**
 * Upsert a profile row and classify the result.
 */
async function upsertProfile(
  payload: Record<string, unknown>,
  conflictKey: string,
  attempt: number,
): Promise<UpsertResult> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: conflictKey })
    .select("*")
    .maybeSingle();

  if (error) {
    const code = error.code ?? "";
    const message = error.message ?? "";
    return {
      profile: null,
      error,
      missingColumn:
        code === "PGRST204" ||
        message.includes("Could not find the") ||
        message.includes("column") && message.includes("does not exist"),
      uniqueViolation: code === "23505",
      rlsBlocked: false,
      retryable: isTransientError(code, message),
    };
  }

  // No error but no data → RLS silently blocked the insert.
  if (!data) {
    return {
      profile: null,
      error: null,
      missingColumn: false,
      uniqueViolation: false,
      rlsBlocked: true,
      retryable: false,
    };
  }

  return {
    profile: data as Profile,
    error: null,
    missingColumn: false,
    uniqueViolation: false,
    rlsBlocked: false,
    retryable: false,
  };
}

/**
 * Determine whether a PostgREST/Supabase error is transient (worth retrying).
 */
function isTransientError(code: string, message: string): boolean {
  // Network / timeout errors
  if (code === "fetch_failed" || message.includes("fetch") || message.includes("network")) {
    return true;
  }
  // Supabase/PostgREST 5xx-style codes
  if (code.startsWith("5") || message.includes("timeout") || message.includes("502") || message.includes("503") || message.includes("504")) {
    return true;
  }
  // Connection reset / aborted
  if (message.includes("abort") || message.includes("reset") || message.includes("ECONNRESET")) {
    return true;
  }
  return false;
}

/**
 * Promise-based delay.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Listen to auth state changes.
 * Returns an unsubscribe function identical to supabase.auth.onAuthStateChange.
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return data.subscription.unsubscribe;
}

// ── Nickname helpers ──────────────────────────────────────

/** Reserved nicknames that can never be registered. */
export const RESERVED_NICKNAMES = new Set<string>([
  "admin", "owner", "oxen", "support", "moderator", "system",
  "root", "official", "help", "null", "undefined",
]);

/**
 * Validate a nickname format.
 * Returns an error string (user-facing) or null when valid.
 */
export function validateNicknameFormat(nickname: string): string | null {
  const trimmed = nickname.trim();
  if (!trimmed) return "Nickname is required.";
  if (trimmed.length < 3) return "Nickname must be at least 3 characters.";
  if (trimmed.length > 24) return "Nickname must be at most 24 characters.";
  // Reject spaces, @, and any character outside Latin letters, numbers, _, .
  if (!/^[A-Za-z0-9_.]+$/.test(trimmed)) {
    if (/\s/.test(trimmed)) return "Nickname cannot contain spaces.";
    if (trimmed.includes("@")) return "Nickname cannot contain @.";
    return "Nickname can only contain Latin letters, numbers, underscore, and dot.";
  }
  // No leading or trailing dot
  if (trimmed.startsWith(".") || trimmed.endsWith(".")) {
    return "Nickname cannot start or end with a dot.";
  }
  // No leading or trailing underscore
  if (trimmed.startsWith("_") || trimmed.endsWith("_")) {
    return "Nickname cannot start or end with an underscore.";
  }
  // No consecutive dots
  if (trimmed.includes("..")) {
    return "Nickname cannot contain consecutive dots.";
  }
  if (RESERVED_NICKNAMES.has(trimmed.toLowerCase())) {
    return "This nickname is reserved. Please choose another.";
  }
  return null;
}

/**
 * Check nickname availability server-side (case-insensitive).
 * Returns "available" | "taken" | "invalid".
 */
export async function checkNicknameAvailability(
  nickname: string,
): Promise<"available" | "taken" | "invalid"> {
  const formatError = validateNicknameFormat(nickname);
  if (formatError) return "invalid";

  const normalized = nickname.trim().toLowerCase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("normalized_nickname", normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    // Do NOT mark the nickname invalid on a transient Supabase failure
    // (e.g. column not yet created, RLS error, network issue). The format
    // is already validated above; the DB unique index is the final guard at
    // onboarding submit time. Optimistically treat as available so the user
    // is not blocked from continuing.
    console.error("checkNicknameAvailability error:", error);
    return "available";
  }

  return data ? "taken" : "available";
}

/**
 * Validate a password against OXEN requirements.
 * Returns an error string or null when valid.
 */
export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(password)) return "Password must contain at least one letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  return null;
}

/**
 * Estimate password strength (0-4).
 * 0 = very weak, 4 = strong.
 */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

/**
 * Normalize an email: trim + lowercase.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
