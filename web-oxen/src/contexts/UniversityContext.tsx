import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  University wishlist context — mirrors TravelContext pattern        */
/*  Persists saved universities + visited list to localStorage        */
/* ------------------------------------------------------------------ */

const WISHLIST_KEY = "oxen.uni.wishlist";
const VISITED_KEY = "oxen.uni.visited";
const COMPARE_KEY = "oxen.uni.compare";

interface UniversityContextValue {
  wishlist: string[];
  visited: string[];
  compareList: string[];
  toggleWishlist: (universityId: string) => void;
  toggleVisited: (universityId: string) => void;
  toggleCompare: (universityId: string) => void;
  clearCompare: () => void;
  isWishlisted: (universityId: string) => boolean;
  isVisited: (universityId: string) => boolean;
  isInCompare: (universityId: string) => boolean;
}

const UniversityContext = createContext<UniversityContextValue | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function UniversityProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);

  useEffect(() => {
    setWishlist(load<string[]>(WISHLIST_KEY, []));
    setVisited(load<string[]>(VISITED_KEY, []));
    setCompareList(load<string[]>(COMPARE_KEY, []));
  }, []);

  const toggleWishlist = useCallback((universityId: string) => {
    setWishlist((prev) => {
      const next = prev.includes(universityId)
        ? prev.filter((id) => id !== universityId)
        : [...prev, universityId];
      save(WISHLIST_KEY, next);
      return next;
    });
  }, []);

  const toggleVisited = useCallback((universityId: string) => {
    setVisited((prev) => {
      const next = prev.includes(universityId)
        ? prev.filter((id) => id !== universityId)
        : [...prev, universityId];
      save(VISITED_KEY, next);
      return next;
    });
  }, []);

  const toggleCompare = useCallback((universityId: string) => {
    setCompareList((prev) => {
      if (prev.includes(universityId)) {
        const next = prev.filter((id) => id !== universityId);
        save(COMPARE_KEY, next);
        return next;
      }
      if (prev.length >= 5) return prev;
      const next = [...prev, universityId];
      save(COMPARE_KEY, next);
      return next;
    });
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
    save(COMPARE_KEY, []);
  }, []);

  const isWishlisted = useCallback((id: string) => wishlist.includes(id), [wishlist]);
  const isVisited = useCallback((id: string) => visited.includes(id), [visited]);
  const isInCompare = useCallback((id: string) => compareList.includes(id), [compareList]);

  const value = useMemo<UniversityContextValue>(
    () => ({
      wishlist,
      visited,
      compareList,
      toggleWishlist,
      toggleVisited,
      toggleCompare,
      clearCompare,
      isWishlisted,
      isVisited,
      isInCompare,
    }),
    [wishlist, visited, compareList, toggleWishlist, toggleVisited, toggleCompare, clearCompare, isWishlisted, isVisited, isInCompare],
  );

  return <UniversityContext.Provider value={value}>{children}</UniversityContext.Provider>;
}

export function useUniversity(): UniversityContextValue {
  const ctx = useContext(UniversityContext);
  if (!ctx) throw new Error("useUniversity must be used within a UniversityProvider");
  return ctx;
}
