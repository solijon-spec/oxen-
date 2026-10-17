import { useEffect, useState, useMemo, type ImgHTMLAttributes } from "react";

import {
  resolveMedia,
  markLoaded,
  markFailed,
  hasFailed,
  PLACEHOLDERS,
  type MediaResolveOptions,
} from "@/lib/media";

/* ------------------------------------------------------------------ */
/*  OptimizedImage — offline-aware image with lazy loading + fallback  */
/* ------------------------------------------------------------------ */

export interface OptimizedImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  /** Remote URL (Unsplash, Supabase, etc.) */
  src: string | undefined | null;
  /** Local asset path to try first (priority 1) */
  localPath?: string | null;
  /** Placeholder type — determines fallback image */
  placeholderType?: "country" | "university" | "post" | "avatar" | "video" | "generic";
  /** Whether to skip remote entirely (offline-first for static assets) */
  localOnly?: boolean;
  /** Show a shimmer/skeleton while loading */
  showSkeleton?: boolean;
}

const PLACEHOLDER_MAP: Record<NonNullable<OptimizedImageProps["placeholderType"]>, string> = {
  country: PLACEHOLDERS.country,
  university: PLACEHOLDERS.university,
  post: PLACEHOLDERS.post,
  avatar: PLACEHOLDERS.avatar,
  video: PLACEHOLDERS.video,
  generic: PLACEHOLDERS.generic,
};

/**
 * Drop-in replacement for `<img>` that implements the media priority chain:
 * local asset → SW cache → remote → placeholder.
 *
 * - Lazy loading by default (`loading="lazy"`)
 * - On error, automatically falls back to placeholder
 * - Tracks load/fail state to avoid repeated broken requests
 * - Never shows a broken image icon
 */
export function OptimizedImage({
  src,
  localPath = null,
  placeholderType = "generic",
  localOnly = false,
  showSkeleton = false,
  className,
  onLoad,
  onError,
  alt = "",
  ...rest
}: OptimizedImageProps) {
  const placeholder = PLACEHOLDER_MAP[placeholderType];
  const options: MediaResolveOptions = { localPath, placeholder, localOnly };

  const resolvedSrc = useMemo(() => resolveMedia(src, options), [src, localPath, placeholder, localOnly]);

  // If the remote URL already failed before, start with placeholder
  const [currentSrc, setCurrentSrc] = useState<string>(() => {
    if (src && hasFailed(src)) return placeholder;
    return resolvedSrc;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!showSkeleton ? false : Boolean(src && !hasFailed(src)));

  // Re-resolve when src changes
  useEffect(() => {
    if (src && hasFailed(src)) {
      setCurrentSrc(placeholder);
      setIsLoading(false);
    } else {
      setCurrentSrc(resolvedSrc);
      setIsLoading(showSkeleton && Boolean(src));
    }
  }, [resolvedSrc, src, placeholder, showSkeleton]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (src) markLoaded(src);
    setIsLoading(false);
    onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (src) markFailed(src);
    // If we were showing the remote URL, fall back to placeholder
    if (currentSrc !== placeholder) {
      setCurrentSrc(placeholder);
      setIsLoading(false);
    }
    onError?.(e);
  };

  return (
    <>
      {isLoading && (
        <div
          className={`absolute inset-0 animate-pulse bg-white/[0.04] ${className ?? ""}`}
          aria-hidden
        />
      )}
      <img
        {...rest}
        src={currentSrc}
        alt={alt}
        className={className}
        loading={rest.loading ?? "lazy"}
        decoding={rest.decoding ?? "async"}
        onLoad={handleLoad}
        onError={handleError}
      />
    </>
  );
}

export default OptimizedImage;
