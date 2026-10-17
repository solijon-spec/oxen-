import { supabase } from "@/lib/supabase";
import type { Json } from "@/integrations/supabase/types";

/* ============================================================
   Service Details System — Types + Data Access Layer
   All data comes from Supabase. No hardcoded content.
   ============================================================ */

// ── Rich text content blocks (stored as jsonb) ──────────────

export interface RichHeading {
  type: "heading";
  text: string;
}

export interface RichParagraph {
  type: "paragraph";
  text: string;
}

export interface RichList {
  type: "list";
  items: string[];
}

export interface RichQuote {
  type: "quote";
  text: string;
}

export interface RichLink {
  type: "link";
  text: string;
  url: string;
}

export type RichBlock =
  | RichHeading
  | RichParagraph
  | RichList
  | RichQuote
  | RichLink;

// ── Video item ───────────────────────────────────────────────

export interface ServiceVideo {
  type: "youtube" | "uploaded";
  url: string;
  title?: string;
}

// ── Process step ─────────────────────────────────────────────

export interface ProcessStep {
  step: string;
  description: string;
}

// ── FAQ item ─────────────────────────────────────────────────

export interface FAQItem {
  question: string;
  answer: string;
}

// ── Document ─────────────────────────────────────────────────

export interface ServiceDocument {
  id: string;
  service_id: string;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

// ── Consulting Company ───────────────────────────────────────

export interface ConsultingCompany {
  id: string;
  owner_id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

// ── Service ──────────────────────────────────────────────────

export interface Service {
  id: string;
  consulting_id: string;
  title: string;
  description: string;
  long_description: Json;
  cover_image: string | null;
  gallery: Json;
  videos: Json;
  category: string;
  price: number;
  currency: string;
  duration: string | null;
  delivery_time: string | null;
  benefits: Json;
  requirements: Json;
  process: Json;
  faq: Json;
  additional_content: Json;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  rating: number;
  review_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Service with consulting company joined ───────────────────

export interface ServiceWithConsulting extends Service {
  consulting_companies?: ConsultingCompany;
}

// ── Review ───────────────────────────────────────────────────

export interface ServiceReview {
  id: string;
  service_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

// ── Type guards / helpers for jsonb fields ───────────────────

export function parseRichBlocks(json: Json): RichBlock[] {
  if (!Array.isArray(json)) return [];
  return json as unknown as RichBlock[];
}

export function parseStringArray(json: Json): string[] {
  if (!Array.isArray(json)) return [];
  return json as unknown as string[];
}

export function parseVideos(json: Json): ServiceVideo[] {
  if (!Array.isArray(json)) return [];
  return json as unknown as ServiceVideo[];
}

export function parseProcessSteps(json: Json): ProcessStep[] {
  if (!Array.isArray(json)) return [];
  return json as unknown as ProcessStep[];
}

export function parseFAQItems(json: Json): FAQItem[] {
  if (!Array.isArray(json)) return [];
  return json as unknown as FAQItem[];
}

// ── Data Access Functions ────────────────────────────────────

/** Fetch all active services with consulting company info */
export async function fetchServices(category?: string): Promise<ServiceWithConsulting[]> {
  let query = supabase
    .from("services")
    .select("*, consulting_companies!inner(*)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (category && category !== "All") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchServices error:", error);
    throw error;
  }
  return (data ?? []) as unknown as ServiceWithConsulting[];
}

/** Fetch a single service by ID with consulting company */
export async function fetchServiceById(id: string): Promise<ServiceWithConsulting | null> {
  const { data, error } = await supabase
    .from("services")
    .select("*, consulting_companies!inner(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("fetchServiceById error:", error);
    throw error;
  }
  return data as unknown as ServiceWithConsulting | null;
}

/** Fetch related services (same company first, then same category) */
export async function fetchRelatedServices(
  serviceId: string,
  consultingId: string,
  category: string,
): Promise<ServiceWithConsulting[]> {
  // First try same consulting company
  const { data: sameCompany, error: err1 } = await supabase
    .from("services")
    .select("*, consulting_companies!inner(*)")
    .eq("is_active", true)
    .eq("consulting_id", consultingId)
    .neq("id", serviceId)
    .limit(6);

  if (err1) console.error("fetchRelatedServices (company) error:", err1);

  const companyResults = (sameCompany ?? []) as unknown as ServiceWithConsulting[];

  if (companyResults.length >= 6) return companyResults;

  // Fallback: same category, exclude already fetched
  const excludeIds = [serviceId, ...companyResults.map((s) => s.id)];
  const { data: sameCategory, error: err2 } = await supabase
    .from("services")
    .select("*, consulting_companies!inner(*)")
    .eq("is_active", true)
    .eq("category", category)
    .not("id", "in", `(${excludeIds.join(",")})`)
    .limit(6 - companyResults.length);

  if (err2) console.error("fetchRelatedServices (category) error:", err2);

  const categoryResults = (sameCategory ?? []) as unknown as ServiceWithConsulting[];
  return [...companyResults, ...categoryResults];
}

/** Fetch all active services for a specific consulting company (agency). */
export async function fetchServicesByConsulting(consultingId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("consulting_id", consultingId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchServicesByConsulting error:", error);
    return [];
  }
  return (data ?? []) as unknown as Service[];
}

/** Fetch reviews for a service with pagination */
export async function fetchServiceReviews(
  serviceId: string,
  page = 1,
  pageSize = 5,
): Promise<{ reviews: ServiceReview[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [{ data, error }, { count, error: countErr }] = await Promise.all([
    supabase
      .from("service_reviews")
      .select("*")
      .eq("service_id", serviceId)
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("service_reviews")
      .select("*", { count: "exact", head: true })
      .eq("service_id", serviceId),
  ]);

  if (error) console.error("fetchServiceReviews error:", error);
  if (countErr) console.error("fetchServiceReviews count error:", countErr);

  return {
    reviews: (data ?? []) as unknown as ServiceReview[],
    total: count ?? 0,
  };
}

/** Fetch documents for a service */
export async function fetchServiceDocuments(serviceId: string): Promise<ServiceDocument[]> {
  const { data, error } = await supabase
    .from("service_documents")
    .select("*")
    .eq("service_id", serviceId)
    .order("created_at", { ascending: false });

  if (error) console.error("fetchServiceDocuments error:", error);
  return (data ?? []) as unknown as ServiceDocument[];
}

/** Fetch all distinct categories */
export async function fetchCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("services")
    .select("category")
    .eq("is_active", true)
    .order("category");

  if (error) {
    console.error("fetchCategories error:", error);
    return [];
  }

  const categories = new Set<string>();
  (data ?? []).forEach((row) => {
    const cat = (row as { category: string }).category;
    if (cat) categories.add(cat);
  });
  return Array.from(categories).sort();
}

// ── Consulting Dashboard functions ───────────────────────────

/** Get or create a consulting company for the current user */
export async function getOrCreateConsultingCompany(
  ownerId: string,
  name: string,
): Promise<ConsultingCompany | null> {
  // Try to find existing
  const { data: existing, error: fetchErr } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (fetchErr) console.error("getOrCreate fetch error:", fetchErr);
  if (existing) return existing as unknown as ConsultingCompany;

  // Create new
  const { data: created, error: insertErr } = await supabase
    .from("consulting_companies")
    .insert({ owner_id: ownerId, name })
    .select("*")
    .single();

  if (insertErr) {
    console.error("getOrCreate insert error:", insertErr);
    return null;
  }

  return created as unknown as ConsultingCompany;
}

/** Fetch consulting company for a user */
export async function fetchConsultingCompany(ownerId: string): Promise<ConsultingCompany | null> {
  const { data, error } = await supabase
    .from("consulting_companies")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) console.error("fetchConsultingCompany error:", error);
  return data as unknown as ConsultingCompany | null;
}

/** Fetch all services for a consulting company */
export async function fetchMyServices(consultingId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("consulting_id", consultingId)
    .order("created_at", { ascending: false });

  if (error) console.error("fetchMyServices error:", error);
  return (data ?? []) as unknown as Service[];
}

/** Create a new service */
export async function createService(
  consultingId: string,
  data: Partial<Service>,
): Promise<Service | null> {
  const { data: created, error } = await supabase
    .from("services")
    .insert({
      consulting_id: consultingId,
      title: data.title ?? "Untitled Service",
      description: data.description ?? "",
      long_description: data.long_description ?? [],
      cover_image: data.cover_image ?? null,
      gallery: data.gallery ?? [],
      videos: data.videos ?? [],
      category: data.category ?? "General",
      price: data.price ?? 0,
      currency: data.currency ?? "USD",
      duration: data.duration ?? null,
      delivery_time: data.delivery_time ?? null,
      benefits: data.benefits ?? [],
      requirements: data.requirements ?? [],
      process: data.process ?? [],
      faq: data.faq ?? [],
      additional_content: data.additional_content ?? [],
      seo_title: data.seo_title ?? null,
      seo_description: data.seo_description ?? null,
      seo_keywords: data.seo_keywords ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("createService error:", error);
    throw error;
  }

  return created as unknown as Service;
}

/** Update an existing service */
export async function updateService(
  id: string,
  data: Partial<Service>,
): Promise<Service | null> {
  const { data: updated, error } = await supabase
    .from("services")
    .update({
      title: data.title,
      description: data.description,
      long_description: data.long_description,
      cover_image: data.cover_image,
      gallery: data.gallery,
      videos: data.videos,
      category: data.category,
      price: data.price,
      currency: data.currency,
      duration: data.duration,
      delivery_time: data.delivery_time,
      benefits: data.benefits,
      requirements: data.requirements,
      process: data.process,
      faq: data.faq,
      additional_content: data.additional_content,
      seo_title: data.seo_title,
      seo_description: data.seo_description,
      seo_keywords: data.seo_keywords,
      is_active: data.is_active,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("updateService error:", error);
    throw error;
  }

  return updated as unknown as Service;
}

/** Delete a service */
export async function deleteService(id: string): Promise<boolean> {
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) {
    console.error("deleteService error:", error);
    return false;
  }
  return true;
}

/** Add a review */
export async function addReview(
  serviceId: string,
  userId: string,
  userName: string,
  userAvatar: string | null,
  rating: number,
  comment: string,
): Promise<ServiceReview | null> {
  const { data, error } = await supabase
    .from("service_reviews")
    .insert({
      service_id: serviceId,
      user_id: userId,
      user_name: userName,
      user_avatar: userAvatar,
      rating,
      comment,
    })
    .select("*")
    .single();

  if (error) {
    console.error("addReview error:", error);
    throw error;
  }

  return data as unknown as ServiceReview;
}

/** Recalculate service rating + review_count from reviews */
export async function recalcServiceRating(serviceId: string): Promise<void> {
  const { data, error } = await supabase
    .from("service_reviews")
    .select("rating")
    .eq("service_id", serviceId);

  if (error || !data || data.length === 0) return;

  const ratings = data as unknown as { rating: number }[];
  const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  const rounded = Math.round(avg * 10) / 10;

  await supabase
    .from("services")
    .update({ rating: rounded, review_count: ratings.length })
    .eq("id", serviceId);
}
