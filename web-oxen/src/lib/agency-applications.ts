import { supabase } from "@/lib/supabase";

/* ============================================================
   Agency Applications — Tour Agency CRM Access Application

   Data access layer for the agency application system.
   Users submit an application → Owner reviews → approves/rejects.
   CRM access is granted ONLY when status = 'approved'.

   All data flows through Supabase with RLS enforcement.
   No hardcoded/fake applications.
   ============================================================ */

// ── Types ──────────────────────────────────────────────────

export type AgencyApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "more_info_required"
  | "approved"
  | "rejected";

export interface AgencyApplication {
  id: string;
  user_id: string;
  agency_name: string;
  legal_name: string | null;
  manager_name: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  social_links: Record<string, string> | null;
  license_number: string | null;
  license_issuing_org: string | null;
  license_issue_date: string | null;
  license_expiry_date: string | null;
  license_document_url: string | null;
  registration_document_url: string | null;
  additional_documents: Array<{ url: string; name: string; type?: string }> | null;
  agency_photos: Array<{ url: string; name: string }> | null;
  status: AgencyApplicationStatus;
  admin_note: string | null;
  rejection_reason: string | null;
  owner_request_message: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notification_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Form input for creating/updating an application. */
export interface AgencyApplicationInput {
  agency_name: string;
  legal_name?: string | null;
  manager_name?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  social_links?: Record<string, string> | null;
  license_number?: string | null;
  license_issuing_org?: string | null;
  license_issue_date?: string | null;
  license_expiry_date?: string | null;
  license_document_url?: string | null;
  registration_document_url?: string | null;
  additional_documents?: Array<{ url: string; name: string; type?: string }> | null;
  agency_photos?: Array<{ url: string; name: string }> | null;
}

// ── User-facing functions ──────────────────────────────────

/** Normalize a date field: empty string → null, otherwise the value as-is.
 *  PostgreSQL date columns reject "" — only null or "YYYY-MM-DD" are valid. */
function normalizeDate(value: string | null | undefined): string | null {
  if (!value || value.trim() === "") return null;
  return value.trim();
}

/** Normalize all date fields in an application input to be DB-safe.
 *  Converts empty strings to null so PostgreSQL date columns don't reject them. */
function normalizeInputDates<T extends Partial<AgencyApplicationInput>>(input: T): T {
  return {
    ...input,
    license_issue_date: normalizeDate(input.license_issue_date),
    license_expiry_date: normalizeDate(input.license_expiry_date),
  };
}

/** Fetch the current user's latest application (if any). */
export async function fetchMyAgencyApplication(
  userId: string,
): Promise<AgencyApplication | null> {
  const { data, error } = await supabase
    .from("agency_applications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("fetchMyAgencyApplication error:", error);
    return null;
  }
  return data as unknown as AgencyApplication | null;
}

/** Create a new draft application. */
export async function createAgencyApplication(
  userId: string,
  input: AgencyApplicationInput,
): Promise<{ application: AgencyApplication | null; error: string | null }> {
  const { data, error } = await supabase
    .from("agency_applications")
    .insert({
      user_id: userId,
      status: "draft",
      agency_name: input.agency_name,
      legal_name: input.legal_name ?? null,
      manager_name: input.manager_name ?? null,
      country: input.country ?? null,
      city: input.city ?? null,
      address: input.address ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      logo_url: input.logo_url ?? null,
      social_links: input.social_links ?? null,
      license_number: input.license_number ?? null,
      license_issuing_org: input.license_issuing_org ?? null,
      license_issue_date: normalizeDate(input.license_issue_date),
      license_expiry_date: normalizeDate(input.license_expiry_date),
      license_document_url: input.license_document_url ?? null,
      registration_document_url: input.registration_document_url ?? null,
      additional_documents: input.additional_documents ?? null,
      agency_photos: input.agency_photos ?? null,
    })
    .select("*")
    .single();
  if (error || !data) {
    console.error("createAgencyApplication error:", error);
    return { application: null, error: error?.message ?? "Failed to create application" };
  }
  return { application: data as unknown as AgencyApplication, error: null };
}

/** Update an existing application (user can only edit their own, and only when status allows editing). */
export async function updateAgencyApplication(
  applicationId: string,
  input: Partial<AgencyApplicationInput>,
): Promise<{ application: AgencyApplication | null; error: string | null }> {
  const { data, error } = await supabase
    .from("agency_applications")
    .update({
      ...normalizeInputDates(input),
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select("*")
    .single();
  if (error || !data) {
    console.error("updateAgencyApplication error:", error);
    return { application: null, error: error?.message ?? "Failed to update application" };
  }
  return { application: data as unknown as AgencyApplication, error: null };
}

/** Submit an application — changes status from draft/more_info_required to 'submitted'. */
export async function submitAgencyApplication(
  applicationId: string,
): Promise<{ application: AgencyApplication | null; error: string | null }> {
  const { data, error } = await supabase
    .from("agency_applications")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      // Clear any previous rejection/review data if resubmitting
      rejection_reason: null,
      reviewed_at: null,
      reviewed_by: null,
      owner_request_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select("*")
    .single();
  if (error || !data) {
    console.error("submitAgencyApplication error:", error);
    return { application: null, error: error?.message ?? "Failed to submit application" };
  }
  return { application: data as unknown as AgencyApplication, error: null };
}

/** Trigger the admin email notification edge function. */
export async function notifyAdminOfApplication(
  applicationId: string,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { ok: false, error: "Not authenticated" };

    const supabaseUrl = import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string;
    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-agency-application-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ applicationId }),
      },
    );
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return { ok: false, error: (errBody as Record<string, string>)?.error ?? "Email notification failed" };
    }
    return { ok: true, error: null };
  } catch (err) {
    console.error("notifyAdminOfApplication error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/** Check if a user has an approved agency application (via RPC). */
export async function checkApprovedApplication(
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_approved_agency_application", {
    p_user_id: userId,
  });
  if (error) {
    console.error("checkApprovedApplication error:", error);
    return false;
  }
  return data === true;
}

// ── Owner/Admin functions ──────────────────────────────────

/** Summary for owner dashboard stats. */
export interface AgencyApplicationSummary {
  total: number;
  new: number;
  under_review: number;
  approved: number;
  rejected: number;
  more_info_required: number;
  submitted: number;
  draft: number;
}

/** Fetch summary stats for all agency applications (owner only). */
export async function fetchAgencyApplicationStats(): Promise<AgencyApplicationSummary> {
  const { data, error } = await supabase
    .from("agency_applications")
    .select("status");
  if (error) {
    console.error("fetchAgencyApplicationStats error:", error);
    return { total: 0, new: 0, under_review: 0, approved: 0, rejected: 0, more_info_required: 0, submitted: 0, draft: 0 };
  }
  const rows = (data ?? []) as Array<{ status: string }>;
  const summary: AgencyApplicationSummary = {
    total: rows.length,
    new: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    more_info_required: 0,
    submitted: 0,
    draft: 0,
  };
  for (const row of rows) {
    switch (row.status) {
      case "draft": summary.draft++; break;
      case "submitted": summary.submitted++; summary.new++; break;
      case "under_review": summary.under_review++; break;
      case "more_info_required": summary.more_info_required++; break;
      case "approved": summary.approved++; break;
      case "rejected": summary.rejected++; break;
    }
  }
  return summary;
}

/** Fetch all agency applications (owner only) with optional status filter. */
export async function fetchAllAgencyApplications(
  statusFilter?: AgencyApplicationStatus | "all",
): Promise<AgencyApplication[]> {
  let query = supabase
    .from("agency_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  const { data, error } = await query;
  if (error) {
    console.error("fetchAllAgencyApplications error:", error);
    return [];
  }
  return (data ?? []) as unknown as AgencyApplication[];
}

/** Fetch a single application by ID (owner only). */
export async function fetchAgencyApplicationById(
  applicationId: string,
): Promise<AgencyApplication | null> {
  const { data, error } = await supabase
    .from("agency_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) {
    console.error("fetchAgencyApplicationById error:", error);
    return null;
  }
  return data as unknown as AgencyApplication | null;
}

/** Owner approves an application. */
export async function approveAgencyApplication(
  applicationId: string,
  reviewerId: string,
  adminNote?: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from("agency_applications")
    .update({
      status: "approved",
      admin_note: adminNote ?? null,
      rejection_reason: null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);
  if (error) {
    console.error("approveAgencyApplication error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

/** Owner rejects an application. */
export async function rejectAgencyApplication(
  applicationId: string,
  reviewerId: string,
  rejectionReason: string,
  adminNote?: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from("agency_applications")
    .update({
      status: "rejected",
      rejection_reason: rejectionReason,
      admin_note: adminNote ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);
  if (error) {
    console.error("rejectAgencyApplication error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

/** Owner requests more information from the applicant. */
export async function requestMoreInfo(
  applicationId: string,
  reviewerId: string,
  message: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from("agency_applications")
    .update({
      status: "more_info_required",
      owner_request_message: message,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);
  if (error) {
    console.error("requestMoreInfo error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

/** Owner sets application to under review. */
export async function setUnderReview(
  applicationId: string,
  reviewerId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from("agency_applications")
    .update({
      status: "under_review",
      reviewed_by: reviewerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);
  if (error) {
    console.error("setUnderReview error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

// ── Document upload helper ─────────────────────────────────

/** Upload a document to the PRIVATE consulting storage bucket.
 *  Returns `{ path, error }` — path is the storage object path (NOT a public URL).
 *  Use `getSignedDocumentUrl(path)` to generate a time-limited signed URL for viewing. */
export async function uploadAgencyDocument(
  file: File,
  userId: string,
  docType: string,
): Promise<{ path: string | null; error: string | null }> {
  const path = `agency-applications/${userId}/${docType}-${Date.now()}`;
  const { data, error } = await supabase.storage
    .from("consulting")
    .upload(path, file, { upsert: true });
  if (error) {
    console.error("uploadAgencyDocument error:", error);
    return { path: null, error: error.message };
  }
  // Return the storage object path — NOT a public URL.
  // The bucket is private; signed URLs are generated on demand.
  return { path: data.path, error: null };
}

/** Generate a signed URL (5-minute expiry) for a private storage object.
 *  Used by applicants viewing their own documents and by OXEN owners reviewing applications. */
export async function getSignedDocumentUrl(
  path: string,
  seconds: number = 300,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("consulting")
    .createSignedUrl(path, seconds);
  if (error || !data?.signedUrl) {
    console.error("getSignedDocumentUrl error:", error);
    return null;
  }
  return data.signedUrl;
}

// ── Status helpers ─────────────────────────────────────────

export const STATUS_LABELS: Record<AgencyApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  more_info_required: "More Info Required",
  approved: "Approved",
  rejected: "Rejected",
};

export const STATUS_STYLE: Record<AgencyApplicationStatus, string> = {
  draft: "bg-white/[0.06] text-muted-foreground",
  submitted: "bg-sky-500/15 text-sky-300",
  under_review: "bg-amber-500/15 text-amber-300",
  more_info_required: "bg-purple-500/15 text-purple-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-destructive/15 text-destructive",
};

/** Whether the user can edit their application (draft or more_info_required). */
export function canEditApplication(status: AgencyApplicationStatus): boolean {
  return status === "draft" || status === "more_info_required" || status === "rejected";
}

/** Whether the user can submit their application. */
export function canSubmitApplication(status: AgencyApplicationStatus): boolean {
  return status === "draft" || status === "more_info_required" || status === "rejected";
}
