import { supabase } from "@/lib/supabase";
import {
  computeEndDate,
  CONSULTING_PLANS,
  getPlan,
  type ConsultingCompany,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "@/lib/consulting";
import type { Json } from "@/integrations/supabase/types";

/* ============================================================
   Owner Admin Panel — Data Access Layer
   ------------------------------------------------
   Private admin module for the two OXEN platform owners.
   Every function requires the caller to be in `owner_admins`
   (enforced server-side by RLS via `is_owner()`).

   Owner emails are NEVER stored in the client bundle. The
   allowlist lives only in the `owner_admins` table (seeded by
   migration 0005). The client checks ownership by calling
   `checkOwnerAccess()` which hits a server-evaluated query.
   ============================================================ */

// ── Owner identity ─────────────────────────────────────────

export interface OwnerIdentity {
  email: string;
  user_id: string | null;
  is_owner: boolean;
}

/**
 * Check if the current authenticated user is an owner.
 * Returns `{ is_owner: false }` for everyone except the two
 * seeded owner accounts. The check is server-side (RLS on
 * `owner_admins` only lets a user read their own row).
 */
export async function checkOwnerAccess(): Promise<OwnerIdentity> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user) {
    return { email: "", user_id: null, is_owner: false };
  }
  const userId = session.session.user.id;
  const email = session.session.user.email ?? "";

  // RLS only returns the row if the email matches
  const { data, error } = await supabase
    .from("owner_admins")
    .select("email, user_id")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("checkOwnerAccess error:", error);
    return { email, user_id: userId, is_owner: false };
  }

  if (!data) return { email, user_id: userId, is_owner: false };

  // Link user_id if not yet linked
  if (!data.user_id) {
    await supabase
      .from("owner_admins")
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq("email", data.email);
  }

  return { email: data.email, user_id: userId, is_owner: true };
}

// ── User management ────────────────────────────────────────

export type AccountStatus =
  | "active"
  | "pending"
  | "suspended"
  | "blocked"
  | "deleted";

export type UserType =
  | "ordinary"
  | "consulting_applicant"
  | "premium_consulting"
  | "owner"
  | "manager"
  | "employee"
  | "cashier";

export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  phone: string | null;
  country: string | null;
  provider: string | null;
  account_status: AccountStatus;
  user_type: UserType;
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  /** Joined: consulting company name (if premium) */
  consulting_company_name?: string | null;
  /** Joined: consulting company id */
  consulting_company_id?: string | null;
}

export interface AdminUserFilters {
  search?: string;
  user_type?: UserType | "all";
  account_status?: AccountStatus | "all";
  /** "today" | "week" | "month" | "all" */
  signup_period?: "today" | "week" | "month" | "all";
  /** Sort: "newest" (default) | "oldest" */
  sort?: "newest" | "oldest";
}

function dateFilter(period: AdminUserFilters["signup_period"]): string | null {
  if (!period || period === "all") return null;
  const now = new Date();
  if (period === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return start.toISOString();
  }
  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  return null;
}

/**
 * Fetch all registered OXEN users (for the Owner Users page).
 * Owner-only — RLS on `profiles` allows owners to read all rows.
 */
export async function fetchAllUsers(
  filters: AdminUserFilters = {},
): Promise<AdminUser[]> {
  let query = supabase
    .from("profiles")
    .select(
      "id, email, name, avatar_url, phone, country, provider, account_status, user_type, last_login_at, created_at, updated_at",
    )
    .order("created_at", { ascending: filters.sort === "oldest" });

  if (filters.user_type && filters.user_type !== "all") {
    query = query.eq("user_type", filters.user_type);
  }
  if (filters.account_status && filters.account_status !== "all") {
    query = query.eq("account_status", filters.account_status);
  }
  if (filters.search?.trim()) {
    query = query.or(
      `name.ilike.%${filters.search.trim()}%,email.ilike.%${filters.search.trim()}%`,
    );
  }
  const since = dateFilter(filters.signup_period);
  if (since) {
    query = query.gte("created_at", since);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchAllUsers error:", error);
    return [];
  }

  const users = (data ?? []) as unknown as AdminUser[];

  // Enrich with consulting company info for premium users
  const premiumUserIds = users
    .filter((u) => u.user_type === "premium_consulting")
    .map((u) => u.id);
  if (premiumUserIds.length > 0) {
    const { data: companies } = await supabase
      .from("consulting_companies")
      .select("id, name, owner_id")
      .in("owner_id", premiumUserIds);
    const companyMap = new Map<string, { id: string; name: string }>();
    for (const c of (companies ?? []) as unknown as { id: string; name: string; owner_id: string }[]) {
      companyMap.set(c.owner_id, { id: c.id, name: c.name });
    }
    for (const u of users) {
      const comp = companyMap.get(u.id);
      if (comp) {
        u.consulting_company_name = comp.name;
        u.consulting_company_id = comp.id;
      }
    }
  }

  return users;
}

/** Update a user's type (owner only — RLS enforced). */
export async function updateUserType(
  userId: string,
  userType: UserType,
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ user_type: userType, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    console.error("updateUserType error:", error);
    return false;
  }
  return true;
}

/** Update a user's account status (owner only). */
export async function updateUserStatus(
  userId: string,
  status: AccountStatus,
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ account_status: status, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    console.error("updateUserStatus error:", error);
    return false;
  }
  return true;
}

/** Add an internal note about a user (owner only). */
export async function addUserNote(
  userId: string,
  ownerId: string,
  note: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("owner_user_notes")
    .insert({ user_id: userId, owner_id: ownerId, note });
  if (error) {
    console.error("addUserNote error:", error);
    return false;
  }
  return true;
}

/** Fetch internal notes for a user (owner only). */
export interface OwnerUserNote {
  id: string;
  user_id: string;
  owner_id: string;
  note: string;
  created_at: string;
}
export async function fetchUserNotes(userId: string): Promise<OwnerUserNote[]> {
  const { data, error } = await supabase
    .from("owner_user_notes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchUserNotes error:", error);
    return [];
  }
  return (data ?? []) as unknown as OwnerUserNote[];
}

// ── Payment requests ───────────────────────────────────────

export type PaymentVerificationStatus =
  | "pending_verification"
  | "confirmed"
  | "rejected"
  | "more_info_required"
  | "refunded"
  | "cancelled";

export interface PaymentRequest {
  id: string;
  consulting_company_id: string | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  user_avatar_url: string | null;
  company_name: string | null;
  company_phone: string | null;
  plan: SubscriptionPlan;
  duration_months: number;
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_date: string | null;
  transaction_reference: string | null;
  receipt_url: string | null;
  application_date: string;
  verification_status: PaymentVerificationStatus;
  owner_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch all payment requests (owner only). */
export async function fetchPaymentRequests(
  status?: PaymentVerificationStatus | "all",
): Promise<PaymentRequest[]> {
  let query = supabase
    .from("owner_payment_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (status && status !== "all") {
    query = query.eq("verification_status", status);
  }
  const { data, error } = await query;
  if (error) {
    console.error("fetchPaymentRequests error:", error);
    return [];
  }
  return (data ?? []) as unknown as PaymentRequest[];
}

/** Create a payment request (submitted by the consulting user themselves). */
export async function createPaymentRequest(
  input: Omit<
    PaymentRequest,
    | "id"
    | "application_date"
    | "verification_status"
    | "owner_notes"
    | "reviewed_by"
    | "reviewed_at"
    | "created_at"
    | "updated_at"
  >,
): Promise<PaymentRequest | null> {
  const { data, error } = await supabase
    .from("owner_payment_requests")
    .insert({
      ...input,
      verification_status: "pending_verification",
    })
    .select("*")
    .single();
  if (error) {
    console.error("createPaymentRequest error:", error);
    return null;
  }
  return data as unknown as PaymentRequest;
}

/** Update a payment request's verification status (owner only). */
export async function updatePaymentRequestStatus(
  requestId: string,
  status: PaymentVerificationStatus,
  ownerId: string,
  notes?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("owner_payment_requests")
    .update({
      verification_status: status,
      owner_notes: notes ?? null,
      reviewed_by: ownerId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (error) {
    console.error("updatePaymentRequestStatus error:", error);
    return false;
  }
  return true;
}

// ── Premium consulting accounts ────────────────────────────

export interface PremiumAccount {
  id: string;
  owner_id: string;
  name: string;
  logo_url: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  subscription_status: SubscriptionStatus | "none";
  subscription_plan: SubscriptionPlan | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  is_published: boolean;
  is_verified: boolean;
  verification_status: string;
  /** Human-friendly unique agency code (e.g. OX-TRV-7K29Q) */
  agency_code: string | null;
  created_at: string;
  updated_at: string;
  /** Joined: owner profile */
  owner_name?: string | null;
  owner_email?: string | null;
  owner_avatar?: string | null;
}

/** Fetch all consulting companies (owner only). */
export async function fetchAllPremiumAccounts(): Promise<PremiumAccount[]> {
  const { data, error } = await supabase
    .from("consulting_companies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchAllPremiumAccounts error:", error);
    return [];
  }
  const companies = (data ?? []) as unknown as PremiumAccount[];

  // Enrich with owner profile info
  const ownerIds = companies.map((c) => c.owner_id);
  if (ownerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url")
      .in("id", ownerIds);
    const profileMap = new Map<
      string,
      { name: string | null; email: string | null; avatar_url: string | null }
    >();
    for (const p of (profiles ?? []) as unknown as {
      id: string;
      name: string | null;
      email: string | null;
      avatar_url: string | null;
    }[]) {
      profileMap.set(p.id, {
        name: p.name,
        email: p.email,
        avatar_url: p.avatar_url,
      });
    }
    for (const c of companies) {
      const p = profileMap.get(c.owner_id);
      if (p) {
        c.owner_name = p.name;
        c.owner_email = p.email;
        c.owner_avatar = p.avatar_url;
      }
    }
  }

  return companies;
}

/** Fetch a single consulting company with full detail (owner only). */
export async function fetchPremiumAccountDetails(
  companyId: string,
): Promise<PremiumAccount | null> {
  const { data, error } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();
  if (error) {
    console.error("fetchPremiumAccountDetails error:", error);
    return null;
  }
  const company = data as unknown as PremiumAccount;
  if (company) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, email, avatar_url")
      .eq("id", company.owner_id)
      .maybeSingle();
    const p = profile as unknown as {
      name: string | null;
      email: string | null;
      avatar_url: string | null;
    } | null;
    if (p) {
      company.owner_name = p.name;
      company.owner_email = p.email;
      company.owner_avatar = p.avatar_url;
    }
  }
  return company;
}

// ── Manual activation ──────────────────────────────────────

export interface ManualActivationInput {
  /** Supabase auth user id (must exist) */
  userId: string;
  userEmail: string;
  userName: string;
  companyName: string;
  companyPhone: string;
  plan: SubscriptionPlan;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionReference: string;
  startDate: string;
  receiptUrl?: string | null;
  note?: string;
  /** Owner performing the action */
  ownerId: string;
  ownerEmail: string;
}

/**
 * Manually activate a Premium Consulting subscription for a
 * registered Google account. Performs the full sequence:
 *   1. Find existing Supabase user by email
 *   2. Link user_id to consulting account
 *   3. Set account role to premium_consulting
 *   4. Create or update consulting company
 *   5. Create subscription record
 *   6. Calculate expiration date
 *   7. Activate dashboard
 *   8. Record which owner performed the action
 *   9. Record activation date + reason
 *  10. Add to Owner Audit Log
 *
 * Returns the activated company or throws on error.
 */
export async function manuallyActivatePremium(
  input: ManualActivationInput,
): Promise<{ company: PremiumAccount | null; error: string | null }> {
  const {
    userId,
    userEmail,
    userName,
    companyName,
    companyPhone,
    plan,
    amount,
    currency,
    paymentMethod,
    transactionReference,
    startDate,
    receiptUrl,
    note,
    ownerId,
    ownerEmail,
  } = input;

  const start = new Date(startDate);
  const end = computeEndDate(start, plan);
  const planInfo = getPlan(plan);

  // 1. Check if user exists in profiles
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, email, name, user_type, account_status")
    .eq("id", userId)
    .maybeSingle();

  const profile = existingProfile as unknown as {
    id: string;
    email: string | null;
    name: string | null;
    user_type: UserType;
    account_status: AccountStatus;
  } | null;

  if (!profile) {
    return {
      company: null,
      error: "Account not registered. The user must sign up first.",
    };
  }

  // 2. Update user_type to premium_consulting
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      user_type: "premium_consulting",
      name: userName || profile.name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (profileErr) {
    return { company: null, error: `Failed to update user: ${profileErr.message}` };
  }

  // 3. Check if company already exists for this owner
  const { data: existingCompany } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();

  let companyId: string;

  if (existingCompany) {
    // 4a. Update existing company
    companyId = (existingCompany as unknown as { id: string }).id;
    const { error: updateErr } = await supabase
      .from("consulting_companies")
      .update({
        name: companyName,
        contact_phone: companyPhone,
        contact_email: userEmail,
        subscription_status: "active",
        subscription_plan: plan,
        subscription_start_date: start.toISOString(),
        subscription_end_date: end.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId);
    if (updateErr) {
      return { company: null, error: `Failed to update company: ${updateErr.message}` };
    }
  } else {
    // 4b. Create new company
    const { data: newCompany, error: createErr } = await supabase
      .from("consulting_companies")
      .insert({
        owner_id: userId,
        name: companyName,
        contact_phone: companyPhone,
        contact_email: userEmail,
        verification_status: "pending",
        subscription_status: "active",
        subscription_plan: plan,
        subscription_start_date: start.toISOString(),
        subscription_end_date: end.toISOString(),
      })
      .select("*")
      .single();
    if (createErr || !newCompany) {
      return { company: null, error: `Failed to create company: ${createErr?.message}` };
    }
    companyId = (newCompany as unknown as { id: string }).id;
  }

  // 5. Create owner member row (if not exists)
  const { data: existingMember } = await supabase
    .from("consulting_members")
    .select("id")
    .eq("consulting_company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!existingMember) {
    await supabase.from("consulting_members").insert({
      consulting_company_id: companyId,
      user_id: userId,
      role: "owner",
      status: "active",
      invited_by: ownerId,
    });
  }

  // 6. Create subscription record
  await supabase.from("consulting_subscriptions").insert({
    consulting_company_id: companyId,
    plan,
    status: "active",
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    auto_renewal: false,
    amount,
    currency,
    created_by: ownerId,
  });

  // 7. Record payment
  await supabase.from("consulting_payments").insert({
    consulting_company_id: companyId,
    transaction_id: transactionReference || `manual_${Date.now()}`,
    type: "subscription",
    gross_amount: amount,
    commission: 0,
    net_amount: amount,
    currency,
    status: "paid",
    paid_at: new Date().toISOString(),
    receipt_url: receiptUrl ?? null,
    created_by: ownerId,
  });

  // 8. Record subscription history
  await supabase.from("owner_subscription_history").insert({
    consulting_company_id: companyId,
    plan,
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    amount,
    currency,
    action_type: "activation",
    performed_by: ownerId,
    performed_by_email: ownerEmail,
    note: note ?? `Manual activation by ${ownerEmail}`,
  });

  // 9. Audit log
  await logOwnerAction(ownerId, ownerEmail, "manual_activation", "company", companyId, {
    user_id: userId,
    user_email: userEmail,
    company_name: companyName,
    plan,
    amount,
    duration_months: planInfo.months,
  });

  // 10. Fetch the final company
  const { data: finalCompany } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("id", companyId)
    .single();
  return { company: finalCompany as unknown as PremiumAccount, error: null };
}

// ── Subscription extension / plan changes ──────────────────

export interface SubscriptionHistoryEntry {
  id: string;
  consulting_company_id: string;
  plan: SubscriptionPlan;
  start_date: string;
  end_date: string;
  amount: number | null;
  currency: string | null;
  action_type:
    | "activation"
    | "extension"
    | "upgrade"
    | "suspension"
    | "reactivation"
    | "cancellation"
    | "plan_change"
    | "custom";
  performed_by: string;
  performed_by_email: string | null;
  note: string | null;
  created_at: string;
}

/** Fetch subscription history for a company (owner only). */
export async function fetchSubscriptionHistory(
  companyId: string,
): Promise<SubscriptionHistoryEntry[]> {
  const { data, error } = await supabase
    .from("owner_subscription_history")
    .select("*")
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchSubscriptionHistory error:", error);
    return [];
  }
  return (data ?? []) as unknown as SubscriptionHistoryEntry[];
}

export type ExtensionDuration = "1month" | "3months" | "1year" | "custom";

function addDuration(start: Date, duration: ExtensionDuration, customDate?: string): Date {
  if (duration === "custom" && customDate) {
    return new Date(customDate);
  }
  const d = new Date(start);
  if (duration === "1month") d.setMonth(d.getMonth() + 1);
  else if (duration === "3months") d.setMonth(d.getMonth() + 3);
  else if (duration === "1year") d.setFullYear(d.getFullYear() + 1);
  return d;
}

/**
 * Extend a subscription. If currently active, adds after the
 * existing end date. If expired, starts from today (or a
 * selected start date).
 */
export async function extendSubscription(
  companyId: string,
  duration: ExtensionDuration,
  ownerId: string,
  ownerEmail: string,
  customStartDate?: string,
  note?: string,
): Promise<{ new_end_date: string | null; error: string | null }> {
  const { data: company } = await supabase
    .from("consulting_companies")
    .select("subscription_end_date, subscription_status, subscription_plan")
    .eq("id", companyId)
    .maybeSingle();

  const c = company as unknown as {
    subscription_end_date: string | null;
    subscription_status: SubscriptionStatus | "none";
    subscription_plan: SubscriptionPlan | null;
  } | null;
  if (!c) return { new_end_date: null, error: "Company not found" };

  const now = new Date();
  const currentEnd = c.subscription_end_date ? new Date(c.subscription_end_date) : now;
  const isExpired = c.subscription_status !== "active" || currentEnd < now;

  // For active subs: extend from current end. For expired: from now or custom.
  const baseDate = isExpired
    ? (customStartDate ? new Date(customStartDate) : now)
    : currentEnd;

  const newEnd = addDuration(baseDate, duration, customStartDate);
  const newStart = isExpired ? (customStartDate ?? now.toISOString()) : c.subscription_end_date!;
  const plan = c.subscription_plan ?? "monthly";
  const planInfo = getPlan(plan);

  const { error: updateErr } = await supabase
    .from("consulting_companies")
    .update({
      subscription_status: "active",
      subscription_end_date: newEnd.toISOString(),
      subscription_start_date: isExpired ? newStart : undefined,
      updated_at: now.toISOString(),
    })
    .eq("id", companyId);
  if (updateErr) {
    return { new_end_date: null, error: updateErr.message };
  }

  // Record history
  await supabase.from("owner_subscription_history").insert({
    consulting_company_id: companyId,
    plan,
    start_date: newStart,
    end_date: newEnd.toISOString(),
    amount: planInfo.price,
    currency: planInfo.currency,
    action_type: "extension",
    performed_by: ownerId,
    performed_by_email: ownerEmail,
    note: note ?? `Extended by ${duration}`,
  });

  await logOwnerAction(ownerId, ownerEmail, "extend_subscription", "company", companyId, {
    duration,
    new_end_date: newEnd.toISOString(),
  });

  return { new_end_date: newEnd.toISOString(), error: null };
}

/** Change the subscription plan (upgrade). */
export async function changeSubscriptionPlan(
  companyId: string,
  newPlan: SubscriptionPlan,
  ownerId: string,
  ownerEmail: string,
  note?: string,
): Promise<{ error: string | null }> {
  const planInfo = getPlan(newPlan);
  const now = new Date();
  const newEnd = computeEndDate(now, newPlan);

  const { error } = await supabase
    .from("consulting_companies")
    .update({
      subscription_plan: newPlan,
      subscription_start_date: now.toISOString(),
      subscription_end_date: newEnd.toISOString(),
      subscription_status: "active",
      updated_at: now.toISOString(),
    })
    .eq("id", companyId);
  if (error) return { error: error.message };

  await supabase.from("consulting_subscriptions").insert({
    consulting_company_id: companyId,
    plan: newPlan,
    status: "active",
    start_date: now.toISOString(),
    end_date: newEnd.toISOString(),
    auto_renewal: false,
    amount: planInfo.price,
    currency: planInfo.currency,
    created_by: ownerId,
  });

  await supabase.from("owner_subscription_history").insert({
    consulting_company_id: companyId,
    plan: newPlan,
    start_date: now.toISOString(),
    end_date: newEnd.toISOString(),
    amount: planInfo.price,
    currency: planInfo.currency,
    action_type: "plan_change",
    performed_by: ownerId,
    performed_by_email: ownerEmail,
    note: note ?? `Plan changed to ${planInfo.name}`,
  });

  await logOwnerAction(ownerId, ownerEmail, "change_plan", "company", companyId, {
    new_plan: newPlan,
    new_end_date: newEnd.toISOString(),
  });

  return { error: null };
}

/** Suspend a consulting account. */
export async function suspendCompany(
  companyId: string,
  ownerId: string,
  ownerEmail: string,
  note?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_companies")
    .update({
      subscription_status: "suspended",
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);
  if (error) {
    console.error("suspendCompany error:", error);
    return false;
  }
  await supabase.from("owner_subscription_history").insert({
    consulting_company_id: companyId,
    plan: "monthly",
    start_date: new Date().toISOString(),
    end_date: new Date().toISOString(),
    action_type: "suspension",
    performed_by: ownerId,
    performed_by_email: ownerEmail,
    note: note ?? "Suspended by owner",
  });
  await logOwnerAction(ownerId, ownerEmail, "suspend_company", "company", companyId, { note });
  return true;
}

/** Reactivate a suspended/expired account. */
export async function reactivateCompany(
  companyId: string,
  ownerId: string,
  ownerEmail: string,
  note?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_companies")
    .update({
      subscription_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);
  if (error) {
    console.error("reactivateCompany error:", error);
    return false;
  }
  await supabase.from("owner_subscription_history").insert({
    consulting_company_id: companyId,
    plan: "monthly",
    start_date: new Date().toISOString(),
    end_date: new Date().toISOString(),
    action_type: "reactivation",
    performed_by: ownerId,
    performed_by_email: ownerEmail,
    note: note ?? "Reactivated by owner",
  });
  await logOwnerAction(ownerId, ownerEmail, "reactivate_company", "company", companyId, { note });
  return true;
}

/** Cancel a subscription (at end of period). */
export async function cancelSubscription(
  companyId: string,
  ownerId: string,
  ownerEmail: string,
  note?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_companies")
    .update({
      subscription_status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);
  if (error) {
    console.error("cancelSubscription error:", error);
    return false;
  }
  await supabase.from("owner_subscription_history").insert({
    consulting_company_id: companyId,
    plan: "monthly",
    start_date: new Date().toISOString(),
    end_date: new Date().toISOString(),
    action_type: "cancellation",
    performed_by: ownerId,
    performed_by_email: ownerEmail,
    note: note ?? "Cancelled by owner",
  });
  await logOwnerAction(ownerId, ownerEmail, "cancel_subscription", "company", companyId, { note });
  return true;
}

/** Set a custom expiration date. */
export async function setCustomExpiration(
  companyId: string,
  newEndDate: string,
  ownerId: string,
  ownerEmail: string,
  note?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_companies")
    .update({
      subscription_end_date: newEndDate,
      subscription_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);
  if (error) {
    console.error("setCustomExpiration error:", error);
    return false;
  }
  await supabase.from("owner_subscription_history").insert({
    consulting_company_id: companyId,
    plan: "monthly",
    start_date: new Date().toISOString(),
    end_date: newEndDate,
    action_type: "custom",
    performed_by: ownerId,
    performed_by_email: ownerEmail,
    note: note ?? `Custom expiration set to ${newEndDate}`,
  });
  await logOwnerAction(ownerId, ownerEmail, "set_custom_expiration", "company", companyId, {
    new_end_date: newEndDate,
  });
  return true;
}

// ── Audit log ──────────────────────────────────────────────

export interface OwnerAuditLog {
  id: string;
  owner_id: string;
  owner_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Json;
  // Enhanced fields (migration 0006)
  previous_value: Json | null;
  new_value: Json | null;
  reason: string | null;
  target_user_id: string | null;
  target_company_id: string | null;
  target_label: string | null;
  client_ip: string | null;
  user_agent: string | null;
  created_at: string;
}

/** Audit log context — optional enhanced fields for sensitive actions. */
export interface AuditContext {
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string | null;
  targetUserId?: string | null;
  targetCompanyId?: string | null;
  targetLabel?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}

/**
 * Record an owner action in the audit log.
 * Audit records are append-only (no UPDATE or DELETE via RLS) —
 * migration 0006 removed update/delete policies so entries are
 * permanent and tamper-evident.
 */
export async function logOwnerAction(
  ownerId: string,
  ownerEmail: string,
  action: string,
  entityType?: string | null,
  entityId?: string | null,
  metadata?: Record<string, unknown> | null,
  ctx?: AuditContext,
): Promise<void> {
  await supabase.from("owner_audit_logs").insert({
    owner_id: ownerId,
    owner_email: ownerEmail,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    metadata: metadata ?? {},
    previous_value: (ctx?.previousValue ?? null) as Json | null,
    new_value: (ctx?.newValue ?? null) as Json | null,
    reason: ctx?.reason ?? null,
    target_user_id: ctx?.targetUserId ?? null,
    target_company_id: ctx?.targetCompanyId ?? null,
    target_label: ctx?.targetLabel ?? null,
    client_ip: ctx?.clientIp ?? null,
    user_agent: ctx?.userAgent ?? null,
  });
}

/** Fetch audit logs (owner only). */
export async function fetchAuditLogs(limit = 100): Promise<OwnerAuditLog[]> {
  const { data, error } = await supabase
    .from("owner_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("fetchAuditLogs error:", error);
    return [];
  }
  return (data ?? []) as unknown as OwnerAuditLog[];
}

// ── Dashboard analytics ────────────────────────────────────

export interface OwnerDashboardStats {
  // User stats
  totalAccounts: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalOrdinaryUsers: number;
  totalConsultingApplicants: number;
  totalConsultingAccounts: number;
  totalActivePremium: number;
  totalExpiredSubscriptions: number;
  pendingConsultingApprovals: number;
  // Revenue
  totalSubscriptionRevenue: number;
  revenueThisMonth: number;
  revenueThisYear: number;
  // Subscription summary
  activeMonthly: number;
  activeQuarterly: number;
  activeAnnual: number;
  expiringWithin7Days: number;
  expiringWithin30Days: number;
  cancelledSubscriptions: number;
  suspendedAccounts: number;
}

/**
 * Fetch real platform-wide analytics for the Owner Dashboard.
 * Returns zeros when no data — never fake values.
 */
export async function fetchOwnerDashboardStats(): Promise<OwnerDashboardStats> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const empty: OwnerDashboardStats = {
    totalAccounts: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    totalOrdinaryUsers: 0,
    totalConsultingApplicants: 0,
    totalConsultingAccounts: 0,
    totalActivePremium: 0,
    totalExpiredSubscriptions: 0,
    pendingConsultingApprovals: 0,
    totalSubscriptionRevenue: 0,
    revenueThisMonth: 0,
    revenueThisYear: 0,
    activeMonthly: 0,
    activeQuarterly: 0,
    activeAnnual: 0,
    expiringWithin7Days: 0,
    expiringWithin30Days: 0,
    cancelledSubscriptions: 0,
    suspendedAccounts: 0,
  };

  try {
    // Profile counts — run in parallel
    const [
      totalRes,
      todayRes,
      weekRes,
      monthRes,
      ordinaryRes,
      applicantRes,
      premiumRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfToday.toISOString()),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfWeek.toISOString()),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString()),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_type", "ordinary"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_type", "consulting_applicant"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_type", "premium_consulting"),
    ]);

    // Company counts
    const [activePremiumRes, expiredRes, cancelledRes, suspendedRes] = await Promise.all([
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "active"),
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "expired"),
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "cancelled"),
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "suspended"),
    ]);

    // Plan breakdown
    const [monthlyRes, quarterlyRes, annualRes] = await Promise.all([
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "active")
        .eq("subscription_plan", "monthly"),
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "active")
        .eq("subscription_plan", "quarterly"),
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "active")
        .eq("subscription_plan", "annual"),
    ]);

    // Expiring soon (active + end_date within 7/30 days)
    const [expiring7Res, expiring30Res] = await Promise.all([
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "active")
        .gte("subscription_end_date", now.toISOString())
        .lte("subscription_end_date", in7Days.toISOString()),
      supabase
        .from("consulting_companies")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "active")
        .gte("subscription_end_date", now.toISOString())
        .lte("subscription_end_date", in30Days.toISOString()),
    ]);

    // Pending payment approvals
    const pendingRes = await supabase
      .from("owner_payment_requests")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "pending_verification");

    // Revenue from consulting_payments (type=subscription, status=paid)
    const { data: paidPayments } = await supabase
      .from("consulting_payments")
      .select("gross_amount, paid_at, currency")
      .eq("type", "subscription")
      .eq("status", "paid");

    const paid = (paidPayments ?? []) as unknown as {
      gross_amount: number;
      paid_at: string | null;
      currency: string;
    }[];
    const totalRevenue = paid.reduce((s, p) => s + Number(p.gross_amount), 0);
    const monthRevenue = paid
      .filter((p) => p.paid_at && new Date(p.paid_at) >= startOfMonth)
      .reduce((s, p) => s + Number(p.gross_amount), 0);
    const yearRevenue = paid
      .filter((p) => p.paid_at && new Date(p.paid_at) >= startOfYear)
      .reduce((s, p) => s + Number(p.gross_amount), 0);

    return {
      totalAccounts: totalRes.count ?? 0,
      newUsersToday: todayRes.count ?? 0,
      newUsersThisWeek: weekRes.count ?? 0,
      newUsersThisMonth: monthRes.count ?? 0,
      totalOrdinaryUsers: ordinaryRes.count ?? 0,
      totalConsultingApplicants: applicantRes.count ?? 0,
      totalConsultingAccounts: (activePremiumRes.count ?? 0) + (expiredRes.count ?? 0),
      totalActivePremium: premiumRes.count ?? 0,
      totalExpiredSubscriptions: expiredRes.count ?? 0,
      pendingConsultingApprovals: pendingRes.count ?? 0,
      totalSubscriptionRevenue: totalRevenue,
      revenueThisMonth: monthRevenue,
      revenueThisYear: yearRevenue,
      activeMonthly: monthlyRes.count ?? 0,
      activeQuarterly: quarterlyRes.count ?? 0,
      activeAnnual: annualRes.count ?? 0,
      expiringWithin7Days: expiring7Res.count ?? 0,
      expiringWithin30Days: expiring30Res.count ?? 0,
      cancelledSubscriptions: cancelledRes.count ?? 0,
      suspendedAccounts: suspendedRes.count ?? 0,
    };
  } catch (err) {
    console.error("fetchOwnerDashboardStats error:", err);
    return empty;
  }
}

// ── Business stats for a single company (Consulting Details) ─

export interface CompanyBusinessStats {
  packageCount: number;
  clientCount: number;
  applicationCount: number;
  totalSales: number;
  outstandingPayments: number;
  posRevenue: number;
  cashierIncome: number;
  cashierExpenses: number;
}

export async function fetchCompanyBusinessStats(
  companyId: string,
): Promise<CompanyBusinessStats> {
  const empty: CompanyBusinessStats = {
    packageCount: 0,
    clientCount: 0,
    applicationCount: 0,
    totalSales: 0,
    outstandingPayments: 0,
    posRevenue: 0,
    cashierIncome: 0,
    cashierExpenses: 0,
  };
  try {
    const [pkgRes, clientRes, appRes] = await Promise.all([
      supabase
        .from("consulting_packages")
        .select("*", { count: "exact", head: true })
        .eq("consulting_company_id", companyId),
      supabase
        .from("consulting_clients")
        .select("*", { count: "exact", head: true })
        .eq("consulting_company_id", companyId)
        .eq("is_archived", false),
      supabase
        .from("consulting_applications")
        .select("*", { count: "exact", head: true })
        .eq("consulting_company_id", companyId),
    ]);

    const { data: payments } = await supabase
      .from("consulting_payments")
      .select("gross_amount, status, type")
      .eq("consulting_company_id", companyId);
    const pays = (payments ?? []) as unknown as {
      gross_amount: number;
      status: string;
      type: string;
    }[];
    const totalSales = pays
      .filter((p) => p.status === "paid" && p.type === "package")
      .reduce((s, p) => s + Number(p.gross_amount), 0);
    const outstanding = pays
      .filter((p) => p.status === "pending" || p.status === "partial")
      .reduce((s, p) => s + Number(p.gross_amount), 0);

    return {
      packageCount: pkgRes.count ?? 0,
      clientCount: clientRes.count ?? 0,
      applicationCount: appRes.count ?? 0,
      totalSales,
      outstandingPayments: outstanding,
      posRevenue: 0, // POS revenue is in localStorage; computed by company users
      cashierIncome: 0,
      cashierExpenses: 0,
    };
  } catch (err) {
    console.error("fetchCompanyBusinessStats error:", err);
    return empty;
  }
}

// ── Subscription date helpers ──────────────────────────────

/** Days remaining until expiration (negative if expired). */
export function daysRemaining(endDate: string | null): number {
  if (!endDate) return 0;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

/** Subscription progress percentage (0–100). */
export function subscriptionProgress(
  startDate: string | null,
  endDate: string | null,
): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

export type SubscriptionDisplayStatus =
  | "pending"
  | "active"
  | "expiring_soon"
  | "expired"
  | "suspended"
  | "cancelled";

/** Derive display status from company fields. */
export function deriveDisplayStatus(
  company: Pick<
    ConsultingCompany,
    "subscription_status" | "subscription_end_date"
  >,
): SubscriptionDisplayStatus {
  const status = company.subscription_status;
  if (status === "suspended") return "suspended";
  if (status === "cancelled") return "cancelled";
  if (status === "none" || !status) return "pending";
  if (status === "expired") return "expired";
  const days = daysRemaining(company.subscription_end_date);
  if (days < 0) return "expired";
  if (days <= 7) return "expiring_soon";
  return "active";
}

// ── Find user by email (for manual activation) ─────────────

export interface FoundUser {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  user_type: UserType;
  account_status: AccountStatus;
  created_at: string | null;
  is_registered: boolean;
}

/** Find a user by email. Returns null if not registered. */
export async function findUserByEmail(email: string): Promise<FoundUser | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, avatar_url, user_type, account_status, created_at")
    .ilike("email", email.trim())
    .maybeSingle();
  if (error || !data) return null;
  return { ...(data as unknown as FoundUser), is_registered: true };
}

export { CONSULTING_PLANS, getPlan, computeEndDate };

/* ============================================================
   Revenue & Payment Analytics (Section 11)
   ------------------------------------------------
   OXEN platform subscription revenue only.
   Consulting company business revenue (POS, Cashier, package
   sales) is kept fully separate and never counted here.
   ============================================================ */

export interface RevenueAnalytics {
  // Period totals (OXEN subscription revenue)
  totalRevenue: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  revenueThisYear: number;
  // Breakdowns
  revenueByPlan: { plan: SubscriptionPlan; amount: number; count: number }[];
  revenueByPaymentMethod: { method: string; amount: number; count: number }[];
  newSubscriptionRevenue: number;
  renewalRevenue: number;
  refundTotal: number;
  pendingPaymentTotal: number;
  confirmedPaymentsCount: number;
  rejectedPaymentsCount: number;
  // Chart data
  monthlyRevenue: { month: string; label: string; amount: number }[];
  planSales: { plan: SubscriptionPlan; count: number; revenue: number }[];
  userGrowth: { month: string; label: string; ordinary: number; consulting: number }[];
  subscriptionStatusCounts: { active: number; expired: number; suspended: number; cancelled: number };
  premiumConversionRate: number;
}

/** Fetch comprehensive revenue analytics (owner only). */
export async function fetchRevenueAnalytics(): Promise<RevenueAnalytics> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const empty: RevenueAnalytics = {
    totalRevenue: 0,
    revenueToday: 0,
    revenueThisWeek: 0,
    revenueThisMonth: 0,
    revenueThisYear: 0,
    revenueByPlan: [],
    revenueByPaymentMethod: [],
    newSubscriptionRevenue: 0,
    renewalRevenue: 0,
    refundTotal: 0,
    pendingPaymentTotal: 0,
    confirmedPaymentsCount: 0,
    rejectedPaymentsCount: 0,
    monthlyRevenue: [],
    planSales: [
      { plan: "monthly", count: 0, revenue: 0 },
      { plan: "quarterly", count: 0, revenue: 0 },
      { plan: "annual", count: 0, revenue: 0 },
    ],
    userGrowth: [],
    subscriptionStatusCounts: { active: 0, expired: 0, suspended: 0, cancelled: 0 },
    premiumConversionRate: 0,
  };

  try {
    // Paid subscription payments (OXEN platform revenue)
    const { data: paidData } = await supabase
      .from("consulting_payments")
      .select("gross_amount, paid_at, currency, type, status")
      .eq("type", "subscription")
      .eq("status", "paid");
    const paid = (paidData ?? []) as unknown as {
      gross_amount: number;
      paid_at: string | null;
      currency: string;
      type: string;
      status: string;
    }[];

    const totalRevenue = paid.reduce((s, p) => s + Number(p.gross_amount), 0);
    const revenueToday = paid.filter((p) => p.paid_at && new Date(p.paid_at) >= startOfToday).reduce((s, p) => s + Number(p.gross_amount), 0);
    const revenueThisWeek = paid.filter((p) => p.paid_at && new Date(p.paid_at) >= startOfWeek).reduce((s, p) => s + Number(p.gross_amount), 0);
    const revenueThisMonth = paid.filter((p) => p.paid_at && new Date(p.paid_at) >= startOfMonth).reduce((s, p) => s + Number(p.gross_amount), 0);
    const revenueThisYear = paid.filter((p) => p.paid_at && new Date(p.paid_at) >= startOfYear).reduce((s, p) => s + Number(p.gross_amount), 0);

    // Refunds (type=refund, status=refunded)
    const { data: refundData } = await supabase
      .from("consulting_payments")
      .select("gross_amount")
      .eq("type", "refund")
      .eq("status", "refunded");
    const refundTotal = (refundData ?? []).reduce((s, p) => s + Number((p as { gross_amount: number }).gross_amount), 0);

    // Pending payment requests total + confirmed/rejected counts
    const { data: pendingReq } = await supabase
      .from("owner_payment_requests")
      .select("amount, verification_status")
      .eq("verification_status", "pending_verification");
    const pendingPaymentTotal = (pendingReq ?? []).reduce((s, p) => s + Number((p as { amount: number }).amount), 0);

    const [confirmedRes, rejectedRes] = await Promise.all([
      supabase.from("owner_payment_requests").select("*", { count: "exact", head: true }).eq("verification_status", "confirmed"),
      supabase.from("owner_payment_requests").select("*", { count: "exact", head: true }).eq("verification_status", "rejected"),
    ]);

    // Revenue by plan — from consulting_subscriptions (active) + payment history
    const { data: subsData } = await supabase
      .from("consulting_subscriptions")
      .select("plan, amount, status");
    const subs = (subsData ?? []) as unknown as { plan: SubscriptionPlan; amount: number; status: string }[];
    const planMap = new Map<SubscriptionPlan, { count: number; revenue: number }>();
    for (const s of subs) {
      const e = planMap.get(s.plan) ?? { count: 0, revenue: 0 };
      e.count += 1;
      e.revenue += Number(s.amount);
      planMap.set(s.plan, e);
    }
    const planSales: { plan: SubscriptionPlan; count: number; revenue: number }[] = (
      ["monthly", "quarterly", "annual"] as SubscriptionPlan[]
    ).map((plan) => ({ plan, count: planMap.get(plan)?.count ?? 0, revenue: planMap.get(plan)?.revenue ?? 0 }));

    // Revenue by plan (for cards)
    const revenueByPlan = planSales.map((p) => ({ plan: p.plan, amount: p.revenue, count: p.count }));

    // Revenue by payment method — from owner_payment_requests
    const { data: payMethodData } = await supabase
      .from("owner_payment_requests")
      .select("payment_method, amount, verification_status")
      .eq("verification_status", "confirmed");
    const methodMap = new Map<string, { amount: number; count: number }>();
    for (const p of (payMethodData ?? []) as unknown as { payment_method: string | null; amount: number }[]) {
      const m = p.payment_method ?? "Unknown";
      const e = methodMap.get(m) ?? { amount: 0, count: 0 };
      e.amount += Number(p.amount);
      e.count += 1;
      methodMap.set(m, e);
    }
    const revenueByPaymentMethod = Array.from(methodMap.entries()).map(([method, v]) => ({ method, ...v }));

    // New vs renewal revenue — from subscription history
    const { data: histData } = await supabase
      .from("owner_subscription_history")
      .select("amount, action_type")
      .in("action_type", ["activation", "extension", "plan_change"]);
    const hist = (histData ?? []) as unknown as { amount: number | null; action_type: string }[];
    const newSubscriptionRevenue = hist.filter((h) => h.action_type === "activation").reduce((s, h) => s + Number(h.amount ?? 0), 0);
    const renewalRevenue = hist.filter((h) => h.action_type === "extension" || h.action_type === "plan_change").reduce((s, h) => s + Number(h.amount ?? 0), 0);

    // Monthly revenue (last 12 months)
    const monthlyMap = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, 0);
    }
    for (const p of paid) {
      if (!p.paid_at) continue;
      const d = new Date(p.paid_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap.has(key)) monthlyMap.set(key, monthlyMap.get(key)! + Number(p.gross_amount));
    }
    const monthlyRevenue = Array.from(monthlyMap.entries()).map(([month, amount]) => {
      const [y, m] = month.split("-");
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short" });
      return { month, label, amount };
    });

    // User growth (last 12 months) — ordinary vs consulting
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("created_at, user_type");
    const profiles = (profilesData ?? []) as unknown as { created_at: string | null; user_type: string }[];
    const growthMap = new Map<string, { ordinary: number; consulting: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      growthMap.set(key, { ordinary: 0, consulting: 0 });
    }
    for (const p of profiles) {
      if (!p.created_at) continue;
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (growthMap.has(key)) {
        const e = growthMap.get(key)!;
        if (p.user_type === "premium_consulting" || p.user_type === "consulting_applicant") e.consulting += 1;
        else e.ordinary += 1;
      }
    }
    const userGrowth = Array.from(growthMap.entries()).map(([month, v]) => {
      const [y, m] = month.split("-");
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short" });
      return { month, label, ...v };
    });

    // Subscription status counts
    const [activeRes, expiredRes, suspendedRes, cancelledRes] = await Promise.all([
      supabase.from("consulting_companies").select("*", { count: "exact", head: true }).eq("subscription_status", "active"),
      supabase.from("consulting_companies").select("*", { count: "exact", head: true }).eq("subscription_status", "expired"),
      supabase.from("consulting_companies").select("*", { count: "exact", head: true }).eq("subscription_status", "suspended"),
      supabase.from("consulting_companies").select("*", { count: "exact", head: true }).eq("subscription_status", "cancelled"),
    ]);
    const subscriptionStatusCounts = {
      active: activeRes.count ?? 0,
      expired: expiredRes.count ?? 0,
      suspended: suspendedRes.count ?? 0,
      cancelled: cancelledRes.count ?? 0,
    };

    // Premium conversion rate = active premium accounts / consulting applicants * 100
    const [activePremiumRes, applicantRes] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("user_type", "premium_consulting"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("user_type", "consulting_applicant"),
    ]);
    const activeCount = activePremiumRes.count ?? 0;
    const applicantCount = applicantRes.count ?? 0;
    const premiumConversionRate = applicantCount > 0 ? (activeCount / applicantCount) * 100 : 0;

    return {
      totalRevenue,
      revenueToday,
      revenueThisWeek,
      revenueThisMonth,
      revenueThisYear,
      revenueByPlan,
      revenueByPaymentMethod,
      newSubscriptionRevenue,
      renewalRevenue,
      refundTotal,
      pendingPaymentTotal,
      confirmedPaymentsCount: confirmedRes.count ?? 0,
      rejectedPaymentsCount: rejectedRes.count ?? 0,
      monthlyRevenue,
      planSales,
      userGrowth,
      subscriptionStatusCounts,
      premiumConversionRate,
    };
  } catch (err) {
    console.error("fetchRevenueAnalytics error:", err);
    return empty;
  }
}

/* ============================================================
   Owner Notifications (Section 12)
   ============================================================ */

export type OwnerEventType =
  | "payment_submitted"
  | "premium_application"
  | "payment_confirmation_required"
  | "subscription_expiring_7"
  | "subscription_expiring_30"
  | "subscription_expired"
  | "payment_rejected"
  | "refund_request"
  | "suspicious_activity"
  | "pending_email_registered";

export interface OwnerNotification {
  id: string;
  event_type: OwnerEventType;
  consulting_company_id: string | null;
  consulting_company_name: string | null;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  subscription_id: string | null;
  payment_request_id: string | null;
  metadata: Json;
  is_read: boolean;
  read_at: string | null;
  read_by: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

/** Fetch all owner notifications (owner only). */
export async function fetchOwnerNotifications(
  filter: "all" | "unread" = "all",
): Promise<OwnerNotification[]> {
  let query = supabase
    .from("owner_notifications")
    .select("*")
    .order("created_at", { ascending: false });
  if (filter === "unread") query = query.eq("is_read", false);
  const { data, error } = await query.limit(200);
  if (error) {
    console.error("fetchOwnerNotifications error:", error);
    return [];
  }
  return (data ?? []) as unknown as OwnerNotification[];
}

/** Get unread notification count (for sidebar badge). */
export async function fetchUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("owner_notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) return 0;
  return count ?? 0;
}

/** Mark a notification as read. */
export async function markNotificationRead(
  notificationId: string,
  ownerId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("owner_notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      read_by: ownerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", notificationId);
  if (error) {
    console.error("markNotificationRead error:", error);
    return false;
  }
  return true;
}

/** Mark all unread notifications as read. */
export async function markAllNotificationsRead(
  ownerId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("owner_notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      read_by: ownerId,
      updated_at: new Date().toISOString(),
    })
    .eq("is_read", false);
  if (error) {
    console.error("markAllNotificationsRead error:", error);
    return false;
  }
  return true;
}

/** Create a notification (internal — called by other owner actions). */
export async function createOwnerNotification(
  input: Omit<OwnerNotification, "id" | "is_read" | "read_at" | "read_by" | "created_at" | "updated_at"> & {
    priority?: number;
  },
): Promise<void> {
  await supabase.from("owner_notifications").insert({
    ...input,
    priority: input.priority ?? 0,
  });
}

/* ============================================================
   Two-Owner Protection (Section 15)
   ------------------------------------------------
   Sensitive actions require a confirmation with a reason.
   Owners cannot remove their own owner access or the other
   owner's access from the normal UI.
   ============================================================ */

export type SensitiveAction =
  | "block_account"
  | "cancel_subscription"
  | "refund_payment"
  | "remove_premium"
  | "change_expiration"
  | "change_to_owner"
  | "remove_owner";

export interface ConfirmationDetails {
  action: SensitiveAction;
  actionLabel: string;
  affectedAccount: string;
  currentStatus: string;
  newStatus: string;
  consequences: string;
}

/** Verify the caller is an owner before allowing a sensitive action. */
export async function verifyOwnerBeforeSensitiveAction(): Promise<{
  isOwner: boolean;
  ownerId: string | null;
  ownerEmail: string | null;
}> {
  const access = await checkOwnerAccess();
  return {
    isOwner: access.is_owner,
    ownerId: access.user_id,
    ownerEmail: access.email,
  };
}

/**
 * Update user type with two-owner protection.
   Blocks changing to 'owner' and blocks removing 'owner' role
   via the normal Users UI. These require a separate protected
   process (database-level, not exposed in the UI).
 */
export async function safeUpdateUserType(
  userId: string,
  newType: UserType,
  ownerId: string,
  ownerEmail: string,
  reason?: string,
): Promise<{ success: boolean; error: string | null }> {
  // Block changing TO owner from the normal UI
  if (newType === "owner") {
    return {
      success: false,
      error: "Cannot grant Owner role from the UI. Use the protected database process.",
    };
  }

  // Fetch current user to check if they're an owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, user_type")
    .eq("id", userId)
    .maybeSingle();
  const p = profile as unknown as { id: string; email: string | null; user_type: string } | null;
  if (!p) return { success: false, error: "User not found" };

  // Block removing owner role from the normal UI
  if (p.user_type === "owner") {
    return {
      success: false,
      error: "Cannot remove Owner role from the UI. Use the protected database process.",
    };
  }

  // Block if target is one of the seeded owner emails
  const { data: ownerCheck } = await supabase
    .from("owner_admins")
    .select("email")
    .ilike("email", p.email ?? "")
    .maybeSingle();
  if (ownerCheck) {
    return {
      success: false,
      error: "This account is a protected Owner. Cannot change role from the UI.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ user_type: newType, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { success: false, error: error.message };

  await logOwnerAction(
    ownerId,
    ownerEmail,
    "change_user_type",
    "user",
    userId,
    { new_type: newType, previous_type: p.user_type },
    {
      previousValue: { user_type: p.user_type },
      newValue: { user_type: newType },
      reason: reason ?? null,
      targetUserId: userId,
      targetLabel: p.email ?? userId,
    },
  );

  return { success: true, error: null };
}

/**
 * Update user status with two-owner protection.
   Blocks blocking/suspending a protected owner account.
 */
export async function safeUpdateUserStatus(
  userId: string,
  newStatus: AccountStatus,
  ownerId: string,
  ownerEmail: string,
  reason?: string,
): Promise<{ success: boolean; error: string | null }> {
  // Fetch current user
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, user_type, account_status")
    .eq("id", userId)
    .maybeSingle();
  const p = profile as unknown as {
    id: string;
    email: string | null;
    user_type: UserType;
    account_status: AccountStatus;
  } | null;
  if (!p) return { success: false, error: "User not found" };

  // Block if target is an owner
  if (p.user_type === "owner") {
    return {
      success: false,
      error: "Cannot block or suspend an Owner account from the UI.",
    };
  }

  // Block if target email is in owner_admins
  const { data: ownerCheck } = await supabase
    .from("owner_admins")
    .select("email")
    .ilike("email", p.email ?? "")
    .maybeSingle();
  if (ownerCheck) {
    return {
      success: false,
      error: "This account is a protected Owner. Cannot change status from the UI.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ account_status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { success: false, error: error.message };

  await logOwnerAction(
    ownerId,
    ownerEmail,
    newStatus === "blocked" ? "block_user" : newStatus === "suspended" ? "suspend_user" : "restore_user",
    "user",
    userId,
    { new_status: newStatus, previous_status: p.account_status },
    {
      previousValue: { account_status: p.account_status },
      newValue: { account_status: newStatus },
      reason: reason ?? null,
      targetUserId: userId,
      targetLabel: p.email ?? userId,
    },
  );

  return { success: true, error: null };
}

/* ============================================================
   Consulting Applications (Owner view — Section 17 sidebar item)
   ============================================================ */

export interface ConsultingApplicationSummary {
  id: string;
  consulting_company_id: string;
  company_name: string | null;
  client_name: string | null;
  destination_country: string | null;
  application_type: string | null;
  status: string;
  submission_date: string | null;
  expected_completion_date: string | null;
  created_at: string;
}

/** Fetch all consulting applications across all companies (owner only). */
export async function fetchAllConsultingApplications(
  statusFilter?: string,
): Promise<ConsultingApplicationSummary[]> {
  let query = supabase
    .from("consulting_applications")
    .select(`
      id,
      consulting_company_id,
      destination_country,
      application_type,
      status,
      submission_date,
      expected_completion_date,
      created_at,
      consulting_clients (name)
    `)
    .order("created_at", { ascending: false });
  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  const { data, error } = await query.limit(200);
  if (error) {
    console.error("fetchAllConsultingApplications error:", error);
    return [];
  }

  // Enrich with company names
  const companyIds = Array.from(new Set((data ?? []).map((a) => (a as unknown as { consulting_company_id: string }).consulting_company_id)));
  let companyMap = new Map<string, string>();
  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from("consulting_companies")
      .select("id, name")
      .in("id", companyIds);
    for (const c of (companies ?? []) as unknown as { id: string; name: string }[]) {
      companyMap.set(c.id, c.name);
    }
  }

  return (data ?? []).map((a) => {
    const row = a as unknown as {
      id: string;
      consulting_company_id: string;
      destination_country: string | null;
      application_type: string | null;
      status: string;
      submission_date: string | null;
      expected_completion_date: string | null;
      created_at: string;
      consulting_clients: { name: string | null } | null;
    };
    return {
      id: row.id,
      consulting_company_id: row.consulting_company_id,
      company_name: companyMap.get(row.consulting_company_id) ?? null,
      client_name: row.consulting_clients?.name ?? null,
      destination_country: row.destination_country,
      application_type: row.application_type,
      status: row.status,
      submission_date: row.submission_date,
      expected_completion_date: row.expected_completion_date,
      created_at: row.created_at,
    };
  });
}

/* ============================================================
   All Subscriptions (Owner view — Section 17 sidebar item)
   ============================================================ */

export interface OwnerSubscriptionRow {
  id: string;
  company_id: string;
  company_name: string;
  owner_name: string | null;
  owner_email: string | null;
  plan: SubscriptionPlan;
  status: string;
  start_date: string;
  end_date: string;
  amount: number;
  currency: string;
  auto_renewal: boolean;
  days_remaining: number;
  display_status: SubscriptionDisplayStatus;
}

/** Fetch all consulting subscriptions across all companies (owner only). */
export async function fetchAllSubscriptions(
  statusFilter?: string,
): Promise<OwnerSubscriptionRow[]> {
  const { data: subsData, error } = await supabase
    .from("consulting_subscriptions")
    .select(`
      id,
      consulting_company_id,
      plan,
      status,
      start_date,
      end_date,
      amount,
      currency,
      auto_renewal
    `)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("fetchAllSubscriptions error:", error);
    return [];
  }

  const subs = (subsData ?? []) as unknown as {
    id: string;
    consulting_company_id: string;
    plan: SubscriptionPlan;
    status: string;
    start_date: string;
    end_date: string;
    amount: number;
    currency: string;
    auto_renewal: boolean;
  }[];

  if (subs.length === 0) return [];

  // Enrich with company + owner info
  const companyIds = Array.from(new Set(subs.map((s) => s.consulting_company_id)));
  const { data: companiesData } = await supabase
    .from("consulting_companies")
    .select("id, name, owner_id, subscription_status, subscription_end_date")
    .in("id", companyIds);
  const companies = (companiesData ?? []) as unknown as {
    id: string;
    name: string;
    owner_id: string;
    subscription_status: string;
    subscription_end_date: string | null;
  }[];

  const ownerIds = Array.from(new Set(companies.map((c) => c.owner_id)));
  let profileMap = new Map<string, { name: string | null; email: string | null }>();
  if (ownerIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", ownerIds);
    for (const p of (profilesData ?? []) as unknown as { id: string; name: string | null; email: string | null }[]) {
      profileMap.set(p.id, { name: p.name, email: p.email });
    }
  }

  const companyMap = new Map<string, { name: string; owner_id: string }>();
  for (const c of companies) companyMap.set(c.id, { name: c.name, owner_id: c.owner_id });

  const result: OwnerSubscriptionRow[] = subs.map((s) => {
    const comp = companyMap.get(s.consulting_company_id);
    const ownerProfile = comp ? profileMap.get(comp.owner_id) : null;
    const days = daysRemaining(s.end_date);
    const displayStatus = deriveDisplayStatus({
      subscription_status: s.status as SubscriptionStatus,
      subscription_end_date: s.end_date,
    });
    return {
      id: s.id,
      company_id: s.consulting_company_id,
      company_name: comp?.name ?? "Unknown",
      owner_name: ownerProfile?.name ?? null,
      owner_email: ownerProfile?.email ?? null,
      plan: s.plan,
      status: s.status,
      start_date: s.start_date,
      end_date: s.end_date,
      amount: Number(s.amount),
      currency: s.currency,
      auto_renewal: s.auto_renewal,
      days_remaining: days,
      display_status: displayStatus,
    };
  });

  if (statusFilter && statusFilter !== "all") {
    if (statusFilter === "active") return result.filter((r) => r.display_status === "active");
    if (statusFilter === "expiring_soon") return result.filter((r) => r.display_status === "expiring_soon");
    if (statusFilter === "expired") return result.filter((r) => r.display_status === "expired");
    if (statusFilter === "suspended") return result.filter((r) => r.display_status === "suspended");
    if (statusFilter === "cancelled") return result.filter((r) => r.display_status === "cancelled");
    return result.filter((r) => r.status === statusFilter);
  }

  return result;
}
