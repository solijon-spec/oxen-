import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { checkOwnerAccess } from "@/lib/owner-admin";
import { isOwnerEmail } from "@/components/SettingsPanel";
import { useAuth } from "@/contexts/AuthContext";

/**
 * RequireOwnerAdmin — route guard for the private Owner Admin Panel.
 *
 * - Requires an authenticated (non-guest) Supabase session.
 * - Checks `owner_admins` server-side via `checkOwnerAccess()` (RLS
 *   only returns a row if the caller's email matches a seeded owner).
 * - If not an owner → redirect to `/` (home). Never exposes the
 *   owner email allowlist in the UI.
 * - If auth isn't ready yet, show a minimal loader.
 */
export default function RequireOwnerAdmin({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();

  // TEMPORARY local-dev bypass: no Supabase project is connected yet, so
  // owner_admins can never be checked. Dead-code-eliminated in production
  // builds (import.meta.env.DEV is false there). Remove once real Supabase
  // auth is wired up.
  if (import.meta.env.DEV) {
    return <>{children}</>;
  }

  const { data: ownerData, isLoading } = useQuery({
    queryKey: ["owner-access", user?.id],
    queryFn: () => checkOwnerAccess(),
    enabled: ready && !!user && !user.isGuest,
    staleTime: 60_000,
    retry: false,
  });

  // Auth not ready or guest → send to auth/home
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="oxen-skeleton-globe" aria-label="Loading" />
      </div>
    );
  }

  if (!user || user.isGuest) {
    return <Navigate to="/auth" replace />;
  }

  // Still checking ownership
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="oxen-skeleton-globe" aria-label="Verifying access" />
      </div>
    );
  }

  // Not an owner → redirect to home (never reveal the allowlist)
  if (!ownerData?.is_owner && !isOwnerEmail(user?.email)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
