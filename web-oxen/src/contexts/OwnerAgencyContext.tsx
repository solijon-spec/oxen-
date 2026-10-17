import { useCallback, useEffect, useMemo, useState } from "react";
import createContextHook from "@nkzw/create-context-hook";

import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAgencyForOwner } from "@/lib/owner-agency";
import type { ConsultingCompany } from "@/lib/consulting";

/* ============================================================
   OwnerAgencyContext — Owner Agency CRM Management Context
   ------------------------------------------------
   When an OXEN platform owner clicks "Open Agency CRM" on
   any agency in the Owner Panel, this context stores the
   selected agency_id as the "owner management context."
   
   ConsultingContext then uses this agency instead of the
   owner's own agencies to load CRM data.
   
   The owner remains logged in as themselves (auth.user.id
   is never changed). RLS policies using is_owner() allow
   the owner to read/write any agency's data.
   
   An "OWNER MODE" banner is shown in DashboardShell when
   active, with an "Exit Agency" button to clear the context.
   ============================================================ */

const OWNER_AGENCY_KEY = "oxen.owner.ownerAgencyId";

function readOwnerAgencyId(): string | null {
  try {
    return localStorage.getItem(OWNER_AGENCY_KEY);
  } catch {
    return null;
  }
}

function writeOwnerAgencyId(agencyId: string | null): void {
  try {
    if (agencyId) {
      localStorage.setItem(OWNER_AGENCY_KEY, agencyId);
    } else {
      localStorage.removeItem(OWNER_AGENCY_KEY);
    }
  } catch {
    /* ignore */
  }
}

interface OwnerAgencyContextValue {
  /** The selected agency ID the owner is managing, or null. */
  ownerAgencyId: string | null;
  /** The selected agency company data, or null. */
  ownerAgency: ConsultingCompany | null;
  /** True when the owner is inside an agency CRM. */
  isOwnerMode: boolean;
  /** True while agency data is loading. */
  loading: boolean;
  /** Enter agency CRM mode for the given agency. */
  enterAgencyCRM: (agencyId: string) => void;
  /** Exit agency CRM mode — clears the context. */
  exitAgencyCRM: () => void;
}

function useOwnerAgencyState() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [ownerAgencyId, setOwnerAgencyId] = useState<string | null>(() =>
    readOwnerAgencyId(),
  );

  // Persist to localStorage
  useEffect(() => {
    writeOwnerAgencyId(ownerAgencyId);
  }, [ownerAgencyId]);

  // Fetch the selected agency's data (owner RLS allows reading any company)
  const { data: ownerAgency, isLoading } = useQuery({
    queryKey: ["owner-agency-context", ownerAgencyId],
    queryFn: () => fetchAgencyForOwner(ownerAgencyId!),
    enabled: !!ownerAgencyId,
    staleTime: 15_000,
    retry: false,
  });

  const enterAgencyCRM = useCallback(
    (agencyId: string) => {
      setOwnerAgencyId(agencyId);
      // Remove ALL agency-scoped queries so stale data from the previous
      // agency does not leak into the new owner context. React Query partial
      // key matching requires exact first-element match — ["consulting"] does
      // NOT match ["consulting-posts", ...]. Use a predicate to clear all
      // consulting- prefixed queries plus tour-post and agency-tour-posts.
      queryClient.removeQueries({
        predicate: (query) => {
          const first = query.queryKey[0];
          return typeof first === "string" && (
            first.startsWith("consulting-") ||
            first === "agency-tour-posts" ||
            first === "tour-post"
          );
        },
      });
      queryClient.invalidateQueries({ queryKey: ["owner-agency-context"] });
    },
    [queryClient],
  );

  const exitAgencyCRM = useCallback(() => {
    setOwnerAgencyId(null);
    // Clear all CRM queries so no stale data remains
    queryClient.removeQueries({
      predicate: (query) => {
        const first = query.queryKey[0];
        return typeof first === "string" && (
          first.startsWith("consulting-") ||
          first === "agency-tour-posts" ||
          first === "tour-post"
        );
      },
    });
    queryClient.invalidateQueries({ queryKey: ["owner-agency-context"] });
  }, [queryClient]);

  // Clear context if user logs out
  useEffect(() => {
    if (!user || user.isGuest) {
      setOwnerAgencyId(null);
    }
  }, [user]);

  const isOwnerMode = !!ownerAgencyId && !!ownerAgency;

  return useMemo<OwnerAgencyContextValue>(
    () => ({
      ownerAgencyId,
      ownerAgency: ownerAgency ?? null,
      isOwnerMode,
      loading: !!ownerAgencyId && isLoading,
      enterAgencyCRM,
      exitAgencyCRM,
    }),
    [ownerAgencyId, ownerAgency, isOwnerMode, isLoading, enterAgencyCRM, exitAgencyCRM],
  );
}

const [OwnerAgencyProvider, useOwnerAgency] = createContextHook(useOwnerAgencyState);

export { OwnerAgencyProvider, useOwnerAgency };
