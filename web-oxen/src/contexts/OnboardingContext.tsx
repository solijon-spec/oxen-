import { useCallback, useEffect, useState } from "react";
import createContextHook from "@nkzw/create-context-hook";
import { useAuth } from "@/contexts/AuthContext";
import { getTutorialStatus, markTutorialCompleted } from "@/lib/tutorial";

/**
 * Onboarding / tutorial context.
 *
 * Manages the first-time OXEN tutorial overlay:
 *   - On auth ready, checks `profiles.tutorial_completed`.
 *   - If false (new user who finished /complete-profile), shows the tutorial.
 *   - If true (existing user or already seen), does nothing.
 *   - `replayTutorial()` lets the user re-watch from Settings (does NOT
 *     reset any account data — purely visual).
 */

function useOnboardingState() {
  const { user, ready } = useAuth();
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);

  // Check tutorial status when user becomes available
  useEffect(() => {
    if (!ready) return;
    if (!user || user.isGuest) {
      setShowTutorial(false);
      setChecked(true);
      return;
    }

    // Only show tutorial if the user has completed profile setup
    // (onboardingCompleted = true) but hasn't seen the tutorial yet.
    if (!user.onboardingCompleted) {
      setShowTutorial(false);
      setChecked(true);
      return;
    }

    let active = true;
    void (async () => {
      const completed = await getTutorialStatus();
      if (!active) return;
      setShowTutorial(!completed);
      setChecked(true);
    })();

    return () => { active = false; };
  }, [user?.id, user?.isGuest, user?.onboardingCompleted, ready]);

  /** Called when the user finishes or skips the tutorial. */
  const completeTutorial = useCallback(async () => {
    setShowTutorial(false);
    await markTutorialCompleted();
  }, []);

  /** Reopen the tutorial from Settings (visual only, no data reset). */
  const replayTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  return {
    showTutorial,
    checked,
    completeTutorial,
    replayTutorial,
  };
}

const [OnboardingProvider, useOnboardingContext] = createContextHook(useOnboardingState);

/**
 * Safe wrapper: throws a clear development error if used outside
 * <OnboardingProvider> instead of crashing with an undefined destructuring error.
 */
function useOnboarding() {
  const ctx = useOnboardingContext();
  if (!ctx) {
    throw new Error(
      "useOnboarding() must be used inside <OnboardingProvider>. " +
        "Wrap the component tree (including OnboardingTutorial and Settings) with OnboardingProvider."
    );
  }
  return ctx;
}

export { OnboardingProvider, useOnboarding };
