import { supabase } from "@/lib/supabase";
import type { Json } from "@/integrations/supabase/types";

/* ============================================================
   Consulting Business — Types + Data Access Layer (Phase 1)
   All data flows through Supabase and is enforced by RLS.
   No hardcoded records.
   ============================================================ */

// ── Enums (mirror DB checks) ────────────────────────────────

export type SubscriptionPlan = "monthly" | "quarterly" | "annual";
export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "expired"
  | "cancelled"
  | "suspended";

export type PaymentStatus =
  | "pending"
  | "requires_verification"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled"
  | "partial";

export type MemberRole =
  | "owner"
  | "administrator"
  | "manager"
  | "consultant"
  | "support_agent"
  | "finance_manager"
  | "content_manager"
  | "read_only";

export type MemberStatus = "active" | "suspended" | "invited" | "removed";

export type ClientApplicationStatus =
  | "new_lead"
  | "contacted"
  | "consultation_scheduled"
  | "documents_requested"
  | "documents_received"
  | "under_review"
  | "submitted"
  | "waiting_for_result"
  | "approved"
  | "rejected"
  | "travel_completed"
  | "cancelled"
  | "refunded";

export type ApplicationStatus =
  | "new"
  | "documents"
  | "processing"
  | "submitted"
  | "approved"
  | "rejected"
  | "completed";

export type FinalResult = "pending" | "success" | "unsuccessful" | "cancelled";

export type VerificationStatus = "not_submitted" | "pending" | "verified" | "rejected";

// ── Plan pricing (single source of truth) ───────────────────

export interface PlanInfo {
  id: SubscriptionPlan;
  name: string;
  price: number;
  currency: string;
  months: number;
  savingsLabel?: string;
  badge?: string;
  features: string[];
}

export const CONSULTING_PLANS: PlanInfo[] = [
  {
    id: "monthly",
    name: "Monthly",
    price: 150,
    currency: "USD",
    months: 1,
    features: [
      "Full consulting dashboard access",
      "Unlimited service packages",
      "Client & application management",
      "Up to 3 employee seats",
      "Email support",
    ],
  },
  {
    id: "quarterly",
    name: "Quarterly",
    price: 400,
    currency: "USD",
    months: 3,
    savingsLabel: "Save $50",
    badge: "Most Popular",
    features: [
      "Everything in Monthly",
      "Up to 10 employee seats",
      "Analytics & revenue reports",
      "Priority support",
      "Company public profile",
    ],
  },
  {
    id: "annual",
    name: "Annual",
    price: 1700,
    currency: "USD",
    months: 12,
    savingsLabel: "Save $100",
    badge: "Best Value",
    features: [
      "Everything in Quarterly",
      "Unlimited employee seats",
      "Advanced analytics & export",
      "Dedicated account manager",
      "API access (Phase 2)",
    ],
  },
];

export function getPlan(id: SubscriptionPlan): PlanInfo {
  return CONSULTING_PLANS.find((p) => p.id === id) ?? CONSULTING_PLANS[0];
}

/** Compute subscription end date from a start date and plan. */
export function computeEndDate(start: Date, plan: SubscriptionPlan): Date {
  const d = new Date(start);
  d.setMonth(d.getMonth() + getPlan(plan).months);
  return d;
}

// ── Row types ───────────────────────────────────────────────

export interface ConsultingCompany {
  id: string;
  owner_id: string;
  name: string;
  legal_name: string | null;
  registration_number: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  working_hours: string | null;
  supported_languages: string[] | null;
  destination_countries: string[] | null;
  years_experience: number;
  manager_full_name: string | null;
  manager_phone: string | null;
  manager_email: string | null;
  /** License / accreditation info (free text). Column added by migration 0002. */
  license_info: string | null;
  /** Whether the public company profile is published. Column added by migration 0002. */
  is_published: boolean;
  is_verified: boolean;
  verification_status: VerificationStatus;
  // ── Agency enhancement fields (migration 0013) ──
  /** WhatsApp contact number */
  whatsapp: string | null;
  /** Telegram handle or URL */
  telegram: string | null;
  /** Additional phone number */
  additional_phone: string | null;
  /** Social links as jsonb {instagram, facebook, tiktok, youtube, telegram} */
  social_links: Record<string, string> | null;
  /** Google Maps or similar location link */
  map_link: string | null;
  /** Year the agency was founded */
  founded_year: number | null;
  /** Array of agency photo URLs (office, team, etc.) */
  agency_photos: string[] | null;
  /** Array of branch objects {name, address, phone, working_hours, map_link} */
  branches: Array<{ name: string; address: string; phone: string; working_hours: string; map_link: string }> | null;
  /** Tourism license number */
  license_number: string | null;
  /** URL to license document (private, not shown publicly) */
  license_document_url: string | null;
  /** License issue date */
  license_issue_date: string | null;
  /** License expiry date */
  license_expiry_date: string | null;
  /** Organization that issued the license */
  license_issuing_org: string | null;
  /** URL to registration document (private) */
  registration_document_url: string | null;
  /** Short tagline-style description */
  short_description: string | null;
  /** Agency specialties (e.g. visa, tours, education) */
  specialties: string[] | null;
  /** Human-friendly unique agency code (e.g. OX-TRV-7K29Q) for joining */
  agency_code: string | null;
  /** Soft-delete flag — false means deactivated */
  is_active: boolean;
  subscription_status: SubscriptionStatus | "none";
  subscription_plan: SubscriptionPlan | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultingSubscription {
  id: string;
  consulting_company_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  auto_renewal: boolean;
  amount: number;
  currency: string;
  payment_method_id: string | null;
  payment_customer_id: string | null;
  card_brand: string | null;
  card_last4: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ConsultingMember {
  id: string;
  consulting_company_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  invited_by: string | null;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
  /** Joined profile fields (optional) */
  profile?: {
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ConsultingClient {
  id: string;
  consulting_company_id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  service_id: string | null;
  destination_country: string | null;
  assigned_employee_id: string | null;
  purchase_date: string | null;
  payment_status: PaymentStatus;
  application_status: ClientApplicationStatus;
  final_result: FinalResult;
  last_activity_at: string;
  is_archived: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  /** Joined fields (optional) */
  assigned_employee?: { name: string | null; avatar_url: string | null } | null;
  service?: { title: string; price: number } | null;
}

export interface ConsultingClientNote {
  id: string;
  consulting_company_id: string;
  client_id: string;
  author_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  author?: { name: string | null; avatar_url: string | null } | null;
}

export interface ConsultingApplication {
  id: string;
  consulting_company_id: string;
  client_id: string;
  service_id: string | null;
  destination_country: string | null;
  application_type: string | null;
  assigned_employee_id: string | null;
  submission_date: string | null;
  expected_completion_date: string | null;
  status: ApplicationStatus;
  required_documents: Json;
  uploaded_documents: Json;
  internal_notes: string | null;
  client_visible_updates: string | null;
  final_decision: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  client?: ConsultingClient | null;
  service?: { title: string; price: number } | null;
  assigned_employee?: { name: string | null; avatar_url: string | null } | null;
}

export interface ConsultingApplicationHistory {
  id: string;
  consulting_company_id: string;
  application_id: string;
  previous_status: ApplicationStatus | null;
  new_status: ApplicationStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
  changed_by_profile?: { name: string | null; avatar_url: string | null } | null;
}

export interface ConsultingPackage {
  id: string;
  consulting_company_id: string;
  service_id: string | null;
  destination_country: string | null;
  estimated_processing_time: string | null;
  included_services: Json;
  required_documents: Json;
  what_client_receives: Json;
  who_this_is_for: string | null;
  refund_conditions: string | null;
  contact_info: Json;
  available_slots: number | null;
  faq: Json;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  service?: {
    id: string;
    title: string;
    description: string;
    cover_image: string | null;
    price: number;
    currency: string;
    category: string;
    is_active: boolean;
  } | null;
}

export interface ConsultingPayment {
  id: string;
  consulting_company_id: string;
  client_id: string | null;
  service_id: string | null;
  transaction_id: string;
  type: "subscription" | "package" | "refund";
  gross_amount: number;
  commission: number;
  net_amount: number;
  currency: string;
  payment_method_id: string | null;
  card_brand: string | null;
  card_last4: string | null;
  status: PaymentStatus;
  refund_status: string | null;
  receipt_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  client?: { full_name: string } | null;
  service?: { title: string } | null;
}

export interface ConsultingInvitation {
  id: string;
  consulting_company_id: string;
  email: string;
  role: MemberRole;
  token: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Company ─────────────────────────────────────────────────

/** Find the consulting company a user owns or belongs to. */
export async function fetchMyConsultingCompany(
  userId: string,
): Promise<ConsultingCompany | null> {
  // Try by membership first (works for owners and employees)
  const { data: memberRow } = await supabase
    .from("consulting_members")
    .select("consulting_company_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (memberRow?.consulting_company_id) {
    const { data, error } = await supabase
      .from("consulting_companies")
      .select("*")
      .eq("id", memberRow.consulting_company_id)
      .maybeSingle();
    if (error) console.error("fetchMyConsultingCompany error:", error);
    return data as unknown as ConsultingCompany | null;
  }

  // Fallback: owner_id match (covers companies created before member row)
  const { data, error } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) console.error("fetchMyConsultingCompany (owner) error:", error);
  return data as unknown as ConsultingCompany | null;
}

/** Check if a user belongs to any consulting company; return member row. */
export async function fetchMyMembership(
  userId: string,
): Promise<ConsultingMember | null> {
  const { data, error } = await supabase
    .from("consulting_members")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) console.error("fetchMyMembership error:", error);
  return data as unknown as ConsultingMember | null;
}

// ── Company profile update + public fetch ────────────────────

export interface CompanyProfileUpdate {
  name?: string;
  description?: string | null;
  short_description?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  contact_phone?: string | null;
  additional_phone?: string | null;
  contact_email?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  telegram?: string | null;
  working_hours?: string | null;
  supported_languages?: string[] | null;
  destination_countries?: string[] | null;
  specialties?: string[] | null;
  years_experience?: number;
  founded_year?: number | null;
  license_info?: string | null;
  license_number?: string | null;
  license_document_url?: string | null;
  license_issue_date?: string | null;
  license_expiry_date?: string | null;
  license_issuing_org?: string | null;
  registration_document_url?: string | null;
  verification_status?: VerificationStatus;
  logo_url?: string | null;
  cover_image_url?: string | null;
  is_published?: boolean;
  social_links?: Record<string, string> | null;
  map_link?: string | null;
  agency_photos?: string[] | null;
  branches?: Array<{ name: string; address: string; phone: string; working_hours: string; map_link: string }> | null;
}

/** Update the current user's consulting company profile. RLS requires admin/owner. */
export async function updateCompanyProfile(
  companyId: string,
  patch: CompanyProfileUpdate,
): Promise<{ company: ConsultingCompany | null; error: string | null }> {
  const { data, error } = await supabase
    .from("consulting_companies")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("updateCompanyProfile error:", error);
    return { company: null, error: error.message };
  }
  return { company: data as unknown as ConsultingCompany, error: null };
}

/** Public fetch of a consulting company by id.
 *  Returns the agency if it exists and is active (not soft-deleted).
 *  Does NOT gate on is_published or verification_status — an approved
 *  agency with published tour packages must be visible to users.
 *  Only hides genuinely deactivated or non-existent agencies. */
export async function fetchPublicConsultingCompany(
  companyId: string,
): Promise<ConsultingCompany | null> {
  const { data, error } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("id", companyId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    console.error("fetchPublicConsultingCompany error:", error);
    return null;
  }
  return data as unknown as ConsultingCompany | null;
}

// ── Agency discovery (public) ────────────────────────────────

/** Fetch all published agencies for public display. Returns only safe public fields. */
export async function fetchPublishedAgencies(): Promise<ConsultingCompany[]> {
  const { data, error } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("is_published", true)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("fetchPublishedAgencies error:", error);
    return [];
  }
  return (data ?? []) as unknown as ConsultingCompany[];
}

/** Count active services for a given agency (for agency cards). */
export async function fetchAgencyServiceCount(agencyId: string): Promise<number> {
  const { count, error } = await supabase
    .from("services")
    .select("*", { count: "exact", head: true })
    .eq("consulting_id", agencyId)
    .eq("is_active", true);
  if (error) {
    console.error("fetchAgencyServiceCount error:", error);
    return 0;
  }
  return count ?? 0;
}

// ── Onboarding (Checkout) ───────────────────────────────────

export interface NewCompanyInput {
  owner_id: string;
  name: string;
  legal_name?: string;
  registration_number?: string;
  country?: string;
  city?: string;
  address?: string;
  logo_url?: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  manager_full_name?: string;
  manager_phone?: string;
  manager_email?: string;
}

export interface NewSubscriptionInput {
  consulting_company_id: string;
  plan: SubscriptionPlan;
  status?: SubscriptionStatus;
  start_date?: string;
  end_date?: string;
  auto_renewal?: boolean;
  amount: number;
  currency?: string;
  payment_method_id?: string;
  payment_customer_id?: string;
  card_brand?: string;
  card_last4?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  created_by?: string;
}

/**
 * Create a consulting company, an active subscription, and an owner member
 * row in a single coordinated flow. Called from the Checkout success step.
 * RLS allows the owner to insert all three (owner_id = auth.uid()).
 */
export async function createConsultingAccount(input: {
  company: NewCompanyInput;
  subscription: NewSubscriptionInput;
  ownerId: string;
}): Promise<{ company: ConsultingCompany | null; error: string | null }> {
  const { company: companyInput, subscription: subInput, ownerId } = input;

  // 1. Create company
  const { data: company, error: companyErr } = await supabase
    .from("consulting_companies")
    .insert({
      owner_id: ownerId,
      name: companyInput.name,
      legal_name: companyInput.legal_name ?? null,
      registration_number: companyInput.registration_number ?? null,
      country: companyInput.country ?? null,
      city: companyInput.city ?? null,
      address: companyInput.address ?? null,
      logo_url: companyInput.logo_url ?? null,
      description: companyInput.description ?? null,
      contact_email: companyInput.contact_email ?? null,
      contact_phone: companyInput.contact_phone ?? null,
      website: companyInput.website ?? null,
      manager_full_name: companyInput.manager_full_name ?? null,
      manager_phone: companyInput.manager_phone ?? null,
      manager_email: companyInput.manager_email ?? null,
      verification_status: "pending",
      subscription_status: "active",
      subscription_plan: subInput.plan,
      subscription_start_date: subInput.start_date ?? new Date().toISOString(),
      subscription_end_date: subInput.end_date ?? computeEndDate(new Date(), subInput.plan).toISOString(),
    })
    .select("*")
    .single();

  if (companyErr || !company) {
    console.error("createConsultingAccount: company insert failed:", companyErr);
    return { company: null, error: companyErr?.message ?? "Failed to create company" };
  }

  const companyId = (company as ConsultingCompany).id;

  // 2. Create subscription
  const { error: subErr } = await supabase.from("consulting_subscriptions").insert({
    consulting_company_id: companyId,
    plan: subInput.plan,
    status: subInput.status ?? "active",
    start_date: subInput.start_date ?? new Date().toISOString(),
    end_date: subInput.end_date ?? computeEndDate(new Date(), subInput.plan).toISOString(),
    auto_renewal: subInput.auto_renewal ?? true,
    amount: subInput.amount,
    currency: subInput.currency ?? "USD",
    payment_method_id: subInput.payment_method_id ?? null,
    payment_customer_id: subInput.payment_customer_id ?? null,
    card_brand: subInput.card_brand ?? null,
    card_last4: subInput.card_last4 ?? null,
    card_exp_month: subInput.card_exp_month ?? null,
    card_exp_year: subInput.card_exp_year ?? null,
    created_by: ownerId,
  });

  if (subErr) console.error("createConsultingAccount: subscription insert failed:", subErr);

  // 3. Create owner member row
  const { error: memberErr } = await supabase.from("consulting_members").insert({
    consulting_company_id: companyId,
    user_id: ownerId,
    role: "owner",
    status: "active",
    invited_by: ownerId,
  });

  if (memberErr) console.error("createConsultingAccount: member insert failed:", memberErr);

  // 4. Record payment
  const { error: payErr } = await supabase.from("consulting_payments").insert({
    consulting_company_id: companyId,
    transaction_id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    type: "subscription",
    gross_amount: subInput.amount,
    commission: 0,
    net_amount: subInput.amount,
    currency: subInput.currency ?? "USD",
    payment_method_id: subInput.payment_method_id ?? null,
    card_brand: subInput.card_brand ?? null,
    card_last4: subInput.card_last4 ?? null,
    status: "paid",
    paid_at: new Date().toISOString(),
    created_by: ownerId,
  });

  if (payErr) console.error("createConsultingAccount: payment insert failed:", payErr);

  return { company: company as ConsultingCompany, error: null };
}

// ── Clients ─────────────────────────────────────────────────

export async function fetchClients(
  companyId: string,
  opts: {
    search?: string;
    status?: ClientApplicationStatus | "all";
    employeeId?: string;
    page?: number;
    pageSize?: number;
    archived?: boolean;
  } = {},
): Promise<{ clients: ConsultingClient[]; total: number }> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("consulting_clients")
    .select(
      "*, assigned_employee:profiles!consulting_clients_assigned_employee_id_fkey(name,avatar_url), service:services!consulting_clients_service_id_fkey(title,price)",
      { count: "exact" },
    )
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });

  if (opts.archived === undefined) {
    query = query.eq("is_archived", false);
  } else {
    query = query.eq("is_archived", opts.archived);
  }

  if (opts.status && opts.status !== "all") {
    query = query.eq("application_status", opts.status);
  }
  if (opts.employeeId) {
    query = query.eq("assigned_employee_id", opts.employeeId);
  }
  if (opts.search?.trim()) {
    query = query.or(`full_name.ilike.%${opts.search}%,email.ilike.%${opts.search}%,phone.ilike.%${opts.search}%`);
  }

  const { data, count, error } = await query.range(from, to);
  if (error) console.error("fetchClients error:", error);
  return { clients: (data ?? []) as unknown as ConsultingClient[], total: count ?? 0 };
}

export async function fetchClientById(clientId: string): Promise<ConsultingClient | null> {
  const { data, error } = await supabase
    .from("consulting_clients")
    .select(
      "*, assigned_employee:profiles!consulting_clients_assigned_employee_id_fkey(name,avatar_url), service:services!consulting_clients_service_id_fkey(title,price)",
    )
    .eq("id", clientId)
    .maybeSingle();
  if (error) console.error("fetchClientById error:", error);
  return data as unknown as ConsultingClient | null;
}

export async function createClient(
  companyId: string,
  input: Partial<ConsultingClient> & { full_name: string },
  createdBy: string,
): Promise<ConsultingClient | null> {
  const { data, error } = await supabase
    .from("consulting_clients")
    .insert({
      consulting_company_id: companyId,
      full_name: input.full_name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      photo_url: input.photo_url ?? null,
      service_id: input.service_id ?? null,
      destination_country: input.destination_country ?? null,
      assigned_employee_id: input.assigned_employee_id ?? null,
      application_status: input.application_status ?? "new_lead",
      payment_status: input.payment_status ?? "pending",
      final_result: input.final_result ?? "pending",
      metadata: input.metadata ?? {},
      created_by: createdBy,
    })
    .select("*")
    .single();
  if (error) {
    console.error("createClient error:", error);
    throw error;
  }
  return data as unknown as ConsultingClient;
}

export async function updateClient(
  clientId: string,
  input: Partial<ConsultingClient>,
): Promise<ConsultingClient | null> {
  const { data, error } = await supabase
    .from("consulting_clients")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", clientId)
    .select("*")
    .single();
  if (error) {
    console.error("updateClient error:", error);
    throw error;
  }
  return data as unknown as ConsultingClient;
}

export async function archiveClient(clientId: string, archive: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_clients")
    .update({ is_archived: archive, updated_at: new Date().toISOString() })
    .eq("id", clientId);
  if (error) {
    console.error("archiveClient error:", error);
    return false;
  }
  return true;
}

// ── Client notes ────────────────────────────────────────────

export async function fetchClientNotes(clientId: string): Promise<ConsultingClientNote[]> {
  const { data, error } = await supabase
    .from("consulting_client_notes")
    .select("*, author:profiles!consulting_client_notes_author_id_fkey(name,avatar_url)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) console.error("fetchClientNotes error:", error);
  return (data ?? []) as unknown as ConsultingClientNote[];
}

export async function addClientNote(
  companyId: string,
  clientId: string,
  authorId: string,
  body: string,
  isInternal = true,
): Promise<ConsultingClientNote | null> {
  const { data, error } = await supabase
    .from("consulting_client_notes")
    .insert({
      consulting_company_id: companyId,
      client_id: clientId,
      author_id: authorId,
      body,
      is_internal: isInternal,
    })
    .select("*")
    .single();
  if (error) {
    console.error("addClientNote error:", error);
    throw error;
  }
  return data as unknown as ConsultingClientNote;
}

// ── Applications ────────────────────────────────────────────

export async function fetchApplications(
  companyId: string,
  opts: { status?: ApplicationStatus | "all"; search?: string; view?: "all" | "assigned" } = {},
): Promise<ConsultingApplication[]> {
  let query = supabase
    .from("consulting_applications")
    .select(
      "*, client:consulting_clients!consulting_applications_client_id_fkey(*), service:services!consulting_applications_service_id_fkey(title,price), assigned_employee:profiles!consulting_applications_assigned_employee_id_fkey(name,avatar_url)",
    )
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });

  if (opts.status && opts.status !== "all") {
    query = query.eq("status", opts.status);
  }
  if (opts.search?.trim()) {
    query = query.or(`application_type.ilike.%${opts.search}%,destination_country.ilike.%${opts.search}%`);
  }

  const { data, error } = await query;
  if (error) console.error("fetchApplications error:", error);
  return (data ?? []) as unknown as ConsultingApplication[];
}

export async function createApplication(
  companyId: string,
  input: Partial<ConsultingApplication> & { client_id: string },
  createdBy: string,
): Promise<ConsultingApplication | null> {
  const { data, error } = await supabase
    .from("consulting_applications")
    .insert({
      consulting_company_id: companyId,
      client_id: input.client_id,
      service_id: input.service_id ?? null,
      destination_country: input.destination_country ?? null,
      application_type: input.application_type ?? null,
      assigned_employee_id: input.assigned_employee_id ?? null,
      submission_date: input.submission_date ?? null,
      expected_completion_date: input.expected_completion_date ?? null,
      status: input.status ?? "new",
      required_documents: input.required_documents ?? [],
      uploaded_documents: input.uploaded_documents ?? [],
      internal_notes: input.internal_notes ?? null,
      client_visible_updates: input.client_visible_updates ?? null,
      created_by: createdBy,
    })
    .select("*")
    .single();
  if (error) {
    console.error("createApplication error:", error);
    throw error;
  }
  return data as unknown as ConsultingApplication;
}

/** Update application status and append to history. */
export async function updateApplicationStatus(
  application: ConsultingApplication,
  newStatus: ApplicationStatus,
  changedBy: string,
  note?: string,
): Promise<void> {
  const previousStatus = application.status;
  if (previousStatus === newStatus) return;

  const { error: updateErr } = await supabase
    .from("consulting_applications")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", application.id);
  if (updateErr) {
    console.error("updateApplicationStatus update error:", updateErr);
    throw updateErr;
  }

  const { error: histErr } = await supabase.from("consulting_application_history").insert({
    consulting_company_id: application.consulting_company_id,
    application_id: application.id,
    previous_status: previousStatus,
    new_status: newStatus,
    changed_by: changedBy,
    note: note ?? null,
  });
  if (histErr) console.error("updateApplicationStatus history error:", histErr);
}

export async function fetchApplicationHistory(
  applicationId: string,
): Promise<ConsultingApplicationHistory[]> {
  const { data, error } = await supabase
    .from("consulting_application_history")
    .select("*, changed_by_profile:profiles!consulting_application_history_changed_by_fkey(name,avatar_url)")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });
  if (error) console.error("fetchApplicationHistory error:", error);
  return (data ?? []) as unknown as ConsultingApplicationHistory[];
}

// ── Packages ────────────────────────────────────────────────

export async function fetchCompanyPackages(companyId: string): Promise<ConsultingPackage[]> {
  const { data, error } = await supabase
    .from("consulting_packages")
    .select(
      "*, service:services!consulting_packages_service_id_fkey(id,title,description,cover_image,price,currency,category,is_active)",
    )
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) console.error("fetchCompanyPackages error:", error);
  return (data ?? []) as unknown as ConsultingPackage[];
}

export async function fetchPackageById(packageId: string): Promise<ConsultingPackage | null> {
  const { data, error } = await supabase
    .from("consulting_packages")
    .select(
      "*, service:services!consulting_packages_service_id_fkey(id,title,description,cover_image,price,currency,category,is_active)",
    )
    .eq("id", packageId)
    .maybeSingle();
  if (error) console.error("fetchPackageById error:", error);
  return data as unknown as ConsultingPackage | null;
}

export async function upsertPackage(
  companyId: string,
  serviceId: string,
  input: Partial<ConsultingPackage>,
  createdBy: string,
  existingId?: string,
): Promise<ConsultingPackage | null> {
  const payload = {
    consulting_company_id: companyId,
    service_id: serviceId,
    destination_country: input.destination_country ?? null,
    estimated_processing_time: input.estimated_processing_time ?? null,
    included_services: input.included_services ?? [],
    required_documents: input.required_documents ?? [],
    what_client_receives: input.what_client_receives ?? [],
    who_this_is_for: input.who_this_is_for ?? null,
    refund_conditions: input.refund_conditions ?? null,
    contact_info: input.contact_info ?? {},
    available_slots: input.available_slots ?? null,
    faq: input.faq ?? [],
    is_published: input.is_published ?? false,
    created_by: createdBy,
  };

  if (existingId) {
    const { data, error } = await supabase
      .from("consulting_packages")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", existingId)
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as ConsultingPackage;
  }

  const { data, error } = await supabase
    .from("consulting_packages")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as ConsultingPackage;
}

export async function deletePackage(packageId: string): Promise<boolean> {
  const { error } = await supabase.from("consulting_packages").delete().eq("id", packageId);
  if (error) {
    console.error("deletePackage error:", error);
    return false;
  }
  return true;
}

// ── Members / Employees ─────────────────────────────────────

export async function fetchMembers(companyId: string): Promise<ConsultingMember[]> {
  const { data, error } = await supabase
    .from("consulting_members")
    .select("*, profile:profiles!consulting_members_user_id_fkey(name,email,avatar_url)")
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: true });
  if (error) console.error("fetchMembers error:", error);
  return (data ?? []) as unknown as ConsultingMember[];
}

export async function updateMemberRole(
  memberId: string,
  role: MemberRole,
): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_members")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", memberId);
  if (error) {
    console.error("updateMemberRole error:", error);
    return false;
  }
  return true;
}

export async function updateMemberStatus(
  memberId: string,
  status: MemberStatus,
): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_members")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", memberId);
  if (error) {
    console.error("updateMemberStatus error:", error);
    return false;
  }
  return true;
}

export async function inviteMember(
  companyId: string,
  email: string,
  role: MemberRole,
  invitedBy: string,
): Promise<ConsultingInvitation | null> {
  const { data, error } = await supabase
    .from("consulting_invitations")
    .insert({
      consulting_company_id: companyId,
      email: email.toLowerCase().trim(),
      role,
      invited_by: invitedBy,
    })
    .select("*")
    .single();
  if (error) {
    console.error("inviteMember error:", error);
    throw error;
  }
  return data as unknown as ConsultingInvitation;
}

export async function fetchInvitations(companyId: string): Promise<ConsultingInvitation[]> {
  const { data, error } = await supabase
    .from("consulting_invitations")
    .select("*")
    .eq("consulting_company_id", companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) console.error("fetchInvitations error:", error);
  return (data ?? []) as unknown as ConsultingInvitation[];
}

export async function revokeInvitation(invitationId: string): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_invitations")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", invitationId);
  if (error) {
    console.error("revokeInvitation error:", error);
    return false;
  }
  return true;
}

// ── Payments ────────────────────────────────────────────────

export async function fetchPayments(
  companyId: string,
  opts: { status?: PaymentStatus | "all"; page?: number; pageSize?: number } = {},
): Promise<{ payments: ConsultingPayment[]; total: number }> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("consulting_payments")
    .select(
      "*, client:consulting_clients!consulting_payments_client_id_fkey(full_name), service:services!consulting_payments_service_id_fkey(title)",
      { count: "exact" },
    )
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });

  if (opts.status && opts.status !== "all") {
    query = query.eq("status", opts.status);
  }

  const { data, count, error } = await query.range(from, to);
  if (error) console.error("fetchPayments error:", error);
  return { payments: (data ?? []) as unknown as ConsultingPayment[], total: count ?? 0 };
}

// ── Analytics helpers ───────────────────────────────────────

export interface DashboardStats {
  totalClients: number;
  newThisWeek: number;
  newThisMonth: number;
  activeApplications: number;
  successfulClients: number;
  unsuccessfulClients: number;
  pendingClients: number;
  totalRevenue: number;
  monthlyRevenue: number;
  annualRevenue: number;
  previousTotalClients: number;
  previousNewThisWeek: number;
  previousNewThisMonth: number;
}

export async function fetchDashboardStats(companyId: string): Promise<DashboardStats> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfPrevWeek = new Date(startOfWeek);
  startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Clients
  const { count: totalClients } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("is_archived", false);

  const { count: newThisWeek } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("is_archived", false)
    .gte("created_at", startOfWeek.toISOString());

  const { count: newThisMonth } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("is_archived", false)
    .gte("created_at", startOfMonth.toISOString());

  const { count: previousNewThisWeek } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("is_archived", false)
    .gte("created_at", startOfPrevWeek.toISOString())
    .lt("created_at", startOfWeek.toISOString());

  const { count: previousNewThisMonth } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("is_archived", false)
    .gte("created_at", startOfPrevMonth.toISOString())
    .lt("created_at", startOfMonth.toISOString());

  // Applications
  const { count: activeApplications } = await supabase
    .from("consulting_applications")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .in("status", ["new", "documents", "processing", "submitted"]);

  // Final results (from clients)
  const { count: successfulClients } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("final_result", "success");

  const { count: unsuccessfulClients } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("final_result", "unsuccessful");

  const { count: pendingClients } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("final_result", "pending");

  // Revenue
  const { data: paidPayments } = await supabase
    .from("consulting_payments")
    .select("gross_amount,paid_at")
    .eq("consulting_company_id", companyId)
    .eq("status", "paid");

  const paid = (paidPayments ?? []) as unknown as { gross_amount: number; paid_at: string | null }[];
  const totalRevenue = paid.reduce((s, p) => s + Number(p.gross_amount), 0);
  const monthlyRevenue = paid
    .filter((p) => p.paid_at && new Date(p.paid_at) >= startOfMonth)
    .reduce((s, p) => s + Number(p.gross_amount), 0);
  const annualRevenue = paid
    .filter((p) => p.paid_at && new Date(p.paid_at) >= startOfYear)
    .reduce((s, p) => s + Number(p.gross_amount), 0);

  return {
    totalClients: totalClients ?? 0,
    newThisWeek: newThisWeek ?? 0,
    newThisMonth: newThisMonth ?? 0,
    activeApplications: activeApplications ?? 0,
    successfulClients: successfulClients ?? 0,
    unsuccessfulClients: unsuccessfulClients ?? 0,
    pendingClients: pendingClients ?? 0,
    totalRevenue,
    monthlyRevenue,
    annualRevenue,
    previousTotalClients: 0,
    previousNewThisWeek: previousNewThisWeek ?? 0,
    previousNewThisMonth: previousNewThisMonth ?? 0,
  };
}

/** Monthly aggregation for the last N months (clients + revenue). */
export async function fetchMonthlySeries(
  companyId: string,
  months = 6,
): Promise<{ label: string; clients: number; revenue: number }[]> {
  const out: { label: string; clients: number; revenue: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = start.toLocaleDateString("en-US", { month: "short" });

    const { count: clients } = await supabase
      .from("consulting_clients")
      .select("*", { count: "exact", head: true })
      .eq("consulting_company_id", companyId)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());

    const { data: pays } = await supabase
      .from("consulting_payments")
      .select("gross_amount,paid_at")
      .eq("consulting_company_id", companyId)
      .eq("status", "paid")
      .gte("paid_at", start.toISOString())
      .lt("paid_at", end.toISOString());

    const revenue = ((pays ?? []) as unknown as { gross_amount: number }[]).reduce(
      (s, p) => s + Number(p.gross_amount),
      0,
    );

    out.push({ label, clients: clients ?? 0, revenue });
  }
  return out;
}

/** Group clients by a field for chart rendering. */
export async function fetchClientGroupBy(
  companyId: string,
  field: "service_id" | "destination_country" | "assigned_employee_id",
): Promise<{ label: string; count: number }[]> {
  const { data, error } = await supabase
    .from("consulting_clients")
    .select(`${field}, service:services!consulting_clients_service_id_fkey(title)`)
    .eq("consulting_company_id", companyId)
    .eq("is_archived", false);

  if (error) {
    console.error("fetchClientGroupBy error:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const buckets = new Map<string, number>();
  for (const row of rows) {
    const value = row[field];
    let label = "Unassigned";
    if (field === "service_id" && value) {
      label = (row.service as { title?: string } | null)?.title ?? "Unknown service";
    } else if (value) {
      label = String(value);
    }
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/** Application status distribution. */
export async function fetchApplicationStatusDistribution(
  companyId: string,
): Promise<{ status: ApplicationStatus; count: number }[]> {
  const { data, error } = await supabase
    .from("consulting_applications")
    .select("status")
    .eq("consulting_company_id", companyId);
  if (error) {
    console.error("fetchApplicationStatusDistribution error:", error);
    return [];
  }
  const rows = (data ?? []) as unknown as { status: ApplicationStatus }[];
  const buckets = new Map<ApplicationStatus, number>();
  for (const r of rows) {
    buckets.set(r.status, (buckets.get(r.status) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([status, count]) => ({ status, count }));
}

/* ============================================================
   Phase 5 — Employees, Activity Logs, Analytics
   ============================================================ */

// ── Activity log ─────────────────────────────────────────────

export interface ConsultingActivityLog {
  id: string;
  consulting_company_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Json;
  created_at: string;
  actor?: { name: string | null; avatar_url: string | null } | null;
}

/** Append an activity log row. RLS: members only. */
export async function logActivity(
  companyId: string,
  actorId: string | null,
  action: string,
  entityType?: string | null,
  entityId?: string | null,
  metadata?: Record<string, unknown> | null,
): Promise<boolean> {
  const { error } = await supabase.from("consulting_activity_logs").insert({
    consulting_company_id: companyId,
    actor_id: actorId,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    metadata: (metadata ?? {}) as unknown as Json,
  });
  if (error) {
    console.error("logActivity error:", error);
    return false;
  }
  return true;
}

export async function fetchActivityLogs(
  companyId: string,
  opts: { action?: string; actorId?: string; startDate?: string; endDate?: string; limit?: number } = {},
): Promise<ConsultingActivityLog[]> {
  let query = supabase
    .from("consulting_activity_logs")
    .select("*, actor:profiles!consulting_activity_logs_actor_id_fkey(name,avatar_url)")
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });
  if (opts.action) query = query.eq("action", opts.action);
  if (opts.actorId) query = query.eq("actor_id", opts.actorId);
  if (opts.startDate) query = query.gte("created_at", opts.startDate);
  if (opts.endDate) query = query.lt("created_at", opts.endDate);
  if (opts.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) {
    console.error("fetchActivityLogs error:", error);
    return [];
  }
  return (data ?? []) as unknown as ConsultingActivityLog[];
}

// ── Employee stats (per-employee performance aggregations) ──────

export interface EmployeeStats {
  member_id: string;
  consulting_company_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  active_clients: number;
  total_clients: number;
  successful_clients: number;
  unsuccessful_clients: number;
  revenue_generated: number;
  success_rate: number;
  last_active_at: string | null;
  created_at: string;
  /** Joined from profiles */
  profile?: { name: string | null; email: string | null; avatar_url: string | null } | null;
}

/** Compute employee stats by aggregating clients + payments in JS. */
export async function fetchEmployeeStats(companyId: string): Promise<EmployeeStats[]> {
  const { data: members, error: mErr } = await supabase
    .from("consulting_members")
    .select("*, profile:profiles!consulting_members_user_id_fkey(name,email,avatar_url)")
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: true });
  if (mErr) {
    console.error("fetchEmployeeStats members error:", mErr);
    return [];
  }

  const { data: clients, error: cErr } = await supabase
    .from("consulting_clients")
    .select("id, assigned_employee_id, final_result, is_archived")
    .eq("consulting_company_id", companyId);
  if (cErr) console.error("fetchEmployeeStats clients error:", cErr);

  const { data: payments, error: pErr } = await supabase
    .from("consulting_payments")
    .select("client_id, gross_amount, status")
    .eq("consulting_company_id", companyId)
    .eq("status", "paid");
  if (pErr) console.error("fetchEmployeeStats payments error:", pErr);

  const clientList = (clients ?? []) as unknown as {
    id: string;
    assigned_employee_id: string | null;
    final_result: FinalResult | null;
    is_archived: boolean;
  }[];
  const paymentList = (payments ?? []) as unknown as {
    client_id: string | null;
    gross_amount: number;
  }[];

  // Map client_id -> revenue
  const revenueByClient = new Map<string, number>();
  for (const p of paymentList) {
    if (!p.client_id) continue;
    revenueByClient.set(p.client_id, (revenueByClient.get(p.client_id) ?? 0) + Number(p.gross_amount));
  }

  return ((members ?? []) as unknown as ConsultingMember[]).map((m) => {
    const myClients = clientList.filter((c) => c.assigned_employee_id === m.user_id);
    const totalClients = myClients.length;
    const activeClients = myClients.filter((c) => !c.is_archived).length;
    const successful = myClients.filter((c) => c.final_result === "success").length;
    const unsuccessful = myClients.filter((c) => c.final_result === "unsuccessful").length;
    const decided = successful + unsuccessful;
    const revenue = myClients.reduce((sum, c) => sum + (revenueByClient.get(c.id) ?? 0), 0);
    const successRate = decided === 0 ? 0 : Math.round((successful / decided) * 1000) / 10;
    return {
      member_id: m.id,
      consulting_company_id: m.consulting_company_id,
      user_id: m.user_id,
      role: m.role,
      status: m.status,
      active_clients: activeClients,
      total_clients: totalClients,
      successful_clients: successful,
      unsuccessful_clients: unsuccessful,
      revenue_generated: revenue,
      success_rate: successRate,
      last_active_at: m.last_active_at,
      created_at: m.created_at,
      profile: (m as ConsultingMember & { profile?: { name: string | null; email: string | null; avatar_url: string | null } | null }).profile ?? null,
    };
  });
}

// ── Remove employee (sets status to 'removed') ────────────────────

export async function removeMember(memberId: string): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_members")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("id", memberId);
  if (error) {
    console.error("removeMember error:", error);
    return false;
  }
  return true;
}

// ── Assign a client to an employee (or unassign with null) ─────────

export async function assignClientToEmployee(
  clientId: string,
  employeeId: string | null,
): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_clients")
    .update({
      assigned_employee_id: employeeId,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);
  if (error) {
    console.error("assignClientToEmployee error:", error);
    return false;
  }
  return true;
}

// ── Date-range analytics ───────────────────────────────────────────

export type DateRangePreset =
  | "today"
  | "week"
  | "month"
  | "3months"
  | "year"
  | "custom";

export interface DateRange {
  start: string; // ISO
  end: string;   // ISO
  preset: DateRangePreset;
}

export function resolveDateRange(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
): DateRange {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);
  switch (preset) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "3months":
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "custom":
      if (customStart) start = new Date(customStart);
      if (customEnd) end.setTime(new Date(customEnd).getTime());
      break;
  }
  return { start: start.toISOString(), end: end.toISOString(), preset };
}

export interface AnalyticsStats {
  totalClients: number;
  newClientsPeriod: number;
  activeApplications: number;
  successfulClients: number;
  unsuccessfulClients: number;
  pendingClients: number;
  monthlyRevenue: number;
  annualRevenue: number;
  totalRevenue: number;
  successRate: number;
}

/** Fetch analytics stats, optionally constrained to a date range. */
export async function fetchAnalyticsStats(
  companyId: string,
  range?: DateRange,
): Promise<AnalyticsStats> {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();

  const { count: totalClients } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("is_archived", false);

  let newClientsPeriod = 0;
  if (range) {
    const { count } = await supabase
      .from("consulting_clients")
      .select("*", { count: "exact", head: true })
      .eq("consulting_company_id", companyId)
      .eq("is_archived", false)
      .gte("created_at", range.start)
      .lt("created_at", range.end);
    newClientsPeriod = count ?? 0;
  }

  const { count: activeApplications } = await supabase
    .from("consulting_applications")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .in("status", ["new", "documents", "processing", "submitted"]);

  const { count: successfulClients } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("final_result", "success");

  const { count: unsuccessfulClients } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("final_result", "unsuccessful");

  const { count: pendingClients } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("final_result", "pending");

  const { data: paid } = await supabase
    .from("consulting_payments")
    .select("gross_amount,paid_at")
    .eq("consulting_company_id", companyId)
    .eq("status", "paid");
  const paidList = (paid ?? []) as unknown as { gross_amount: number; paid_at: string | null }[];
  const totalRevenue = paidList.reduce((s, p) => s + Number(p.gross_amount), 0);
  const monthlyRevenue = paidList
    .filter((p) => p.paid_at && new Date(p.paid_at) >= new Date(startOfMonth))
    .reduce((s, p) => s + Number(p.gross_amount), 0);
  const annualRevenue = paidList
    .filter((p) => p.paid_at && new Date(p.paid_at) >= new Date(startOfYear))
    .reduce((s, p) => s + Number(p.gross_amount), 0);

  const decided = (successfulClients ?? 0) + (unsuccessfulClients ?? 0);
  const successRate = decided === 0 ? 0 : Math.round(((successfulClients ?? 0) / decided) * 1000) / 10;

  return {
    totalClients: totalClients ?? 0,
    newClientsPeriod,
    activeApplications: activeApplications ?? 0,
    successfulClients: successfulClients ?? 0,
    unsuccessfulClients: unsuccessfulClients ?? 0,
    pendingClients: pendingClients ?? 0,
    monthlyRevenue,
    annualRevenue,
    totalRevenue,
    successRate,
  };
}

/** Monthly series (clients + revenue) optionally bounded by a range. */
export async function fetchAnalyticsMonthlySeries(
  companyId: string,
  months = 6,
): Promise<{ label: string; clients: number; revenue: number; success: number; unsuccessful: number }[]> {
  const out: { label: string; clients: number; revenue: number; success: number; unsuccessful: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = start.toLocaleDateString("en-US", { month: "short" });

    const { count: clients } = await supabase
      .from("consulting_clients")
      .select("*", { count: "exact", head: true })
      .eq("consulting_company_id", companyId)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());

    const { count: success } = await supabase
      .from("consulting_clients")
      .select("*", { count: "exact", head: true })
      .eq("consulting_company_id", companyId)
      .eq("final_result", "success")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());

    const { count: unsuccessful } = await supabase
      .from("consulting_clients")
      .select("*", { count: "exact", head: true })
      .eq("consulting_company_id", companyId)
      .eq("final_result", "unsuccessful")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());

    const { data: pays } = await supabase
      .from("consulting_payments")
      .select("gross_amount")
      .eq("consulting_company_id", companyId)
      .eq("status", "paid")
      .gte("paid_at", start.toISOString())
      .lt("paid_at", end.toISOString());
    const revenue = ((pays ?? []) as unknown as { gross_amount: number }[]).reduce(
      (s, p) => s + Number(p.gross_amount),
      0,
    );

    out.push({
      label,
      clients: clients ?? 0,
      revenue,
      success: success ?? 0,
      unsuccessful: unsuccessful ?? 0,
    });
  }
  return out;
}

/** Final result distribution (success vs unsuccessful vs pending). */
export async function fetchFinalResultDistribution(
  companyId: string,
): Promise<{ label: string; count: number; color: string }[]> {
  const { count: success } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("final_result", "success");
  const { count: unsuccessful } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("final_result", "unsuccessful");
  const { count: pending } = await supabase
    .from("consulting_clients")
    .select("*", { count: "exact", head: true })
    .eq("consulting_company_id", companyId)
    .eq("final_result", "pending");
  return [
    { label: "Success", count: success ?? 0, color: "#10b981" },
    { label: "Unsuccessful", count: unsuccessful ?? 0, color: "#ef4444" },
    { label: "Pending", count: pending ?? 0, color: "#f59e0b" },
  ];
}

/** Clients grouped by destination country. */
export async function fetchClientsByDestination(
  companyId: string,
): Promise<{ label: string; count: number }[]> {
  const { data, error } = await supabase
    .from("consulting_clients")
    .select("destination_country")
    .eq("consulting_company_id", companyId)
    .eq("is_archived", false);
  if (error) {
    console.error("fetchClientsByDestination error:", error);
    return [];
  }
  const rows = (data ?? []) as unknown as { destination_country: string | null }[];
  const buckets = new Map<string, number>();
  for (const r of rows) {
    const label = r.destination_country ?? "Unspecified";
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/** Employee performance list for charting. */
export async function fetchEmployeePerformance(
  companyId: string,
): Promise<{ label: string; clients: number; successful: number }[]> {
  const stats = await fetchEmployeeStats(companyId);
  return stats
    .filter((s) => s.status !== "removed")
    .map((s) => ({
      label: s.profile?.name ?? "Member",
      clients: s.total_clients,
      successful: s.successful_clients,
    }))
    .sort((a, b) => b.clients - a.clients)
    .slice(0, 8);
}

// ── Storage helper (logos, documents) ───────────────────────

export async function uploadConsultingAsset(
  file: File,
  path: string,
): Promise<string | null> {
  const { url } = await uploadConsultingAssetDetailed(file, path);
  return url;
}

/**
 * Upload to the `consulting` storage bucket and return both the public URL
 * and a human-readable error message (if any).
 * Use this when you need to surface the real Supabase error to the user.
 */
export async function uploadConsultingAssetDetailed(
  file: File,
  path: string,
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from("consulting")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
  if (error) {
    console.error("Tour package upload error:", error);
    return { url: null, error: error.message };
  }
  const { data: publicUrlData } = supabase.storage
    .from("consulting")
    .getPublicUrl(data.path);
  return { url: publicUrlData.publicUrl, error: null };
}

/* ============================================================
   Phase 4 — Package media, public package, client status history
   ============================================================ */

// ── Package media (gallery + video) ─────────────────────────

export interface ConsultingPackageMedia {
  id: string;
  consulting_company_id: string;
  package_id: string;
  kind: "image" | "video";
  url: string;
  title: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchPackageMedia(packageId: string): Promise<ConsultingPackageMedia[]> {
  const { data, error } = await supabase
    .from("consulting_package_media")
    .select("*")
    .eq("package_id", packageId)
    .order("position", { ascending: true });
  if (error) {
    console.error("fetchPackageMedia error:", error);
    return [];
  }
  return (data ?? []) as unknown as ConsultingPackageMedia[];
}

export async function addPackageMedia(
  companyId: string,
  packageId: string,
  input: { kind: "image" | "video"; url: string; title?: string | null; position?: number },
  createdBy: string,
): Promise<ConsultingPackageMedia | null> {
  const { data, error } = await supabase
    .from("consulting_package_media")
    .insert({
      consulting_company_id: companyId,
      package_id: packageId,
      kind: input.kind,
      url: input.url,
      title: input.title ?? null,
      position: input.position ?? 0,
      created_by: createdBy,
    })
    .select("*")
    .single();
  if (error) {
    console.error("addPackageMedia error:", error);
    return null;
  }
  return data as unknown as ConsultingPackageMedia;
}

export async function removePackageMedia(mediaId: string): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_package_media")
    .delete()
    .eq("id", mediaId);
  if (error) {
    console.error("removePackageMedia error:", error);
    return false;
  }
  return true;
}

export async function clearPackageMedia(packageId: string): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_package_media")
    .delete()
    .eq("package_id", packageId);
  if (error) {
    console.error("clearPackageMedia error:", error);
    return false;
  }
  return true;
}

// ── Public package fetch (published-gated) ─────────────────

export async function fetchPublicPackage(packageId: string): Promise<{
  pkg: ConsultingPackage | null;
  media: ConsultingPackageMedia[];
  company: ConsultingCompany | null;
}> {
  const { data, error } = await supabase
    .from("consulting_packages")
    .select(
      "*, service:services!consulting_packages_service_id_fkey(id,title,description,cover_image,price,currency,category,is_active), consulting_companies!consulting_packages_consulting_company_id_fkey(*)",
    )
    .eq("id", packageId)
    .maybeSingle();
  if (error) console.error("fetchPublicPackage error:", error);
  const pkg = data as unknown as ConsultingPackage & {
    consulting_companies?: ConsultingCompany;
  } | null;
  if (!pkg || !pkg.is_published) {
    return { pkg: null, media: [], company: null };
  }
  const media = await fetchPackageMedia(packageId);
  const company = (pkg.consulting_companies as ConsultingCompany | undefined) ?? null;
  // Strip joined company to keep ConsultingPackage shape.
  const { ...pkgClean } = pkg;
  delete (pkgClean as { consulting_companies?: unknown }).consulting_companies;
  return { pkg: pkgClean as ConsultingPackage, media, company };
}

// ── Package publish/unpublish ───────────────────────────────

export async function setPackagePublished(
  packageId: string,
  published: boolean,
): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_packages")
    .update({ is_published: published, updated_at: new Date().toISOString() })
    .eq("id", packageId);
  if (error) {
    console.error("setPackagePublished error:", error);
    return false;
  }
  return true;
}

// ── Client status history ───────────────────────────────────

export interface ConsultingClientStatusHistory {
  id: string;
  consulting_company_id: string;
  client_id: string;
  previous_status: ClientApplicationStatus | null;
  new_status: ClientApplicationStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
  changed_by_profile?: { name: string | null; avatar_url: string | null } | null;
}

export async function fetchClientStatusHistory(
  clientId: string,
): Promise<ConsultingClientStatusHistory[]> {
  const { data, error } = await supabase
    .from("consulting_client_status_history")
    .select("*, changed_by_profile:profiles!consulting_client_status_history_changed_by_fkey(name,avatar_url)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchClientStatusHistory error:", error);
    return [];
  }
  return (data ?? []) as unknown as ConsultingClientStatusHistory[];
}

/** Update client application status and append a status-history entry. */
export async function updateClientStatus(
  clientId: string,
  companyId: string,
  newStatus: ClientApplicationStatus,
  changedBy: string,
  note?: string,
): Promise<{ ok: boolean; error: string | null }> {
  // Fetch current status first.
  const { data: current, error: fetchErr } = await supabase
    .from("consulting_clients")
    .select("application_status")
    .eq("id", clientId)
    .maybeSingle();
  if (fetchErr) {
    return { ok: false, error: fetchErr.message };
  }
  const previous = (current as { application_status: ClientApplicationStatus } | null)?.application_status ?? null;
  if (previous === newStatus) return { ok: true, error: null };

  const { error: updateErr } = await supabase
    .from("consulting_clients")
    .update({ application_status: newStatus, last_activity_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", clientId);
  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  const { error: histErr } = await supabase.from("consulting_client_status_history").insert({
    consulting_company_id: companyId,
    client_id: clientId,
    previous_status: previous,
    new_status: newStatus,
    changed_by: changedBy,
    note: note ?? null,
  });
  if (histErr) console.error("updateClientStatus history error:", histErr);

  return { ok: true, error: null };
}

// ── Duplicate a package (service + package + media) ─────────

export async function duplicatePackage(
  source: ConsultingPackage,
  companyId: string,
  createdBy: string,
): Promise<ConsultingPackage | null> {
  if (!source.service_id) return null;
  // 1. Duplicate the linked service row.
  const { data: svc, error: svcErr } = await supabase
    .from("services")
    .insert({
      consulting_id: companyId,
      title: `${source.service?.title ?? "Package"} (Copy)`,
      description: source.service?.description ?? "",
      category: source.service?.category ?? "General",
      price: source.service?.price ?? 0,
      currency: source.service?.currency ?? "USD",
      cover_image: source.service?.cover_image ?? null,
      is_active: false,
    })
    .select("*")
    .single();
  if (svcErr || !svc) {
    console.error("duplicatePackage service insert error:", svcErr);
    return null;
  }
  const newServiceId = (svc as { id: string }).id;

  // 2. Duplicate the consulting_packages row.
  const newPkg = await upsertPackage(
    companyId,
    newServiceId,
    {
      destination_country: source.destination_country,
      estimated_processing_time: source.estimated_processing_time,
      included_services: source.included_services,
      required_documents: source.required_documents,
      what_client_receives: source.what_client_receives,
      who_this_is_for: source.who_this_is_for,
      refund_conditions: source.refund_conditions,
      contact_info: source.contact_info,
      available_slots: source.available_slots,
      faq: source.faq,
      is_published: false,
    },
    createdBy,
  );
  if (!newPkg) return null;

  // 3. Copy media.
  const media = await fetchPackageMedia(source.id);
  for (const m of media) {
    await addPackageMedia(companyId, newPkg.id, { kind: m.kind, url: m.url, title: m.title, position: m.position }, createdBy);
  }

  return newPkg;
}

/* ============================================================
   Multi-Agency Workspace — Types + Data Access
   Reuses consulting_members (unique per company+user) for
   multi-agency membership. Adds agency_code lookup, join
   requests, and workspace management.
   ============================================================ */

// ── Agency join request ─────────────────────────────────────

export type JoinRequestStatus = "pending" | "approved" | "rejected";
export type JoinRequestRole = "admin" | "manager" | "employee";

export interface AgencyJoinRequest {
  id: string;
  agency_id: string;
  user_id: string;
  requested_role: JoinRequestRole;
  status: JoinRequestStatus;
  message: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  /** Joined profile fields */
  user?: { name: string | null; email: string | null; avatar_url: string | null } | null;
}

// ── Agency with membership info (for workspace lists) ───────

export interface AgencyMembership {
  company: ConsultingCompany;
  member: ConsultingMember;
}

/** Fetch ALL agencies the current user owns.
 *  Ownership is determined by consulting_companies.owner_id (no consulting_members table).
 *  One user can own multiple agencies — uses a list query, never .single(). */
export async function fetchUserAgencies(
  userId: string,
): Promise<AgencyMembership[]> {
  const { data: companies, error: cErr } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("owner_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (cErr) {
    console.error("fetchUserAgencies error:", cErr);
    return [];
  }
  if (!companies || companies.length === 0) return [];

  // Synthesize owner member objects (no consulting_members table exists)
  return (companies as unknown as ConsultingCompany[]).map((company) => ({
    company,
    member: {
      id: `owner-${company.id}`,
      consulting_company_id: company.id,
      user_id: userId,
      role: "owner" as MemberRole,
      status: "active" as MemberStatus,
      invited_by: null,
      last_active_at: null,
      created_at: company.created_at,
      updated_at: company.updated_at,
      profile: null,
    } as ConsultingMember,
  }));
}

/** Fetch a single agency by ID (for active agency context). */
export async function fetchAgencyById(
  agencyId: string,
): Promise<ConsultingCompany | null> {
  const { data, error } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("id", agencyId)
    .maybeSingle();
  if (error) console.error("fetchAgencyById error:", error);
  return data as unknown as ConsultingCompany | null;
}

/** Fetch membership for a specific user+agency pair.
 *  Checks ownership via consulting_companies.owner_id (no consulting_members table). */
export async function fetchMembership(
  userId: string,
  agencyId: string,
): Promise<ConsultingMember | null> {
  const { data, error } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("id", agencyId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) console.error("fetchMembership error:", error);
  if (!data) return null;
  const company = data as unknown as ConsultingCompany;
  return {
    id: `owner-${company.id}`,
    consulting_company_id: company.id,
    user_id: userId,
    role: "owner" as MemberRole,
    status: "active" as MemberStatus,
    invited_by: null,
    last_active_at: null,
    created_at: company.created_at,
    updated_at: company.updated_at,
    profile: null,
  } as ConsultingMember;
}

/** Look up an agency by its public agency code (for joining). */
export async function findAgencyByCode(
  code: string,
): Promise<{
  agency: Pick<
    ConsultingCompany,
    "id" | "name" | "logo_url" | "city" | "country" | "agency_code"
  > | null;
  error: string | null;
}> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return { agency: null, error: "Enter an agency code." };
  const { data, error } = await supabase
    .from("consulting_companies")
    .select("id, name, logo_url, city, country, agency_code")
    .eq("agency_code", cleanCode)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    console.error("findAgencyByCode error:", error);
    return { agency: null, error: error.message };
  }
  if (!data) {
    return { agency: null, error: "No agency found with that code." };
  }
  return { agency: data as unknown as ConsultingCompany, error: null };
}

/** Request to join an agency (creates a pending join request). */
export async function requestJoinAgency(
  input: {
    agencyId: string;
    userId: string;
    requestedRole: JoinRequestRole;
    message?: string;
  },
): Promise<{ ok: boolean; error: string | null }> {
  // Check if already a member
  const existing = await fetchMembership(input.userId, input.agencyId);
  if (existing && existing.status === "active") {
    return { ok: false, error: "You are already a member of this agency." };
  }

  // Check if already has a pending request
  const { data: existingReq } = await supabase
    .from("agency_join_requests")
    .select("id, status")
    .eq("agency_id", input.agencyId)
    .eq("user_id", input.userId)
    .eq("status", "pending")
    .maybeSingle();
  if (existingReq) {
    return { ok: false, error: "You already have a pending request for this agency." };
  }

  const { error } = await supabase.from("agency_join_requests").insert({
    agency_id: input.agencyId,
    user_id: input.userId,
    requested_role: input.requestedRole,
    message: input.message ?? null,
    status: "pending",
  });
  if (error) {
    console.error("requestJoinAgency error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

/** Fetch join requests for an agency (owner/admin view). */
export async function fetchJoinRequests(
  agencyId: string,
): Promise<AgencyJoinRequest[]> {
  const { data, error } = await supabase
    .from("agency_join_requests")
    .select("*, user:profiles!agency_join_requests_user_id_fkey(name,email,avatar_url)")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (error) console.error("fetchJoinRequests error:", error);
  return (data ?? []) as unknown as AgencyJoinRequest[];
}

/** Fetch the current user's join requests (all agencies). */
export async function fetchMyJoinRequests(
  userId: string,
): Promise<AgencyJoinRequest[]> {
  const { data, error } = await supabase
    .from("agency_join_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) console.error("fetchMyJoinRequests error:", error);
  return (data ?? []) as unknown as AgencyJoinRequest[];
}

/** Approve a join request — marks request approved.
 *  Team member architecture (consulting_members) will be added separately.
 *  For now, the join request approval is recorded so the owner can track it. */
export async function approveJoinRequest(
  requestId: string,
  reviewerId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { data: req, error: fErr } = await supabase
    .from("agency_join_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (fErr || !req) {
    return { ok: false, error: "Join request not found." };
  }

  // Mark request approved
  const { error: uErr } = await supabase
    .from("agency_join_requests")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (uErr) {
    console.error("approveJoinRequest update error:", uErr);
    return { ok: false, error: uErr.message };
  }

  return { ok: true, error: null };
}

/** Reject a join request. */
export async function rejectJoinRequest(
  requestId: string,
  reviewerId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from("agency_join_requests")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (error) {
    console.error("rejectJoinRequest error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

/** Generate a unique 6-character agency code (uppercase, no ambiguous chars like O/0, I/1). */
async function generateUniqueAgencyCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const { data: existing } = await supabase
      .from("consulting_companies")
      .select("id")
      .eq("agency_code", code)
      .maybeSingle();
    if (!existing) return code;
  }
  // Extremely unlikely fallback — 8 chars
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Create a new agency — the creator becomes the owner via owner_id.
 *  Generates a unique agency_code before insert.
 *  No consulting_members table — ownership is via consulting_companies.owner_id. */
export async function createNewAgency(
  input: {
    ownerId: string;
    name: string;
    legalName?: string | null;
    logoUrl?: string | null;
    country?: string;
    city?: string;
    // Optional fields (not asked during creation, but supported for programmatic use)
    contactPhone?: string | null;
    contactEmail?: string | null;
    whatsapp?: string | null;
    telegram?: string | null;
    instagram?: string | null;
    description?: string | null;
    shortDescription?: string | null;
    foundedYear?: number | null;
    address?: string | null;
    agencyPhotos?: string[] | null;
    licenseNumber?: string | null;
    licenseIssuingOrg?: string | null;
  },
): Promise<{ company: ConsultingCompany | null; error: string | null }> {
  // Build social_links from individual inputs (if provided)
  const socialLinks: Record<string, string> = {};
  if (input.instagram) socialLinks.instagram = input.instagram;
  if (input.telegram) socialLinks.telegram = input.telegram;

  // Generate a unique agency code before creating the company
  const agencyCode = await generateUniqueAgencyCode();

  // Create the company with owner_id + agency_code
  const { data: company, error: cErr } = await supabase
    .from("consulting_companies")
    .insert({
      owner_id: input.ownerId,
      name: input.name,
      legal_name: input.legalName ?? null,
      logo_url: input.logoUrl ?? null,
      country: input.country || null,
      city: input.city || null,
      agency_code: agencyCode,
      contact_phone: input.contactPhone ?? null,
      contact_email: input.contactEmail ?? null,
      whatsapp: input.whatsapp ?? null,
      telegram: input.telegram ?? null,
      social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
      description: input.description ?? null,
      short_description: input.shortDescription ?? null,
      founded_year: input.foundedYear ?? null,
      address: input.address ?? null,
      agency_photos: input.agencyPhotos ?? null,
      license_number: input.licenseNumber ?? null,
      license_issuing_org: input.licenseIssuingOrg ?? null,
      verification_status: "not_submitted",
      is_published: false,
      is_active: true,
      subscription_status: "active",
      subscription_plan: "monthly",
      subscription_start_date: new Date().toISOString(),
      subscription_end_date: computeEndDate(new Date(), "monthly").toISOString(),
    })
    .select("*")
    .single();
  if (cErr || !company) {
    console.error("createNewAgency error:", cErr);
    return { company: null, error: cErr?.message ?? "Failed to create agency" };
  }

  // No consulting_members table — ownership is via owner_id column.
  // The creator is the owner by virtue of owner_id = input.ownerId.
  return { company: company as ConsultingCompany, error: null };
}

/** Leave an agency. Owners cannot leave — they must deactivate instead.
 *  Does NOT delete the agency. */
export async function leaveAgency(
  userId: string,
  agencyId: string,
): Promise<{ ok: boolean; error: string | null }> {
  // Check if user is the owner via consulting_companies.owner_id
  const { data: company } = await supabase
    .from("consulting_companies")
    .select("id, owner_id")
    .eq("id", agencyId)
    .maybeSingle();

  if (company?.owner_id === userId) {
    return {
      ok: false,
      error: "You are the owner of this agency. Deactivate the agency instead of leaving.",
    };
  }

  // For non-owners, try consulting_members (if it exists in the future)
  const { error } = await supabase
    .from("consulting_members")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("consulting_company_id", agencyId);
  if (error) {
    console.error("leaveAgency error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

/** Deactivate an agency (soft delete — owner only). */
export async function deactivateAgency(
  agencyId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from("consulting_companies")
    .update({
      is_active: false,
      is_published: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agencyId);
  if (error) {
    console.error("deactivateAgency error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}
