import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Itinerary } from "@/lib/ai";

/* ------------------------------------------------------------------ */
/*  Data models                                                        */
/* ------------------------------------------------------------------ */

export interface SavedItinerary extends Itinerary {
  id: string;
  prompt: string;
  createdAt: number;
}

export interface Story {
  id: string;
  type: "image" | "video";
  dataUrl: string;
  caption: string;
  createdAt: number;
}

export interface PostMedia {
  type: "image" | "video";
  dataUrl: string;
}

export interface Post {
  id: string;
  media: PostMedia[];
  caption: string;
  location: string;
  country: string;
  city: string;
  hashtags: string[];
  createdAt: number;
}

export interface ExtendedProfile {
  fullName: string;
  username: string;
  bio: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other" | "prefer-not-say";
  country: string;
  city: string;
}

export const DEFAULT_PROFILE: ExtendedProfile = {
  fullName: "Guest Explorer",
  username: "guest_explorer",
  bio: "Wanderlust-driven traveler exploring the world one country at a time.",
  email: "explorer@oxen.travel", 
  phone: "",
  dateOfBirth: "",
  gender: "prefer-not-say",
  country: "",
  city: "",
};

/* ------------------------------------------------------------------ */
/*  Context shape                                                      */
/* ------------------------------------------------------------------ */

interface TravelContextValue {
  wishlist: string[];
  visited: string[];
  favorites: string[];
  itineraries: SavedItinerary[];
  stories: Story[];
  posts: Post[];
  profilePhoto: string | null;
  extendedProfile: ExtendedProfile;

  toggleWishlist: (countryId: string) => void;
  toggleVisited: (countryId: string) => void;
  toggleFavorite: (countryId: string) => void;
  isWishlisted: (countryId: string) => boolean;
  isVisited: (countryId: string) => boolean;
  isFavorite: (countryId: string) => boolean;
  saveItinerary: (prompt: string, itinerary: Itinerary) => void;
  removeItinerary: (id: string) => void;
  addStory: (story: Omit<Story, "id" | "createdAt">) => void;
  removeStory: (id: string) => void;
  addPost: (post: Omit<Post, "id" | "createdAt">) => void;
  removePost: (id: string) => void;
  setProfilePhoto: (dataUrl: string | null) => void;
  updateProfile: (updates: Partial<ExtendedProfile>) => void;
}

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                               */
/* ------------------------------------------------------------------ */

const WISHLIST_KEY = "oxen.travel.wishlist";
const VISITED_KEY = "oxen.travel.visited";
const FAVORITES_KEY = "oxen.travel.favorites";
const ITINERARY_KEY = "oxen.travel.itineraries";
const STORIES_KEY = "oxen.travel.stories";
const POSTS_KEY = "oxen.travel.posts";
const PROFILE_PHOTO_KEY = "oxen.travel.profile-photo";
const PROFILE_KEY = "oxen.travel.extended-profile";

const TravelContext = createContext<TravelContextValue | null>(null);

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

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function TravelProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [profilePhoto, setProfilePhotoState] = useState<string | null>(null);
  const [extendedProfile, setExtendedProfile] = useState<ExtendedProfile>(DEFAULT_PROFILE);

  /* Hydrate from localStorage on mount */
  useEffect(() => {
    setWishlist(load<string[]>(WISHLIST_KEY, []));
    setVisited(load<string[]>(VISITED_KEY, []));
    setFavorites(load<string[]>(FAVORITES_KEY, []));
    setItineraries(load<SavedItinerary[]>(ITINERARY_KEY, []));
    setStories(load<Story[]>(STORIES_KEY, []));
    setPosts(load<Post[]>(POSTS_KEY, []));
    setProfilePhotoState(load<string | null>(PROFILE_PHOTO_KEY, null));
    setExtendedProfile({ ...DEFAULT_PROFILE, ...load<Partial<ExtendedProfile>>(PROFILE_KEY, {}) });
  }, []);

  /* ── Wishlist / visited / favorites ── */

  const toggleWishlist = useCallback((countryId: string) => {
    setWishlist((prev) => {
      const next = prev.includes(countryId) ? prev.filter((id) => id !== countryId) : [...prev, countryId];
      save(WISHLIST_KEY, next);
      return next;
    });
  }, []);

  const toggleVisited = useCallback((countryId: string) => {
    setVisited((prev) => {
      const next = prev.includes(countryId) ? prev.filter((id) => id !== countryId) : [...prev, countryId];
      save(VISITED_KEY, next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((countryId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(countryId) ? prev.filter((id) => id !== countryId) : [...prev, countryId];
      save(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const isWishlisted = useCallback((id: string) => wishlist.includes(id), [wishlist]);
  const isVisited = useCallback((id: string) => visited.includes(id), [visited]);
  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  /* ── Itineraries ── */

  const saveItinerary = useCallback((prompt: string, itinerary: Itinerary) => {
    setItineraries((prev) => {
      const entry: SavedItinerary = { ...itinerary, id: crypto.randomUUID(), prompt, createdAt: Date.now() };
      const next = [entry, ...prev];
      save(ITINERARY_KEY, next);
      return next;
    });
  }, []);

  const removeItinerary = useCallback((id: string) => {
    setItineraries((prev) => {
      const next = prev.filter((it) => it.id !== id);
      save(ITINERARY_KEY, next);
      return next;
    });
  }, []);

  /* ── Stories ── */

  const addStory = useCallback((story: Omit<Story, "id" | "createdAt">) => {
    setStories((prev) => {
      const entry: Story = { ...story, id: crypto.randomUUID(), createdAt: Date.now() };
      const next = [entry, ...prev];
      save(STORIES_KEY, next);
      return next;
    });
  }, []);

  const removeStory = useCallback((id: string) => {
    setStories((prev) => {
      const next = prev.filter((s) => s.id !== id);
      save(STORIES_KEY, next);
      return next;
    });
  }, []);

  /* ── Posts ── */

  const addPost = useCallback((post: Omit<Post, "id" | "createdAt">) => {
    setPosts((prev) => {
      const entry: Post = { ...post, id: crypto.randomUUID(), createdAt: Date.now() };
      const next = [entry, ...prev];
      save(POSTS_KEY, next);
      return next;
    });
  }, []);

  const removePost = useCallback((id: string) => {
    setPosts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      save(POSTS_KEY, next);
      return next;
    });
  }, []);

  /* ── Profile photo ── */

  const setProfilePhoto = useCallback((dataUrl: string | null) => {
    setProfilePhotoState(dataUrl);
    save(PROFILE_PHOTO_KEY, dataUrl);
  }, []);

  /* ── Extended profile ── */

  const updateProfile = useCallback((updates: Partial<ExtendedProfile>) => {
    setExtendedProfile((prev) => {
      const next = { ...prev, ...updates };
      save(PROFILE_KEY, next);
      return next;
    });
  }, []);

  /* ── Memoised value ── */

  const value = useMemo<TravelContextValue>(
    () => ({
      wishlist,
      visited,
      favorites,
      itineraries,
      stories,
      posts,
      profilePhoto,
      extendedProfile,
      toggleWishlist,
      toggleVisited,
      toggleFavorite,
      isWishlisted,
      isVisited,
      isFavorite,
      saveItinerary,
      removeItinerary,
      addStory,
      removeStory,
      addPost,
      removePost,
      setProfilePhoto,
      updateProfile,
    }),
    [
      wishlist, visited, favorites, itineraries, stories, posts, profilePhoto, extendedProfile,
      toggleWishlist, toggleVisited, toggleFavorite,
      isWishlisted, isVisited, isFavorite,
      saveItinerary, removeItinerary,
      addStory, removeStory, addPost, removePost, setProfilePhoto, updateProfile,
    ],
  );

  return <TravelContext.Provider value={value}>{children}</TravelContext.Provider>;
}

export function useTravel(): TravelContextValue {
  const ctx = useContext(TravelContext);
  if (!ctx) throw new Error("useTravel must be used within a TravelProvider");
  return ctx;
}
