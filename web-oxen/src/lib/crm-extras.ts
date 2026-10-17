import { supabase } from "@/lib/supabase";
import type { Json } from "@/integrations/supabase/types";

/* ============================================================
   CRM Extras — Reviews, Settings, Support Tickets,
   Notifications, Knowledge Base data layer.
   All data flows through Supabase and is enforced by RLS.
   Tables from migration 0001 (reused) + migration 0017 (new).
   ============================================================ */

// ── Reviews (reuses consulting_reviews from migration 0001) ──

export interface ConsultingReview {
  id: string;
  consulting_company_id: string;
  service_id: string | null;
  post_id: string | null;
  client_id: string | null;
  user_id: string;
  rating: number;
  comment: string | null;
  images: Json;
  reply: string | null;
  reply_at: string | null;
  is_verified: boolean;
  is_reported: boolean;
  report_reason: string | null;
  created_at: string;
  updated_at: string;
  /** Joined profile */
  user?: { name: string | null; avatar_url: string | null } | null;
  /** Joined post title */
  post?: { title: string; destination_country: string | null; destination_city: string | null } | null;
  /** Joined service title */
  service?: { title: string } | null;
}

export interface ReviewStats {
  total: number;
  average: number;
  distribution: { rating: number; count: number }[];
}

export async function fetchAgencyReviews(companyId: string): Promise<ConsultingReview[]> {
  const { data, error } = await supabase
    .from("consulting_reviews")
    .select(
      "*, user:profiles!consulting_reviews_user_id_fkey(name,avatar_url), post:consulting_posts!consulting_reviews_post_id_fkey(title,destination_country,destination_city), service:services!consulting_reviews_service_id_fkey(title)",
    )
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchAgencyReviews error:", error);
    return [];
  }
  return (data ?? []) as unknown as ConsultingReview[];
}

export async function replyToReview(reviewId: string, reply: string): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_reviews")
    .update({ reply, reply_at: new Date().toISOString() })
    .eq("id", reviewId);
  if (error) {
    console.error("replyToReview error:", error);
    return false;
  }
  return true;
}

export async function reportReview(reviewId: string, reason: string): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_reviews")
    .update({ is_reported: true, report_reason: reason })
    .eq("id", reviewId);
  if (error) {
    console.error("reportReview error:", error);
    return false;
  }
  return true;
}

export function computeReviewStats(reviews: ConsultingReview[]): ReviewStats {
  const total = reviews.length;
  if (total === 0) {
    return {
      total: 0,
      average: 0,
      distribution: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: 0 })),
    };
  }
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  const dist = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
  }));
  return { total, average: Math.round((sum / total) * 10) / 10, distribution: dist };
}

// ── Settings (consulting_settings from migration 0017) ──

export interface ConsultingSettings {
  id: string;
  consulting_company_id: string;
  crm_language: string;
  currency: string;
  timezone: string;
  notify_new_client: boolean;
  notify_new_application: boolean;
  notify_tour_inquiry: boolean;
  notify_review: boolean;
  notify_employee_activity: boolean;
  default_dashboard_period: string;
  default_currency: string;
  date_format: string;
  agency_preferences: Json;
  created_at: string;
  updated_at: string;
}

export type SettingsInput = Partial<Omit<ConsultingSettings, "id" | "consulting_company_id" | "created_at" | "updated_at">>;

export async function fetchSettings(companyId: string): Promise<ConsultingSettings | null> {
  const { data, error } = await supabase
    .from("consulting_settings")
    .select("*")
    .eq("consulting_company_id", companyId)
    .maybeSingle();
  if (error) {
    console.error("fetchSettings error:", error);
    return null;
  }
  return data as unknown as ConsultingSettings | null;
}

export async function upsertSettings(companyId: string, input: SettingsInput): Promise<boolean> {
  // Try update first
  const { error: updateErr } = await supabase
    .from("consulting_settings")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("consulting_company_id", companyId);

  if (updateErr) {
    // Maybe row doesn't exist — try insert
    const { error: insertErr } = await supabase.from("consulting_settings").insert({
      consulting_company_id: companyId,
      ...input,
    });
    if (insertErr) {
      console.error("upsertSettings error:", insertErr);
      return false;
    }
  }
  return true;
}

// ── Support Tickets (consulting_support_tickets from migration 0017) ──

export type SupportCategory =
  | "technical"
  | "crm"
  | "account"
  | "tour_package"
  | "billing"
  | "other";

export type SupportTicketStatus =
  | "open"
  | "in_progress"
  | "waiting_for_user"
  | "resolved"
  | "closed";

export interface SupportTicket {
  id: string;
  consulting_company_id: string;
  user_id: string;
  agency_name: string | null;
  subject: string;
  category: SupportCategory;
  message: string;
  attachment_url: string | null;
  status: SupportTicketStatus;
  priority: string;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: "user" | "support";
  body: string;
  attachment_url: string | null;
  read_at: string | null;
  created_at: string;
}

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  technical: "Technical Problem",
  crm: "CRM Problem",
  account: "Account Problem",
  tour_package: "Tour Package Problem",
  billing: "Billing / Subscription",
  other: "Other",
};

export const SUPPORT_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_for_user: "Waiting for User",
  resolved: "Resolved",
  closed: "Closed",
};

export const SUPPORT_STATUS_COLORS: Record<SupportTicketStatus, string> = {
  open: "bg-blue-500/15 text-blue-400",
  in_progress: "bg-amber-500/15 text-amber-400",
  waiting_for_user: "bg-purple-500/15 text-purple-400",
  resolved: "bg-emerald-500/15 text-emerald-400",
  closed: "bg-white/[0.06] text-muted-foreground",
};

export async function fetchSupportTickets(companyId: string): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from("consulting_support_tickets")
    .select("*")
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchSupportTickets error:", error);
    return [];
  }
  return (data ?? []) as unknown as SupportTicket[];
}

export async function createSupportTicket(input: {
  companyId: string;
  userId: string;
  agencyName: string;
  subject: string;
  category: SupportCategory;
  message: string;
  attachmentUrl?: string | null;
}): Promise<SupportTicket | null> {
  const { data, error } = await supabase
    .from("consulting_support_tickets")
    .insert({
      consulting_company_id: input.companyId,
      user_id: input.userId,
      agency_name: input.agencyName,
      subject: input.subject,
      category: input.category,
      message: input.message,
      attachment_url: input.attachmentUrl ?? null,
      status: "open",
    })
    .select("*")
    .single();
  if (error) {
    console.error("createSupportTicket error:", error);
    return null;
  }
  return data as unknown as SupportTicket;
}

export async function fetchTicketMessages(ticketId: string): Promise<SupportTicketMessage[]> {
  const { data, error } = await supabase
    .from("consulting_support_ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchTicketMessages error:", error);
    return [];
  }
  return (data ?? []) as unknown as SupportTicketMessage[];
}

export async function sendTicketMessage(
  ticketId: string,
  senderId: string,
  body: string,
  senderRole: "user" | "support" = "user",
): Promise<SupportTicketMessage | null> {
  const { data, error } = await supabase
    .from("consulting_support_ticket_messages")
    .insert({
      ticket_id: ticketId,
      sender_id: senderId,
      sender_role: senderRole,
      body,
    })
    .select("*")
    .single();
  if (error) {
    console.error("sendTicketMessage error:", error);
    return null;
  }
  // Update ticket updated_at
  await supabase
    .from("consulting_support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ticketId);
  return data as unknown as SupportTicketMessage;
}

// ── Notifications (reuses consulting_notifications from migration 0001) ──

export interface ConsultingNotification {
  id: string;
  consulting_company_id: string;
  user_id: string | null;
  type: string;
  title: string | null;
  body: string | null;
  data: Json;
  is_read: boolean;
  created_at: string;
}

export async function fetchNotifications(companyId: string, limit = 20): Promise<ConsultingNotification[]> {
  const { data, error } = await supabase
    .from("consulting_notifications")
    .select("*")
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("fetchNotifications error:", error);
    return [];
  }
  return (data ?? []) as unknown as ConsultingNotification[];
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
  if (error) {
    console.error("markNotificationRead error:", error);
    return false;
  }
  return true;
}

export async function markAllNotificationsRead(companyId: string): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_notifications")
    .update({ is_read: true })
    .eq("consulting_company_id", companyId)
    .eq("is_read", false);
  if (error) {
    console.error("markAllNotificationsRead error:", error);
    return false;
  }
  return true;
}

// ── Subscription history (reuses consulting_subscriptions from migration 0001) ──

export interface SubscriptionHistoryRow {
  id: string;
  consulting_company_id: string;
  plan: string;
  status: string;
  start_date: string;
  end_date: string;
  auto_renewal: boolean;
  amount: number;
  currency: string;
  created_at: string;
}

export async function fetchSubscriptionHistory(companyId: string): Promise<SubscriptionHistoryRow[]> {
  const { data, error } = await supabase
    .from("consulting_subscriptions")
    .select("*")
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchSubscriptionHistory error:", error);
    return [];
  }
  return (data ?? []) as unknown as SubscriptionHistoryRow[];
}
