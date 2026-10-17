import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  ExploreBackButton — native iOS-style back button                   */
/*  Preserves scroll position by using browser history (no reload).    */
/*  Smooth spring animation on tap.                                    */
/* ------------------------------------------------------------------ */

interface ExploreBackButtonProps {
  /** Optional fallback route if there's no history (e.g. direct link). */
  fallback?: string;
  /** Label shown next to the chevron (iOS shows the previous screen title). */
  label?: string;
  className?: string;
}

/**
 * Scroll preservation map: when we navigate TO a page from Explore,
 * we save the current scroll Y keyed by the destination path. On
 * return, the destination page's back button restores it.
 * This avoids any global scroll-restoration library and works with
 * the existing BrowserRouter (which doesn't auto-restore for
 * lazy-loaded route swaps).
 */
const SCROLL_MAP_KEY = "oxen.explore.scrollMap";

function saveScroll(path: string, y: number): void {
  try {
    const raw = sessionStorage.getItem(SCROLL_MAP_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    map[path] = y;
    sessionStorage.setItem(SCROLL_MAP_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function readScroll(path: string): number | null {
  try {
    const raw = sessionStorage.getItem(SCROLL_MAP_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return typeof map[path] === "number" ? map[path] : null;
  } catch {
    return null;
  }
}

/** Save current scroll before navigating away (call from the source page). */
export function saveExploreScroll(destPath: string): void {
  saveScroll(destPath, window.scrollY);
}

/** Restore scroll on mount of a page that was returned to. */
export function useRestoreExploreScroll(path: string): void {
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const y = readScroll(path);
    if (y !== null && y > 0) {
      // Defer until after paint so the content height is correct
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }));
    }
  }, [path]);
}

export function ExploreBackButton({
  fallback = "/explore",
  label = "Back",
  className,
}: ExploreBackButtonProps) {
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    // Save where we are so a future forward-navigation can restore
    saveScroll(fallback, window.scrollY);
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  }, [navigate, fallback]);

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      whileTap={{ scale: 0.94 }}
      onClick={handleBack}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-foreground backdrop-blur-xl transition hover:bg-white/[0.1]",
        className,
      )}
      aria-label="Go back"
    >
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
      {label}
    </motion.button>
  );
}
