import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";

/**
 * Wraps a protected route. If the user is a guest (not signed in),
 * redirects to /auth with the original location stored in `redirect`
 * so the Auth page can send them back after successful sign-in.
 *
 * If the user is signed in but hasn't completed onboarding
 * (first Google login → nickname + password setup), redirect to
 * /complete-profile before they can enter the main application.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  // TEMPORARY local-dev bypass: no Supabase project is connected yet, so a
  // real session can never exist. import.meta.env.DEV is false (and this
  // branch is dead-code-eliminated) in any `vite build` / production bundle.
  // Remove this block once real Supabase auth is wired up.
  if (import.meta.env.DEV) {
    return <>{children}</>;
  }

  // Wait for session restore before deciding
  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" aria-live="polite">
        <div className="oxen-skeleton-globe" aria-label="Loading" />
      </div>
    );
  }

  // Guest user → redirect to /auth with return target
  if (!user || user.isGuest) {
    const redirect = location.pathname + location.search;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  // Signed in but onboarding incomplete → complete-profile
  // (allow /complete-profile itself so we don't loop)
  if (!user.onboardingCompleted && location.pathname !== "/complete-profile") {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
}
