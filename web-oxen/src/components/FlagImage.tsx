import { useState, useEffect } from "react";

import { resolveFlagUrl, hasFailed, markFailed, markLoaded, PLACEHOLDERS } from "@/lib/media";

/* ------------------------------------------------------------------ */
/*  FlagImage — Offline-aware flag renderer (emoji + SVG fallback)     */
/* ------------------------------------------------------------------ */

export interface FlagImageProps {
  /** ISO 3166-1 alpha-2 code (e.g. "us", "jp", "uz") */
  isoCode?: string | null;
  /** Emoji flag as offline fallback (always available) */
  emoji?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Image className */
  className?: string;
  /** Container className for the wrapper */
  containerClassName?: string;
  /** Width of the flag image */
  width?: number;
  /** Height of the flag image */
  height?: number;
}

/**
 * Renders a country flag with offline support.
 *
 * Priority chain:
 *   1. flagcdn SVG (cached by Service Worker for offline use)
 *   2. Emoji flag (always available — no network needed)
 *   3. Placeholder
 *
 * The emoji is always rendered as a fallback layer behind the image,
 * so if the SVG fails to load, the emoji is already visible.
 */
export function FlagImage({
  isoCode,
  emoji,
  alt = "",
  className = "",
  containerClassName = "",
  width = 160,
  height = 108,
}: FlagImageProps) {
  const flagUrl = resolveFlagUrl(isoCode);
  const [imageError, setImageError] = useState<boolean>(() => {
    if (!flagUrl) return true;
    return hasFailed(flagUrl);
  });

  // Reset error state when ISO code changes
  useEffect(() => {
    if (!flagUrl) {
      setImageError(true);
      return;
    }
    setImageError(hasFailed(flagUrl));
  }, [flagUrl]);

  const handleImageError = () => {
    if (flagUrl) markFailed(flagUrl);
    setImageError(true);
  };

  const handleImageLoad = () => {
    if (flagUrl) markLoaded(flagUrl);
  };

  // No ISO code — show emoji only
  if (!flagUrl || imageError) {
    return (
      <div
        className={`flex items-center justify-center bg-white/[0.03] ${containerClassName}`}
        style={{ width, height }}
        aria-label={alt}
      >
        <span className="select-none text-5xl" aria-hidden>
          {emoji ?? "🏳️"}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${containerClassName}`}
      style={{ width, height }}
    >
      {/* Emoji fallback layer — always rendered behind the image */}
      {emoji && (
        <span
          className="absolute inset-0 flex items-center justify-center text-5xl select-none"
          style={{ zIndex: 0, opacity: 0 }}
          aria-hidden
        >
          {emoji}
        </span>
      )}
      {/* SVG flag image on top */}
      <img
        src={flagUrl}
        alt={alt}
        className={`relative h-full w-full object-cover ${className}`}
        style={{ zIndex: 1 }}
        loading="lazy"
        decoding="async"
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </div>
  );
}

export default FlagImage;
