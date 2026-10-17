import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, ensureProfile, onAuthStateChange, type Profile } from "@/lib/supabase";
import { ensureUsername } from "@/lib/social";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  /** "email" | "google" | "apple" — derived from the auth provider */
  provider: "email" | "google" | "apple";
  /** True when the user is a guest (not signed in). */
  isGuest: boolean;
  /** Display nickname (original casing) or null if not yet set. */
  nickname: string | null;
  /** True when the user has completed the /complete-profile onboarding. */
  onboardingCompleted: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  /** True while any auth operation (sign-in/sign-up/OAuth redirect) is in flight. */
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  /**
   * Nickname + password login. Calls the `nickname-login` Supabase Edge
   * Function which maps the nickname to the account email server-side and
   * authenticates via Supabase Auth. Never receives the email before login.
   */
  signInWithNickname: (nickname: string, password: string) => Promise<{ error?: string }>;
  /**
   * Kick off OAuth with the given provider.
   *
   * Uses `skipBrowserRedirect: true` so we can control the redirect ourselves
   * — this lets us escape the Rork preview iframe (Google returns 403 inside
   * an iframe) by navigating the top-level window to the OAuth URL, with a
   * `window.open` fallback for sandboxed iframes.
   *
   * Returns `{ url }` so the caller can render a manual "Open in New Tab"
   * fallback button if the automatic redirect is blocked.
   */
  signInWithProvider: (
    provider: "google" | "apple",
    options?: { redirectToPath?: string },
  ) => Promise<{ url?: string; error?: string }>;
  /** Send a Supabase password reset email to the given email address. */
  resetPassword: (email: string) => Promise<{ error?: string }>;
  /** Update the current authenticated user's password (Supabase-managed). */
  updateUserPassword: (password: string) => Promise<{ error?: string }>;
  /** Complete onboarding: save nickname + set password + mark profile. */
  completeOnboarding: (nickname: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Guest identity used when no Supabase session exists. */
const GUEST_USER: AuthUser = {
  id: "guest-explorer",
  email: "explorer@oxen.travel",
  name: "Guest Explorer",
  avatarUrl: null,
  provider: "email",
  isGuest: true,
  nickname: null,
  onboardingCompleted: false,
};

function authUserFromSupabase(session: Session, profile: Profile | null): AuthUser {
  const providerRaw = session.user.app_metadata?.provider as string | undefined;
  let provider: AuthUser["provider"] = "email";
  if (providerRaw === "google") provider = "google";
  else if (providerRaw === "apple") provider = "apple";

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: profile?.name ?? session.user.user_metadata?.full_name ?? session.user.email?.split("@")[0] ?? "Explorer",
    avatarUrl: profile?.avatar_url ?? session.user.user_metadata?.avatar_url ?? null,
    provider,
    isGuest: false,
    nickname: profile?.nickname ?? null,
    onboardingCompleted: profile?.onboarding_completed ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Restore session on mount + listen for auth changes (OAuth redirect, signOut, etc.)
  // Session persistence is handled by supabase-js (persistSession: true).
  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("[Auth] getSession error on mount:", error);
        }
        if (!active) return;
        const s = data.session;
        console.info(
          `[Auth] Initial session: ${s ? `user=${s.user.id} email=${s.user.email ?? "none"}` : "none"}`,
        );
        setSession(s);
        if (s?.user) {
          const p = await ensureProfile(s.user as User);
          if (!p) {
            console.error(
              `[Auth] Profile provisioning failed for user ${s.user.id} during session restore. ` +
                `The user has a valid Supabase session but no OXEN profile. Check RLS policies (profiles_insert_self) and migration 0009.`,
            );
          } else {
            // Ensure the profile has a unique username (social feature).
            // This runs after profile creation and is idempotent.
            await ensureUsername(
              s.user.id,
              s.user.user_metadata?.full_name ?? s.user.user_metadata?.name ?? null,
              s.user.email ?? null,
            ).catch((err) =>
              console.error("[Auth] ensureUsername failed during session restore:", err),
            );
          }
          if (active) setProfile(p);
        }
        setReady(true);
      } catch (err) {
        console.error("[Auth] Unexpected error during session restore:", err);
        if (active) setReady(true);
      }
    })();

    const unsub = onAuthStateChange(async (event, newSession) => {
      console.info(
        `[Auth] State change: event=${event} ${newSession ? `user=${newSession.user.id}` : "session=null"}`,
      );
      setSession(newSession);
      if (newSession?.user) {
        const p = await ensureProfile(newSession.user as User);
        if (!p) {
          console.error(
            `[Auth] Profile provisioning failed for user ${newSession.user.id} during auth state change (${event}). ` +
              `Check RLS policies (profiles_insert_self) and migration 0009.`,
          );
        } else {
          // Ensure the profile has a unique username (social feature).
          await ensureUsername(
            newSession.user.id,
            newSession.user.user_metadata?.full_name ?? newSession.user.user_metadata?.name ?? null,
            newSession.user.email ?? null,
          ).catch((err) =>
            console.error("[Auth] ensureUsername failed during auth state change:", err),
          );
        }
        setProfile(p);
      } else {
        setProfile(null);
      }
      setReady(true);
    });

    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  // When no session, show guest user so the app works without sign-in.
  // When session exists, show the real Supabase user.
  const user = useMemo<AuthUser>(() => {
    if (!session) return GUEST_USER;
    return authUserFromSupabase(session, profile);
  }, [session, profile]);

  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<{ error?: string }> => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        });

        if (error) return { error: error.message };

        if (data.session) {
          setSession(data.session);
          const p = await ensureProfile(data.session.user as User);
          setProfile(p);
        }

        return {};
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Registration failed" };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) return { error: error.message };

        setSession(data.session);
        const p = await ensureProfile(data.session.user as User);
        setProfile(p);

        return {};
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Sign in failed" };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signInWithNickname = useCallback(
    async (nickname: string, password: string): Promise<{ error?: string }> => {
      setLoading(true);
      try {
        const supabaseUrl = import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string;
        const anonKey = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;
        if (!supabaseUrl || !anonKey) {
          return { error: "Authentication service is not configured." };
        }

        const res = await fetch(`${supabaseUrl}/functions/v1/nickname-login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ nickname: nickname.trim(), password }),
        });

        const body = await res.json() as { error?: string; access_token?: string; refresh_token?: string; expires_in?: number; user_id?: string };

        if (!res.ok || !body.access_token || !body.refresh_token) {
          return { error: body.error ?? "Nickname or password is incorrect." };
        }

        // Set the session from the returned tokens. supabase-js will
        // persist it (persistSession: true) and refresh it automatically.
        const { data, error } = await supabase.auth.setSession({
          access_token: body.access_token,
          refresh_token: body.refresh_token,
        });

        if (error) return { error: error.message };

        setSession(data.session);
        const p = await ensureProfile(data.session.user as User);
        setProfile(p);

        return {};
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Sign in failed" };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signInWithProvider = useCallback(
    async (
      provider: "google" | "apple",
      options?: { redirectToPath?: string },
    ): Promise<{ url?: string; error?: string }> => {
      setLoading(true);
      try {
        // Build the real app callback URL from the current origin so OAuth
        // redirects land on the actual deployed app (preview or production),
        // not an embedded iframe URL. Preserve the post-login path so the
        // Auth page can route the user back to where they started.
        const origin =
          typeof window !== "undefined"
            ? window.location.origin
            : "https://azimboyevshuxrux-mvp1.rork.app";
        const redirectPath = options?.redirectToPath ?? "";
        const redirectTo = `${origin}/auth${
          redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""
        }`;

        // `skipBrowserRedirect` lets us control the navigation ourselves so we
        // can break out of the Rork preview iframe (Google 403s inside frames).
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            skipBrowserRedirect: true,
            redirectTo,
            queryParams:
              provider === "google"
                ? { access_type: "offline", prompt: "select_account" }
                : undefined,
          },
        });

        if (error) {
          return { error: error.message };
        }

        const url = data.url;
        if (!url) {
          return { error: "OAuth URL was not returned by Supabase." };
        }

        // Escape the iframe: navigate the top-level window to Google.
        // Google blocks being rendered inside an iframe (X-Frame-Options:
        // DENY), so we must redirect the top-level frame. If that is blocked
        // (cross-origin / sandbox), fall back to opening a new tab.
        try {
          const inIframe =
            typeof window !== "undefined" && window.self !== window.top;
          if (inIframe && window.top) {
            window.top.location.href = url;
          } else {
            window.location.assign(url);
          }
        } catch {
          try {
            window.open(url, "_blank", "noopener,noreferrer");
          } catch {
            /* caller can use the returned url for a manual fallback button */
          }
        }

        // Return the URL so the caller can render an "Open in New Tab"
        // fallback button if the automatic redirect is blocked.
        return { url };
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : "OAuth sign-in failed",
        };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const resetPassword = useCallback(
    async (email: string): Promise<{ error?: string }> => {
      setLoading(true);
      try {
        const origin =
          typeof window !== "undefined"
            ? window.location.origin
            : "https://azimboyevshuxrux-mvp1.rork.app";
        const redirectTo = `${origin}/reset-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo },
        );

        if (error) return { error: error.message };
        return {};
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Password reset failed" };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateUserPassword = useCallback(
    async (password: string): Promise<{ error?: string }> => {
      setLoading(true);
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) return { error: error.message };
        return {};
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Password update failed" };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const completeOnboarding = useCallback(
    async (nickname: string, password: string): Promise<{ error?: string }> => {
      if (!session?.user) return { error: "No active session. Please sign in again." };
      // Guard: never send an empty password to updateUser.
      if (!password || password.length === 0) {
        return { error: "Password is required to complete setup." };
      }
      setLoading(true);
      try {
        const userId = session.user.id;
        const trimmedNickname = nickname.trim();
        const normalizedNickname = trimmedNickname.toLowerCase();
        const fullName =
          session.user.user_metadata?.full_name ??
          session.user.user_metadata?.name ??
          session.user.email?.split("@")[0] ??
          "Explorer";
        const avatarUrl =
          session.user.user_metadata?.avatar_url ??
          session.user.user_metadata?.picture ??
          null;
        const provider =
          session.user.user_metadata?.provider ??
          session.user.app_metadata?.provider ??
          null;

        // 1. Set the user's password via Supabase Auth.
        //    Called exactly ONCE per attempt with the password currently
        //    entered by the user — no cached or previous password state.
        //
        //    If the user previously attempted onboarding and the password
        //    was already set, Supabase returns the `same_password` error.
        //    This is NOT a real failure — the password IS correct, it's
        //    just not new. We treat it as already-completed and continue
        //    to the profile upsert so the user is not blocked from
        //    finishing OXEN setup on retry. Any OTHER security error is
        //    surfaced to the user.
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) {
          const isSamePassword =
            pwError.code === "same_password" ||
            (pwError.message ?? "").toLowerCase().includes("should be different");
          if (!isSamePassword) {
            // Real error (weak password, session expired, etc.) — show it.
            return { error: pwError.message };
          }
          // Password was already set in a previous attempt — continue.
        }

        // 2. Upsert the profile row on user_id (= auth.uid()).
        //    This handles BOTH cases idempotently:
        //      a) No profile row yet → creates it with all Google details.
        //      b) Profile row already exists → updates nickname + flag.
        //    onConflict: 'user_id' prevents duplicates on refresh, repeated
        //    OAuth callbacks, or multiple button clicks.
        //    normalized_nickname is set client-side as a fallback in case
        //    the DB trigger hasn't been applied yet.
        //
        //    RESILIENCE: If the onboarding columns (user_id, nickname,
        //    full_name, onboarding_completed, etc.) haven't been added to
        //    the profiles table yet (migration 0008 not applied), PostgREST
        //    rejects the payload with a "Could not find the 'X' column"
        //    error. We detect this and fall back to a base-column-only
        //    upsert (id, email, name, avatar_url, provider) so the profile
        //    row is at least created/updated, then return a clear message
        //    telling the user to run migration 0008.
        const fullPayload = {
          id: userId,
          user_id: userId,
          email: session.user.email ?? null,
          normalized_email: (session.user.email ?? "").trim().toLowerCase() || null,
          nickname: trimmedNickname,
          normalized_nickname: normalizedNickname,
          name: fullName,
          full_name: fullName,
          avatar_url: avatarUrl,
          provider,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        };

        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(fullPayload, { onConflict: "user_id" });

        if (profileError) {
          // Unique violation → nickname already taken
          if (profileError.code === "23505") {
            return { error: "This nickname is already taken. Please choose another." };
          }

          // Column-not-found → migration 0008 not applied yet.
          // Fall back to base columns only so the profile row is saved,
          // then surface a clear actionable message.
          const isMissingColumn =
            (profileError.code === "PGRST204" ||
             (profileError.message ?? "").includes("Could not find the") ||
             (profileError.message ?? "").includes("column") &&
             (profileError.message ?? "").includes("does not exist"));

          if (isMissingColumn) {
            // Base columns that exist in the original profiles table.
            const { error: baseError } = await supabase
              .from("profiles")
              .upsert(
                {
                  id: userId,
                  email: session.user.email ?? null,
                  name: fullName,
                  avatar_url: avatarUrl,
                  provider,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "id" },
              );

            if (baseError && baseError.code !== "23505") {
              return { error: baseError.message };
            }

            return {
              error:
                "OXEN onboarding columns are missing from the database. " +
                "Please run migration 0008 (backend/migrations/0008_profiles_onboarding_columns.sql) " +
                "in the Supabase SQL editor, then try again.",
            };
          }

          return { error: profileError.message };
        }

        // 3. Refresh local profile state so the UI updates immediately.
        const p = await ensureProfile(session.user as User);
        setProfile(p);

        return {};
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Onboarding failed" };
      } finally {
        setLoading(false);
      }
    },
    [session],
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Tell Supabase to revoke the session server-side.
      //    { scope: "global" } ensures ALL sessions (this device + others)
      //    are invalidated, not just the current one.
      await supabase.auth.signOut({ scope: "global" });

      // 2. Clear React state so the user becomes Guest Explorer immediately.
      setSession(null);
      setProfile(null);

      // 3. Purge any lingering auth / OAuth state from browser storage.
      //    supabase-js stores under keys like `sb-<ref>-auth-token`.
      //    We also remove common OAuth intermediate keys.
      if (typeof window !== "undefined") {
        try {
          // Remove all Supabase auth keys from localStorage
          const localStorageKeys = Object.keys(localStorage);
          for (const key of localStorageKeys) {
            if (key.startsWith("sb-") || key.includes("supabase") || key.includes("oauth") || key.includes("auth-token")) {
              localStorage.removeItem(key);
            }
          }

          // Remove from sessionStorage as well
          const sessionStorageKeys = Object.keys(sessionStorage);
          for (const key of sessionStorageKeys) {
            if (key.startsWith("sb-") || key.includes("supabase") || key.includes("oauth") || key.includes("auth-token")) {
              sessionStorage.removeItem(key);
            }
          }
        } catch {
          // Storage access may be restricted — ignore
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      loading,
      signUp,
      signIn,
      signInWithNickname,
      signInWithProvider,
      resetPassword,
      updateUserPassword,
      completeOnboarding,
      signOut,
    }),
    [
      user,
      ready,
      loading,
      signUp,
      signIn,
      signInWithNickname,
      signInWithProvider,
      resetPassword,
      updateUserPassword,
      completeOnboarding,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
