import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useConsulting } from "@/contexts/ConsultingContext";
import { useOwnerAgency } from "@/contexts/OwnerAgencyContext";
import { isOwnerEmail } from "@/components/SettingsPanel";

/**
 * RequireConsultingMember — wraps protected consulting routes.
 *
 * CRM access is granted ONLY when the user has an approved agency
 * application (checked via has_approved_agency_application RPC).
 * The old subscription/payment gate has been removed — approval
 * is the sole authorization mechanism for CRM access.
 *
 * Flow:
 *   - Guests → /auth (with redirect back)
 *   - allowOnboarding routes (workspace, apply, application-status) → always render
 *   - No approved application → /consulting/workspace (shows application gate)
 *   - Approved but zero agencies → /consulting/workspace (unless allowNoAgency)
 *   - Approved + has agencies → full CRM access
 *
 * The `allowExpired` prop is kept for backward compatibility but no longer
 * affects access (subscription gate removed).
 */
interface Props {
  children: React.ReactNode;
  /** Kept for backward compatibility — no longer affects access. */
  allowExpired?: boolean;
  /** When true, renders even without approval (workspace, apply, application-status routes). */
  allowOnboarding?: boolean;
  /** When true, renders for approved users even if they have zero agencies (create/join routes). */
  allowNoAgency?: boolean;
}

function Inner({ children, allowOnboarding = false, allowNoAgency = false }: Props) {
  const { user, ready: authReady } = useAuth();
  const { loading, isApproved, hasNoAgencies } = useConsulting();
  const { isOwnerMode } = useOwnerAgency();
  const navigate = useNavigate();
  const location = useLocation();

  // TEMPORARY local-dev bypass: no Supabase project is connected yet, so
  // application approval can never be checked. Dead-code-eliminated in
  // production builds (import.meta.env.DEV is false there). Remove once
  // real Supabase auth is wired up.
  const devBypass = import.meta.env.DEV;

  useEffect(() => {
    if (devBypass) return;
    if (!authReady) return;
    if (!user || user.isGuest) {
      navigate("/auth?redirect=" + encodeURIComponent(location.pathname), { replace: true });
      return;
    }
    if (loading) return;

    // Owner mode bypasses all CRM access checks — the owner is managing
    // an agency via the Owner Panel and has is_owner() RLS authorization.
    if (isOwnerMode) return;

    // Onboarding routes (workspace, apply, application-status) are always accessible
    if (allowOnboarding) return;

    // No approved application → redirect to workspace (shows application gate)
    if (!isApproved) {
      navigate("/consulting/workspace", { replace: true });
      return;
    }

    // Approved but zero agencies → redirect to workspace (shows Create/Join)
    // unless this is a create/join route (allowNoAgency)
    if (hasNoAgencies && !allowNoAgency) {
      navigate("/consulting/workspace", { replace: true });
      return;
    }
  }, [authReady, user, loading, isApproved, hasNoAgencies, allowOnboarding, allowNoAgency, isOwnerMode, navigate, location.pathname]);

  if (devBypass) {
    return <>{children}</>;
  }

  if (!authReady || loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.isGuest) {
    return null;
  }

  // Owner mode bypasses all checks
  if (isOwnerMode) {
    return <>{children}</>;
  }

  // Onboarding routes are accessible even without approval
  if (allowOnboarding) {
    return <>{children}</>;
  }

  // No approved application → blocked (redirect happens in useEffect)
  if (!isApproved) {
    return null;
  }

  // Approved but no agencies → blocked unless allowNoAgency
  if (hasNoAgencies && !allowNoAgency) {
    return null;
  }

  return <>{children}</>;
}

export default function RequireConsultingMember({ children, allowExpired, allowOnboarding, allowNoAgency }: Props) {
  return (
    <Inner allowExpired={allowExpired} allowOnboarding={allowOnboarding} allowNoAgency={allowNoAgency}>
      {children}
    </Inner>
  );
}
