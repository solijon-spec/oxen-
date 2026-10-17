import { supabase } from "@/lib/supabase";
import type { ConsultingCompany } from "@/lib/consulting";

/* ============================================================
   Owner Agency CRM Access — Data Access Layer
   ------------------------------------------------
   Allows OXEN platform owners to manage any agency's CRM
   without needing the agency owner's credentials.
   
   The owner selects an agency → we store the agency_id in
   localStorage as the "owner management context" →
   ConsultingContext uses this to load the selected agency's
   data instead of (or in addition to) the owner's own agencies.
   
   All owner actions inside the agency CRM are logged to
   owner_agency_audit_logs for accountability.
   ============================================================ */

// ── Types ──────────────────────────────────────────────────

export interface OwnerAgencyAuditLog {
  id: string;
  owner_user_id: string;
  owner_email: string | null;
  agency_id: string;
  agency_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Audit logging ──────────────────────────────────────────

/**
 * Record an owner action performed inside an agency CRM.
 * Requires is_owner() RLS — only platform owners can write.
 */
export async function logOwnerAgencyAction(
  ownerUserId: string,
  ownerEmail: string,
  agencyId: string,
  agencyName: string | null,
  action: string,
  entityType?: string | null,
  entityId?: string | null,
  metadata?: Record<string, unknown> | null,
): Promise<boolean> {
  const { error } = await supabase.from("owner_agency_audit_logs").insert({
    owner_user_id: ownerUserId,
    owner_email: ownerEmail,
    agency_id: agencyId,
    agency_name: agencyName,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    metadata: metadata ?? {},
  });
  if (error) {
    console.error("logOwnerAgencyAction error:", error);
    return false;
  }
  return true;
}

/**
 * Fetch owner agency audit logs. Only platform owners can read.
 */
export async function fetchOwnerAgencyAuditLogs(
  limit = 100,
  agencyId?: string,
): Promise<OwnerAgencyAuditLog[]> {
  let query = supabase
    .from("owner_agency_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchOwnerAgencyAuditLogs error:", error);
    return [];
  }
  return (data ?? []) as unknown as OwnerAgencyAuditLog[];
}

// ── Agency fetching for owner ──────────────────────────────

/**
 * Fetch a consulting company by ID for owner management.
 * Uses the owner RLS policy (is_owner()) to read any company.
 */
export async function fetchAgencyForOwner(
  agencyId: string,
): Promise<ConsultingCompany | null> {
  const { data, error } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("id", agencyId)
    .maybeSingle();
  if (error) {
    console.error("fetchAgencyForOwner error:", error);
    return null;
  }
  return data as unknown as ConsultingCompany | null;
}

/**
 * Count packages (consulting_posts) for an agency.
 */
export async function fetchAgencyPackageCount(agencyId: string): Promise<number> {
  const { count, error } = await supabase
    .from("consulting_posts")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", agencyId);
  if (error) {
    console.error("fetchAgencyPackageCount error:", error);
    return 0;
  }
  return count ?? 0;
}
