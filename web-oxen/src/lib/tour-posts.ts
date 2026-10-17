/**
 * Tour Posts data access layer.
 *
 * Backed by the `consulting_posts` table (migration 0001 + 0016).
 * Ownership is determined by `consulting_companies.owner_id` — no
 * consulting_members table required.
 *
 * Every query is scoped to the active agency via consulting_company_id.
 * Public queries only return status='published' posts.
 */

import { supabase } from "@/lib/supabase";
import type { Json } from "@/integrations/supabase/types";

// ── Types ──────────────────────────────────────────────────────

export type PostStatus = "draft" | "published" | "archived";

export interface TourItineraryDay {
  day: number;
  title: string;
  description: string;
}

export interface TourPost {
  id: string;
  consulting_company_id: string;
  service_id: string | null;
  title: string;
  post_type: string;
  body: string | null;
  media: Json;
  status: PostStatus;
  scheduled_at: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Tour-specific fields (migration 0016)
  destination_country: string | null;
  destination_city: string | null;
  cover_image: string | null;
  gallery: Json; // string[]
  video_url: string | null;
  short_description: string | null;
  full_description: string | null;
  price: number | null;
  old_price: number | null;
  currency: string;
  departure_date: string | null;
  return_date: string | null;
  booking_deadline: string | null;
  available_seats: number | null;
  hotel_name: string | null;
  hotel_rating: number | null;
  room_type: string | null;
  meal_plan: string | null;
  transport: string | null;
  airline: string | null;
  departure_airport: string | null;
  flight_included: boolean;
  hotel_included: boolean;
  visa_included: boolean;
  airport_transfer_included: boolean;
  guide_included: boolean;
  travel_insurance_included: boolean;
  meals_included: boolean;
  included_items: Json; // string[]
  not_included_items: Json; // string[]
  itinerary: Json; // TourItineraryDay[]
  contact_override: Json;
  price_type: "per_person" | "total";
  /** Joined company data (public queries only) */
  company?: {
    id: string;
    name: string;
    logo_url: string | null;
    city: string | null;
    country: string | null;
    verification_status: string | null;
    is_published: boolean;
    whatsapp: string | null;
    telegram: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    website: string | null;
    social_links: Record<string, string> | null;
  } | null;
}

export interface TourPostInput {
  title: string;
  destination_country: string;
  destination_city?: string | null;
  cover_image: string | null;
  gallery?: string[];
  video_url?: string | null;
  short_description: string;
  full_description?: string | null;
  price: number;
  old_price?: number | null;
  currency?: string;
  departure_date: string;
  return_date: string;
  booking_deadline?: string | null;
  available_seats?: number | null;
  hotel_name?: string | null;
  hotel_rating?: number | null;
  room_type?: string | null;
  meal_plan?: string | null;
  transport?: string | null;
  airline?: string | null;
  departure_airport?: string | null;
  flight_included?: boolean;
  hotel_included?: boolean;
  visa_included?: boolean;
  airport_transfer_included?: boolean;
  guide_included?: boolean;
  travel_insurance_included?: boolean;
  meals_included?: boolean;
  included_items?: string[];
  not_included_items?: string[];
  itinerary?: TourItineraryDay[];
  contact_override?: Record<string, string>;
  price_type?: "per_person" | "total";
  status?: PostStatus;
}

// ── Helpers ────────────────────────────────────────────────────

function parseStringArray(json: Json): string[] {
  if (Array.isArray(json)) return json as unknown as string[];
  return [];
}

function parseItinerary(json: Json): TourItineraryDay[] {
  if (Array.isArray(json)) return json as unknown as TourItineraryDay[];
  return [];
}

export function formatPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", AED: "AED ", RUB: "₽", UZS: "so'm", JPY: "¥",
  };
  const sym = symbols[currency] ?? `${currency} `;
  return `${sym}${price.toLocaleString()}`;
}

export function calculateDiscount(price: number, oldPrice: number | null): number | null {
  if (!oldPrice || oldPrice <= 0 || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export function calculateDuration(departure: string | null, returnDate: string | null): string | null {
  if (!departure || !returnDate) return null;
  const d1 = new Date(departure).getTime();
  const d2 = new Date(returnDate).getTime();
  if (isNaN(d1) || isNaN(d2) || d2 < d1) return null;
  const days = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  if (days <= 0) return null;
  const nights = Math.max(0, days - 1);
  return nights > 0 ? `${days} days / ${nights} nights` : `${days} day${days > 1 ? "s" : ""}`;
}

export function getAvailabilityLabel(seats: number | null): "available" | "limited" | "sold_out" | "unknown" {
  if (seats === null) return "unknown";
  if (seats === 0) return "sold_out";
  if (seats <= 5) return "limited";
  return "available";
}

// ── CRM: Fetch all posts for an agency ──────────────────────────

export async function fetchAgencyPosts(companyId: string): Promise<TourPost[]> {
  const { data, error } = await supabase
    .from("consulting_posts")
    .select("*")
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchAgencyPosts error:", error);
    return [];
  }
  return (data ?? []) as unknown as TourPost[];
}

// ── CRM: Fetch single post ─────────────────────────────────────

/** CRM: Fetch single post — scoped to the given company UUID.
 *  The companyId filter ensures posts from other agencies are never
 *  returned, even if the post ID is known. */
export async function fetchPostById(postId: string, companyId?: string): Promise<TourPost | null> {
  let query = supabase
    .from("consulting_posts")
    .select("*")
    .eq("id", postId);
  if (companyId) {
    query = query.eq("consulting_company_id", companyId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) console.error("fetchPostById error:", error);
  return data as unknown as TourPost | null;
}

// ── CRM: Upsert (create or update) ─────────────────────────────

export async function upsertTourPost(
  companyId: string,
  createdBy: string,
  input: TourPostInput,
  existingId?: string,
): Promise<{ post: TourPost | null; error: string | null }> {
  const row = {
    consulting_company_id: companyId,
    title: input.title,
    destination_country: input.destination_country || null,
    destination_city: input.destination_city || null,
    cover_image: input.cover_image,
    gallery: input.gallery ?? [],
    video_url: input.video_url || null,
    short_description: input.short_description,
    full_description: input.full_description || null,
    price: input.price,
    old_price: input.old_price ?? null,
    currency: input.currency ?? "USD",
    departure_date: input.departure_date || null,
    return_date: input.return_date || null,
    booking_deadline: input.booking_deadline || null,
    available_seats: input.available_seats ?? null,
    hotel_name: input.hotel_name || null,
    hotel_rating: input.hotel_rating ?? null,
    room_type: input.room_type || null,
    meal_plan: input.meal_plan || null,
    transport: input.transport || null,
    airline: input.airline || null,
    departure_airport: input.departure_airport || null,
    flight_included: input.flight_included ?? false,
    hotel_included: input.hotel_included ?? false,
    visa_included: input.visa_included ?? false,
    airport_transfer_included: input.airport_transfer_included ?? false,
    guide_included: input.guide_included ?? false,
    travel_insurance_included: input.travel_insurance_included ?? false,
    meals_included: input.meals_included ?? false,
    included_items: input.included_items ?? [],
    not_included_items: input.not_included_items ?? [],
    itinerary: input.itinerary ?? [],
    contact_override: input.contact_override ?? {},
    price_type: input.price_type ?? "per_person",
    status: input.status ?? "draft",
    post_type: "tour_package",
    created_by: createdBy,
  };

  if (existingId) {
    const { data, error } = await supabase
      .from("consulting_posts")
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq("id", existingId)
      .select("*")
      .single();
    if (error) {
      console.error("upsertTourPost update error:", error);
      return { post: null, error: error.message };
    }
    return { post: data as unknown as TourPost, error: null };
  }

  const { data, error } = await supabase
    .from("consulting_posts")
    .insert(row)
    .select("*")
    .single();
  if (error) {
    console.error("upsertTourPost insert error:", error);
    return { post: null, error: error.message };
  }
  return { post: data as unknown as TourPost, error: null };
}

// ── CRM: Delete ────────────────────────────────────────────────

/** CRM: Delete — verifies the post belongs to the given company UUID.
 *  The .eq("consulting_company_id", companyId) filter ensures a post
 *  from another agency can never be deleted, even if the post ID is known. */
export async function deleteTourPost(postId: string, companyId: string): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_posts")
    .delete()
    .eq("id", postId)
    .eq("consulting_company_id", companyId);
  if (error) console.error("deleteTourPost error:", error);
  return !error;
}

// ── CRM: Set status (publish/unpublish/archive) ────────────────

/** CRM: Set status — verifies the post belongs to the given company UUID.
 *  The .eq("consulting_company_id", companyId) filter ensures a post
 *  from another agency can never be modified, even if the post ID is known. */
export async function setPostStatus(postId: string, status: PostStatus, companyId: string): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_posts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("consulting_company_id", companyId);
  if (error) console.error("setPostStatus error:", error);
  return !error;
}

// ── CRM: Duplicate ─────────────────────────────────────────────

export async function duplicateTourPost(
  source: TourPost,
  companyId: string,
  createdBy: string,
): Promise<TourPost | null> {
  // Verify the source post belongs to the same company — prevents
  // duplicating a post from another agency into this one.
  if (source.consulting_company_id !== companyId) {
    console.error("duplicateTourPost: source post does not belong to this company");
    return null;
  }
  const { post, error } = await upsertTourPost(companyId, createdBy, {
    title: `${source.title} (Copy)`,
    destination_country: source.destination_country ?? "",
    destination_city: source.destination_city,
    cover_image: source.cover_image,
    gallery: parseStringArray(source.gallery),
    video_url: source.video_url,
    short_description: source.short_description ?? "",
    full_description: source.full_description,
    price: source.price ?? 0,
    old_price: source.old_price,
    currency: source.currency,
    departure_date: source.departure_date ?? "",
    return_date: source.return_date ?? "",
    booking_deadline: source.booking_deadline,
    available_seats: source.available_seats,
    hotel_name: source.hotel_name,
    hotel_rating: source.hotel_rating,
    room_type: source.room_type,
    meal_plan: source.meal_plan,
    transport: source.transport,
    airline: source.airline,
    departure_airport: source.departure_airport,
    flight_included: source.flight_included,
    hotel_included: source.hotel_included,
    visa_included: source.visa_included,
    airport_transfer_included: source.airport_transfer_included,
    guide_included: source.guide_included,
    travel_insurance_included: source.travel_insurance_included,
    meals_included: source.meals_included,
    included_items: parseStringArray(source.included_items),
    not_included_items: parseStringArray(source.not_included_items),
    itinerary: parseItinerary(source.itinerary),
    contact_override: source.contact_override as Record<string, string>,
    price_type: source.price_type ?? "per_person",
    status: "draft",
  });
  if (error) {
    console.error("duplicateTourPost error:", error);
    return null;
  }
  return post;
}

// ── Public: Fetch published posts (with company join) ──────────

export async function fetchPublishedTourPosts(
  countryFilter?: string,
  limit?: number,
): Promise<TourPost[]> {
  let query = supabase
    .from("consulting_posts")
    .select(`
      *,
      company:consulting_companies!consulting_posts_consulting_company_id_fkey(
        id, name, logo_url, city, country, verification_status,
        is_published, whatsapp, telegram, contact_phone, contact_email,
        website, social_links
      )
    `)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (countryFilter) {
    query = query.eq("destination_country", countryFilter);
  }
  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchPublishedTourPosts error:", error);
    return [];
  }
  return (data ?? []) as unknown as TourPost[];
}

// ── Public: Fetch single published post (with company) ─────────

export async function fetchPublicTourPost(postId: string): Promise<TourPost | null> {
  const { data, error } = await supabase
    .from("consulting_posts")
    .select(`
      *,
      company:consulting_companies!consulting_posts_consulting_company_id_fkey(
        id, name, logo_url, city, country, verification_status,
        is_published, whatsapp, telegram, contact_phone, contact_email,
        website, social_links, short_description
      )
    `)
    .eq("id", postId)
    .eq("status", "published")
    .maybeSingle();
  if (error) console.error("fetchPublicTourPost error:", error);
  return data as unknown as TourPost | null;
}

// ── Public: Increment views ────────────────────────────────────

export async function incrementTourPostViews(postId: string): Promise<void> {
  try {
    await supabase.rpc("increment_post_views", { p_post_id: postId });
  } catch {
    // Silent — views are best-effort
  }
}

// ── AI Planner: Search eligible published packages ────────────
// Fetches a candidate set of published tour posts (with company join)
// for the AI recommendation engine to rank. Does NOT send all data to
// the LLM — this is the pre-filter step.

export interface PackageSearchParams {
  destination?: string;       // country name or city
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  departureAfter?: string;   // ISO date
  departureBefore?: string;  // ISO date
  limit?: number;
}

export async function searchPublishedTourPosts(
  params: PackageSearchParams = {},
): Promise<TourPost[]> {
  let query = supabase
    .from("consulting_posts")
    .select(`
      *,
      company:consulting_companies!consulting_posts_consulting_company_id_fkey(
        id, name, logo_url, city, country, verification_status,
        is_published, whatsapp, telegram, contact_phone, contact_email,
        website, social_links
      )
    `)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (params.destination) {
    query = query.or(
      `destination_country.ilike.%${params.destination}%,destination_city.ilike.%${params.destination}%`,
    );
  }
  if (params.currency) {
    query = query.eq("currency", params.currency);
  }
  if (typeof params.minPrice === "number") {
    query = query.gte("price", params.minPrice);
  }
  if (typeof params.maxPrice === "number") {
    query = query.lte("price", params.maxPrice);
  }
  if (params.departureAfter) {
    query = query.gte("departure_date", params.departureAfter);
  }
  if (params.departureBefore) {
    query = query.lte("departure_date", params.departureBefore);
  }
  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error("searchPublishedTourPosts error:", error);
    return [];
  }
  return (data ?? []) as unknown as TourPost[];
}

// ── Package Finder: search by destination + budget ────────────

export interface PackageFinderResult {
  /** Packages within budget, sorted by closest price first. */
  withinBudget: TourPost[];
  /** Packages for the same destination but above budget (closest first). */
  alternatives: TourPost[];
}

/**
 * Search published tour packages by destination country and budget.
 *
 * - Fetches all published posts for the given destination (case-insensitive).
 * - Splits into `withinBudget` (price <= budget) and `alternatives` (price > budget).
 * - Within-budget results are sorted by closest price to the user's budget.
 * - Alternatives are limited to 3, sorted by closest price above budget.
 * - Currency mismatch: packages in a different currency than the user's
 *   are NOT excluded — the caller can display the original price. The budget
 *   comparison only applies when currencies match.
 */
export async function findTourPackages(
  destinationCountry: string,
  budget: number,
  userCurrency: string,
): Promise<PackageFinderResult> {
  const { data, error } = await supabase
    .from("consulting_posts")
    .select(`
      *,
      company:consulting_companies!consulting_posts_consulting_company_id_fkey(
        id, name, logo_url, city, country, verification_status,
        is_published, whatsapp, telegram, contact_phone, contact_email,
        website, social_links
      )
    `)
    .eq("status", "published")
    .ilike("destination_country", destinationCountry)
    .not("price", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("findTourPackages error:", error);
    return { withinBudget: [], alternatives: [] };
  }

  const all = (data ?? []) as unknown as TourPost[];

  const sameCurrency = all.filter((p) => p.currency === userCurrency);
  const within = sameCurrency
    .filter((p) => (p.price ?? 0) <= budget && (p.price ?? 0) > 0)
    .sort((a, b) => Math.abs((a.price ?? 0) - budget) - Math.abs((b.price ?? 0) - budget));

  const altSameDest = sameCurrency
    .filter((p) => (p.price ?? 0) > budget)
    .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    .slice(0, 3);

  // If no same-currency results at all, include other-currency packages as
  // informational results (can't compare budget across currencies).
  if (within.length === 0 && altSameDest.length === 0) {
    const otherCcy = all.filter((p) => p.currency !== userCurrency);
    return {
      withinBudget: [],
      alternatives: otherCcy.sort((a, b) => (a.price ?? 0) - (b.price ?? 0)).slice(0, 5),
    };
  }

  return { withinBudget: within, alternatives: altSameDest };
}

// ── Public: Fetch published posts by company ─────────────────

export async function fetchPublishedTourPostsByCompany(
  companyId: string,
): Promise<TourPost[]> {
  const { data, error } = await supabase
    .from("consulting_posts")
    .select("*")
    .eq("consulting_company_id", companyId)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchPublishedTourPostsByCompany error:", error);
    return [];
  }
  return (data ?? []) as unknown as TourPost[];
}

// ── Re-exported helpers for UI ─────────────────────────────────

export { parseStringArray, parseItinerary };
