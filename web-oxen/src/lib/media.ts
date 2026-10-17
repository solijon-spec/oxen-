/**
 * Offline Media System — Centralized media resolution with priority chain.
 *
 * Priority order:
 *   1. Local bundled assets (/assets/...)
 *   2. Service Worker cached responses (handled transparently by SW)
 *   3. Supabase / remote URLs (fetched and cached on first load)
 *   4. Local placeholder fallback
 *
 * The resolver never throws — it always returns a usable src.
 */

/* ── Asset path prefixes ─────────────────────────────────────────── */

export const ASSET_PATHS = {
  flags: "/assets/flags",
  countries: "/assets/countries",
  universities: "/assets/universities",
  posts: "/assets/posts",
  videos: "/assets/videos",
  icons: "/assets/icons",
  logos: "/assets/logos",
  avatars: "/assets/avatars",
} as const;

/* ── Placeholder paths (bundled, always available offline) ────────── */

export const PLACEHOLDERS = {
  country: "/assets/countries/placeholder.svg",
  university: "/assets/universities/placeholder.svg",
  universityLogo: "/assets/universities/logo-placeholder.svg",
  post: "/assets/posts/placeholder.svg",
  avatar: "/assets/avatars/placeholder.svg",
  video: "/assets/videos/placeholder.svg",
  generic: "/placeholder.svg",
} as const;

/* ── Known external media hosts ──────────────────────────────────── */

const MEDIA_HOSTS = [
  "images.unsplash.com",
  "i.pravatar.cc",
  "flagcdn.com",
  "commondatastorage.googleapis.com",
  "rork.app",
];

/**
 * Check if a URL is from a known external media host.
 */
export function isExternalMediaUrl(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    return MEDIA_HOSTS.some((h) => u.hostname.includes(h));
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a local bundled asset.
 */
export function isLocalAsset(url: string): boolean {
  return url.startsWith("/assets/") || url.startsWith("/placeholder.svg");
}

/**
 * Check if a URL is a Supabase Storage URL.
 */
export function isSupabaseUrl(url: string): boolean {
  return url.includes("supabase.co") || url.includes("supabase.in");
}

/* ── Image cache: track which URLs have been successfully loaded ──── */

const loadedUrls = new Set<string>();
const failedUrls = new Set<string>();

/**
 * Mark a URL as successfully loaded (used by OptimizedImage).
 */
export function markLoaded(url: string): void {
  loadedUrls.add(url);
  failedUrls.delete(url);
}

/**
 * Mark a URL as failed (used by OptimizedImage).
 */
export function markFailed(url: string): void {
  failedUrls.add(url);
}

/**
 * Check if a URL has been successfully loaded before.
 */
export function isLoaded(url: string): boolean {
  return loadedUrls.has(url);
}

/**
 * Check if a URL has previously failed to load.
 */
export function hasFailed(url: string): boolean {
  return failedUrls.has(url);
}

/* ── Media resolver ──────────────────────────────────────────────── */

export interface MediaResolveOptions {
  /** Local asset path to try first (e.g. "/assets/countries/japan.svg") */
  localPath?: string | null;
  /** Placeholder to use if everything else fails */
  placeholder?: string;
  /** Whether to skip the remote URL entirely (offline-first for static assets) */
  localOnly?: boolean;
}

/**
 * Resolve a media URL with the priority chain.
 *
 * @param remoteUrl - The original remote URL (Unsplash, Supabase, etc.)
 * @param options - Resolution options
 * @returns The best available URL (never null)
 */
export function resolveMedia(
  remoteUrl: string | undefined | null,
  options: MediaResolveOptions = {},
): string {
  const {
    localPath = null,
    placeholder = PLACEHOLDERS.generic,
    localOnly = false,
  } = options;

  // 1. Local bundled asset — always available offline
  if (localPath) return localPath;

  // 2. If local-only mode and no local path, go straight to placeholder
  if (localOnly) return placeholder;

  // 3. If the URL previously failed, use placeholder
  if (remoteUrl && hasFailed(remoteUrl)) return placeholder;

  // 4. Remote URL (SW will serve from cache if available)
  if (remoteUrl) return remoteUrl;

  // 5. Fallback placeholder
  return placeholder;
}

/* ── Flag resolution ─────────────────────────────────────────────── */

/**
 * Build a local flag path from ISO code.
 * Flags are emoji-based in the data (always offline), but for image
 * rendering we fall back to flagcdn (cached by SW) then emoji.
 */
export function localFlagPath(isoCode: string): string {
  return `${ASSET_PATHS.flags}/${isoCode}.svg`;
}

/**
 * Resolve flag image URL — tries flagcdn (cached by SW), falls back to emoji.
 * The flagcdn URL is kept because flags are SVG and very small; the SW
 * caches them for offline use.
 */
export function resolveFlagUrl(isoCode: string | null | undefined): string | null {
  if (!isoCode) return null;
  // flagcdn SVGs are tiny (~2-5KB) and cache very well
  return `https://flagcdn.com/${isoCode}.svg`;
}

/* ── Country cover image resolution ──────────────────────────────── */

/**
 * Build a local country cover image path.
 * Currently no local country images are bundled — this returns null
 * so the resolver falls through to remote/placeholder.
 */
export function localCountryImage(countryId: string): string | null {
  // No local country images bundled yet — return null to use remote
  return null;
}

/* ── University image resolution ─────────────────────────────────── */

/**
 * Build a local university logo path.
 */
export function localUniversityLogo(uniId: string): string | null {
  // No local university logos bundled yet — return null to use remote
  return null;
}

/**
 * Build a local university cover image path.
 */
export function localUniversityCover(uniId: string): string | null {
  // No local university covers bundled yet — return null to use remote
  return null;
}

/* ── Avatar resolution ───────────────────────────────────────────── */

/**
 * Resolve an avatar URL — tries local placeholder for failed URLs.
 */
export function resolveAvatar(remoteUrl: string | undefined | null): string {
  if (!remoteUrl) return PLACEHOLDERS.avatar;
  if (hasFailed(remoteUrl)) return PLACEHOLDERS.avatar;
  return remoteUrl;
}

/* ── Prefetch helper ─────────────────────────────────────────────── */

/**
 * Prefetch an image URL to warm the browser + SW cache.
 * Silent no-op if the URL is invalid or prefetch fails.
 */
export function prefetchImage(url: string): void {
  if (!url || isLocalAsset(url)) return;
  const img = new Image();
  img.loading = "lazy";
  img.src = url;
}

/**
 * Prefetch multiple image URLs in parallel.
 */
export function prefetchImages(urls: string[]): void {
  urls.forEach((u) => prefetchImage(u));
}
