import type { Json } from "@/integrations/supabase/types";

/* ============================================================
   Consulting Posts — Types + Data Access Layer
   ------------------------------------------------
   Posts published by consulting companies to the public Explore
   feed. Supports images, videos, and text.

   Test-mode: stored in localStorage under the same prefix as the
   rest of the consulting test-mode layer so everything stays in
   sync. When Supabase tables are applied, the fetch functions can
   be swapped to real queries without UI changes.

   Storage keys:
     oxen.consulting.test.posts              — all posts (all companies)
     oxen.consulting.test.postLikes.<userId> — liked post ids per user
     oxen.consulting.test.postSaves.<userId> — saved post ids per user
   ============================================================ */

const POSTS_KEY = "oxen.consulting.test.posts";
const LIKES_PREFIX = "oxen.consulting.test.postLikes";
const SAVES_PREFIX = "oxen.consulting.test.postSaves";

// ── Types ──────────────────────────────────────────────────

export interface PostMedia {
  type: "image" | "video";
  url: string;
  /** Optional poster/thumbnail for videos */
  poster?: string | null;
}

export interface ConsultingPost {
  id: string;
  consulting_company_id: string;
  /** Denormalized for fast rendering without joins */
  company_name: string;
  company_logo: string | null;
  author_name: string;
  author_avatar: string | null;
  /** Post body text */
  content: string;
  /** Media gallery (images + videos) */
  media: PostMedia[];
  /** Hashtags for discoverability */
  tags: string[];
  /** Like count (denormalized for performance) */
  likes_count: number;
  /** Save/bookmark count */
  saves_count: number;
  /** Share count */
  shares_count: number;
  /** View count */
  views_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  /** Extra metadata (e.g. category) */
  metadata: Json;
}

export interface CreatePostInput {
  content: string;
  media: PostMedia[];
  tags: string[];
  is_published?: boolean;
}

// ── Helpers ────────────────────────────────────────────────

function readArr<T>(k: string): T[] {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeArr<T>(k: string, rows: T[]): void {
  try {
    localStorage.setItem(k, JSON.stringify(rows));
  } catch (e) {
    console.error("consulting-posts write failed", k, e);
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function readSet(k: string): Set<string> {
  try {
    const raw = localStorage.getItem(k);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function writeSet(k: string, set: Set<string>): void {
  try {
    localStorage.setItem(k, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

// ── Sample seed data ───────────────────────────────────────

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=70",
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=70",
  "https://images.unsplash.com/photo-1600880292203-757bb62cc4ba?w=800&q=70",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=70",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a541?w=800&q=70",
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&q=70",
];

const SAMPLE_LOGOS = [
  "https://images.unsplash.com/photo-1560179102-3d97044b2b88?w=200&q=70",
  "https://images.unsplash.com/photo-1572044054061-3cbe5b2f3b76?w=200&q=70",
  "https://images.unsplash.com/photo-1620283085439-39620a1e21c4?w=200&q=70",
];

const SAMPLE_CONTENT = [
  "Excited to announce our new Express Visa service for Canada! Processing times reduced to 15 business days. Book your consultation today. 🇨🇦",
  "Our team just helped another 50 clients achieve their study abroad dreams this month. Proud of the dedication from every consultant on our team. 🎓✨",
  "Pro tip: Start your application 4–6 months before your intended travel date. Early preparation avoids last-minute stress and increases approval rates. 📋",
  "We're hiring! Looking for experienced immigration consultants in Dubai and Riyadh. DM us or check our careers page for details. 🤝",
  "Client success story: A family of 4 approved for permanent residency in Australia after just 3 months. Congratulations to the whole family! 🎉🦘",
  "Free webinar this Thursday: 'Understanding the 2026 immigration policy changes.' Register through the link in our bio. Spaces limited! 💻",
];

const SAMPLE_TAGS = [
  ["immigration", "canada", "visa"],
  ["studyabroad", "success", "education"],
  ["protip", "immigration", "planning"],
  ["hiring", "careers", "consulting"],
  ["successstory", "australia", "pr"],
  ["webinar", "free", "2026"],
];

const SAMPLE_COMPANIES = [
  { name: "Global Visa Consulting", logo: SAMPLE_LOGOS[0] },
  { name: "Horizon Immigration", logo: SAMPLE_LOGOS[1] },
  { name: "Pathway Abroad Services", logo: SAMPLE_LOGOS[2] },
];

/**
 * Seed a handful of sample posts so the Explore feed isn't empty on first
 * visit. Only runs once (checks if posts already exist). Uses stable ids
 * so re-seeding doesn't create duplicates.
 */
export function seedSamplePostsIfNeeded(): void {
  const existing = readArr<ConsultingPost>(POSTS_KEY);
  if (existing.length > 0) return;

  const now = Date.now();
  const posts: ConsultingPost[] = SAMPLE_CONTENT.map((content, i) => {
    const company = SAMPLE_COMPANIES[i % SAMPLE_COMPANIES.length];
    const ageDays = i * 2 + 1;
    const createdAt = new Date(now - ageDays * 24 * 60 * 60 * 1000).toISOString();
    const hasMedia = i % 3 !== 2; // 2/3 of posts have media
    const media: PostMedia[] = hasMedia
      ? [
          {
            type: "image",
            url: SAMPLE_IMAGES[i % SAMPLE_IMAGES.length],
          },
          ...(i % 5 === 0
            ? [{ type: "image" as const, url: SAMPLE_IMAGES[(i + 3) % SAMPLE_IMAGES.length] }]
            : []),
        ]
      : [];

    return {
      id: `seed-post-${i}`,
      consulting_company_id: `seed-company-${i % 3}`,
      company_name: company.name,
      company_logo: company.logo,
      author_name: company.name,
      author_avatar: company.logo,
      content,
      media,
      tags: SAMPLE_TAGS[i] ?? [],
      likes_count: Math.floor(Math.random() * 300) + 20,
      saves_count: Math.floor(Math.random() * 50) + 5,
      shares_count: Math.floor(Math.random() * 30),
      views_count: Math.floor(Math.random() * 2000) + 100,
      is_published: true,
      created_at: createdAt,
      updated_at: createdAt,
      created_by: `seed-user-${i}`,
      metadata: { category: i % 2 === 0 ? "update" : "tip" } as unknown as Json,
    };
  });

  writeArr(POSTS_KEY, posts);
}

// ── Fetch ──────────────────────────────────────────────────

/**
 * Fetch published posts for the public Explore feed (all companies).
 * Returns sorted by created_at descending. Includes like/save state
 * for the current user.
 */
export function fetchExplorePosts(opts: {
  limit?: number;
  offset?: number;
  userId?: string;
} = {}): ConsultingPost[] {
  seedSamplePostsIfNeeded();
  let rows = readArr<ConsultingPost>(POSTS_KEY).filter((p) => p.is_published);

  const likedSet = opts.userId ? readSet(`${LIKES_PREFIX}.${opts.userId}`) : new Set<string>();
  const savedSet = opts.userId ? readSet(`${SAVES_PREFIX}.${opts.userId}`) : new Set<string>();

  rows = rows.map((p) => ({
    ...p,
    metadata: { ...(p.metadata as Record<string, unknown>), liked_by_me: likedSet.has(p.id), saved_by_me: savedSet.has(p.id) } as unknown as Json,
  }));

  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  if (opts.limit) {
    const start = opts.offset ?? 0;
    rows = rows.slice(start, start + opts.limit);
  }
  return rows;
}

/** Fetch a single post by id (includes user like/save state). */
export function fetchPostById(postId: string, userId?: string): ConsultingPost | null {
  seedSamplePostsIfNeeded();
  const post = readArr<ConsultingPost>(POSTS_KEY).find((p) => p.id === postId) ?? null;
  if (!post) return null;

  const likedSet = userId ? readSet(`${LIKES_PREFIX}.${userId}`) : new Set<string>();
  const savedSet = userId ? readSet(`${SAVES_PREFIX}.${userId}`) : new Set<string>();

  return {
    ...post,
    metadata: { ...(post.metadata as Record<string, unknown>), liked_by_me: likedSet.has(post.id), saved_by_me: savedSet.has(post.id) } as unknown as Json,
  };
}

/** Fetch posts for a specific company. */
export function fetchCompanyPosts(companyId: string, opts: { userId?: string } = {}): ConsultingPost[] {
  seedSamplePostsIfNeeded();
  let rows = readArr<ConsultingPost>(POSTS_KEY)
    .filter((p) => p.consulting_company_id === companyId && p.is_published);

  const likedSet = opts.userId ? readSet(`${LIKES_PREFIX}.${opts.userId}`) : new Set<string>();
  const savedSet = opts.userId ? readSet(`${SAVES_PREFIX}.${opts.userId}`) : new Set<string>();

  rows = rows.map((p) => ({
    ...p,
    metadata: { ...(p.metadata as Record<string, unknown>), liked_by_me: likedSet.has(p.id), saved_by_me: savedSet.has(p.id) } as unknown as Json,
  }));

  return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// ── Create ─────────────────────────────────────────────────

export function createPost(
  companyId: string,
  company: { name: string; logo_url: string | null },
  author: { name: string; avatar: string | null; id: string },
  input: CreatePostInput,
): ConsultingPost {
  const rows = readArr<ConsultingPost>(POSTS_KEY);
  const now = nowIso();
  const post: ConsultingPost = {
    id: uid("post"),
    consulting_company_id: companyId,
    company_name: company.name,
    company_logo: company.logo_url,
    author_name: author.name,
    author_avatar: author.avatar,
    content: input.content,
    media: input.media,
    tags: input.tags,
    likes_count: 0,
    saves_count: 0,
    shares_count: 0,
    views_count: 0,
    is_published: input.is_published ?? true,
    created_at: now,
    updated_at: now,
    created_by: author.id,
    metadata: {} as unknown as Json,
  };
  rows.push(post);
  writeArr(POSTS_KEY, rows);
  return post;
}

/** Delete a post (company owner/admin only). */
export function deletePost(companyId: string, postId: string): boolean {
  const rows = readArr<ConsultingPost>(POSTS_KEY);
  const filtered = rows.filter((p) => !(p.id === postId && p.consulting_company_id === companyId));
  writeArr(POSTS_KEY, filtered);
  return filtered.length !== rows.length;
}

// ── Like / Save / Share ────────────────────────────────────

export function togglePostLike(postId: string, userId: string): boolean {
  const k = `${LIKES_PREFIX}.${userId}`;
  const set = readSet(k);
  const isLiking = !set.has(postId);
  if (isLiking) {
    set.add(postId);
  } else {
    set.delete(postId);
  }
  writeSet(k, set);

  // Update denormalized count
  const rows = readArr<ConsultingPost>(POSTS_KEY);
  const idx = rows.findIndex((p) => p.id === postId);
  if (idx !== -1) {
    rows[idx] = {
      ...rows[idx],
      likes_count: Math.max(0, rows[idx].likes_count + (isLiking ? 1 : -1)),
    };
    writeArr(POSTS_KEY, rows);
  }
  return isLiking;
}

export function togglePostSave(postId: string, userId: string): boolean {
  const k = `${SAVES_PREFIX}.${userId}`;
  const set = readSet(k);
  const isSaving = !set.has(postId);
  if (isSaving) {
    set.add(postId);
  } else {
    set.delete(postId);
  }
  writeSet(k, set);

  const rows = readArr<ConsultingPost>(POSTS_KEY);
  const idx = rows.findIndex((p) => p.id === postId);
  if (idx !== -1) {
    rows[idx] = {
      ...rows[idx],
      saves_count: Math.max(0, rows[idx].saves_count + (isSaving ? 1 : -1)),
    };
    writeArr(POSTS_KEY, rows);
  }
  return isSaving;
}

export function incrementPostShare(postId: string): void {
  const rows = readArr<ConsultingPost>(POSTS_KEY);
  const idx = rows.findIndex((p) => p.id === postId);
  if (idx !== -1) {
    rows[idx] = { ...rows[idx], shares_count: rows[idx].shares_count + 1 };
    writeArr(POSTS_KEY, rows);
  }
}

export function incrementPostViews(postId: string): void {
  const rows = readArr<ConsultingPost>(POSTS_KEY);
  const idx = rows.findIndex((p) => p.id === postId);
  if (idx !== -1) {
    rows[idx] = { ...rows[idx], views_count: rows[idx].views_count + 1 };
    writeArr(POSTS_KEY, rows);
  }
}

/** Fetch saved posts for a user (for a "Saved" feed if needed). */
export function fetchSavedPosts(userId: string): ConsultingPost[] {
  seedSamplePostsIfNeeded();
  const savedSet = readSet(`${SAVES_PREFIX}.${userId}`);
  return readArr<ConsultingPost>(POSTS_KEY)
    .filter((p) => p.is_published && savedSet.has(p.id))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// ── Finance / Payment helpers (extends test subscription) ───

export interface InvoiceRecord {
  id: string;
  date: string;
  plan: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "refunded" | "failed";
  cardMasked: string;
  type: "subscription" | "renewal";
  invoiceNumber: string;
}

const INVOICES_KEY = "oxen.consulting.test.invoices";

/** Read invoice history (derived from subscription payment history). */
export function fetchInvoices(): InvoiceRecord[] {
  try {
    const raw = localStorage.getItem(INVOICES_KEY);
    if (raw) return JSON.parse(raw) as InvoiceRecord[];
  } catch {
    /* ignore */
  }
  // Derive from test subscription history if available
  try {
    const subRaw = localStorage.getItem("oxen.consulting.test.subscription");
    if (subRaw) {
      const sub = JSON.parse(subRaw) as {
        history: Array<{
          id: string;
          date: string;
          plan: string;
          amount: number;
          cardMasked: string;
          type: string;
        }>;
      };
      const invoices: InvoiceRecord[] = (sub.history ?? []).map((h, i) => ({
        id: h.id,
        date: h.date,
        plan: h.plan,
        amount: h.amount,
        currency: "USD",
        status: "paid" as const,
        cardMasked: h.cardMasked,
        type: h.type as "subscription" | "renewal",
        invoiceNumber: `INV-2026-${String(i + 1).padStart(4, "0")}`,
      }));
      writeArr(INVOICES_KEY, invoices);
      return invoices;
    }
  } catch {
    /* ignore */
  }
  return [];
}

/** Generate a downloadable invoice (text file). */
export function downloadInvoice(invoice: InvoiceRecord): void {
  const content = [
    "OXEN Consulting — Invoice",
    "==========================",
    `Invoice Number: ${invoice.invoiceNumber}`,
    `Date:           ${new Date(invoice.date).toLocaleDateString()}`,
    `Plan:           ${invoice.plan}`,
    `Amount:         $${invoice.amount.toLocaleString()} ${invoice.currency}`,
    `Status:         ${invoice.status.toUpperCase()}`,
    `Payment Method: ${invoice.cardMasked}`,
    `Type:           ${invoice.type}`,
    "",
    "Thank you for your business.",
    "",
    "This is a computer-generated invoice and does not require a signature.",
  ].join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.invoiceNumber}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
