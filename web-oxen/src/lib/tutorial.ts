import { supabase } from "./supabase";

/**
 * Tutorial / first-time onboarding data layer.
 *
 * Uses `profiles.tutorial_completed` (migration 0019) to track whether
 * the user has seen the cinematic OXEN tutorial. This is separate from
 * `onboarding_completed` (which tracks nickname/password setup via
 * /complete-profile).
 *
 * Existing users who had `onboarding_completed = true` before migration
 * 0019 are automatically marked `tutorial_completed = true` so they are
 * NOT forced through the tutorial.
 */

/**
 * Check whether the current authenticated user has completed the tutorial.
 * Returns `false` for guests or on any error (defaults to not showing).
 */
export async function getTutorialStatus(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return true; // guests don't need tutorial

  const { data, error } = await supabase
    .from("profiles")
    .select("tutorial_completed")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) {
    // If the column doesn't exist yet (migration not run), treat as completed
    // so existing users are not blocked.
    if (error.code === "PGRST204" || (error.message ?? "").includes("Could not find")) {
      return true;
    }
    console.error("[getTutorialStatus] Error:", error);
    return true;
  }

  return data?.tutorial_completed ?? true;
}

/**
 * Mark the current user's tutorial as completed.
 * Persists to `profiles.tutorial_completed = true`.
 */
export async function markTutorialCompleted(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const { error } = await supabase
    .from("profiles")
    .update({
      tutorial_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userData.user.id);

  if (error) {
    // Non-fatal — tutorial still closes in UI. Log for diagnostics.
    console.error("[markTutorialCompleted] Error:", error);
  }
}
