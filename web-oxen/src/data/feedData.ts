/* ------------------------------------------------------------------ */
/*  Seed data for the horizontal post feed and categorized destinations */
/* ------------------------------------------------------------------ */

export interface FeedPost {
  id: string;
  coverUrl: string;
  avatarUrl: string;
  username: string;
  userId: string;
  flag: string;
  country: string;
  city: string;
  caption: string;
  likes: number;
  comments: number;
  liked?: boolean;
  saved?: boolean;
  isVideo?: boolean;
  videoUrl?: string;
}

/* ── Comment types ────────────────────────────────────────────────── */

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  avatarUrl: string;
  text: string;
  createdAt: number;
  likes: number;
  likedBy: string[];
  parentId: string | null;
  edited?: boolean;
}

export interface TrendingDestination {
  id: string;
  imageUrl: string;
  flag: string;
  country: string;
  city: string;
  visitors: string;
  rating: number;
  videoUrl: string | null;
  description: string;
  category?: DestinationCategory;
}

export type DestinationCategory =
  | "trending"
  | "most-visited"
  | "most-loved"
  | "popular-cities"
  | "beaches"
  | "mountains"
  | "modern-cities"
  | "historical";

/* ── Horizontal feed posts ────────────────────────────────────────── */

export const FEED_POSTS: FeedPost[] = [
  {
    id: "fp-1",
    coverUrl: "https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=800&h=600&fit=crop",
    avatarUrl: "https://i.pravatar.cc/150?img=12",
    username: "wanderlust_sara",
    userId: "u-sara",
    flag: "🇯🇵",
    country: "Japan",
    city: "Kyoto",
    caption: "Cherry blossoms in full bloom at the Fushimi Inari shrine gate ✨",
    likes: 2847,
    comments: 184,
  },
  {
    id: "fp-2",
    coverUrl: "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=800&h=600&fit=crop",
    avatarUrl: "https://i.pravatar.cc/150?img=24",
    username: "nomad_max",
    userId: "u-max",
    flag: "🇫🇷",
    country: "France",
    city: "Paris",
    caption: "Golden hour over the Seine — the city of light never disappoints 🌅",
    likes: 5123,
    comments: 297,
  },
  {
    id: "fp-3",
    coverUrl: "https://images.unsplash.com/photo-1518684079-3e8a8db71f38?w=800&h=600&fit=crop",
    avatarUrl: "https://i.pravatar.cc/150?img=33",
    username: "travel_dani",
    userId: "u-dani",
    flag: "🇬🇷",
    country: "Greece",
    city: "Santorini",
    caption: "Blue domes and white walls — Santorini at sunset is pure magic 💙",
    likes: 7801,
    comments: 412,
  },
  {
    id: "fp-4",
    coverUrl: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&h=600&fit=crop",
    avatarUrl: "https://i.pravatar.cc/150?img=45",
    username: "explorer_kenji",
    userId: "u-kenji",
    flag: "🇹🇭",
    country: "Thailand",
    city: "Chiang Mai",
    caption: "Temple hopping in Northern Thailand 🙏 The detail is unreal.",
    likes: 1932,
    comments: 88,
  },
  {
    id: "fp-5",
    coverUrl: "https://images.unsplash.com/photo-1500052326673-9d3b78b6f83b?w=800&h=600&fit=crop",
    avatarUrl: "https://i.pravatar.cc/150?img=8",
    username: "the_globe_trotter",
    userId: "guest-explorer",
    flag: "🇮🇹",
    country: "Italy",
    city: "Amalfi Coast",
    caption: "Cliffside villages and lemon groves. The Amalfi Coast is a dream 🍋",
    likes: 6450,
    comments: 356,
  },
  {
    id: "fp-6",
    coverUrl: "https://images.unsplash.com/photo-1573790387438-4da905039392?w=800&h=600&fit=crop",
    avatarUrl: "https://i.pravatar.cc/150?img=15",
    username: "desert_roamer",
    userId: "u-ana",
    flag: "🇦🇪",
    country: "UAE",
    city: "Dubai",
    caption: "The desert at dusk — golden dunes meet a golden skyline 🏜️",
    likes: 3921,
    comments: 201,
  },
  {
    id: "fp-7",
    coverUrl: "https://images.unsplash.com/photo-1483683804023-6ccdb62f86ef?w=800&h=600&fit=crop",
    avatarUrl: "https://i.pravatar.cc/150?img=40",
    username: "alpine_ana",
    userId: "u-ana",
    flag: "🇨🇭",
    country: "Switzerland",
    city: "Lucerne",
    caption: "Snow-capped peaks reflecting on Lake Lucerne. Pure serenity 🏔️",
    likes: 4107,
    comments: 143,
  },
  {
    id: "fp-8",
    coverUrl: "https://images.unsplash.com/photo-1531065208531-4036c0dba3ca?w=800&h=600&fit=crop",
    avatarUrl: "https://i.pravatar.cc/150?img=51",
    username: "safari_joe",
    userId: "u-joe",
    flag: "🇰🇪",
    country: "Kenya",
    city: "Masai Mara",
    caption: "Lions in the wild — an unforgettable safari experience 🦁",
    likes: 5678,
    comments: 289,
  },
  {
    id: "fp-9",
    coverUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&h=600&fit=crop",
    avatarUrl: "https://i.pravatar.cc/150?img=5",
    username: "island_hopper",
    userId: "u-hopper",
    flag: "🇲🇻",
    country: "Maldives",
    city: "Malé",
    caption: "Overwater villas and crystal-clear lagoons. Heaven on Earth 🏝️",
    likes: 8932,
    comments: 521,
  },
  {
    id: "fp-10",
    coverUrl: "https://images.unsplash.com/photo-1539037116277-4dbfab89aeb6?w=800&h=600&fit=crop",
    avatarUrl: "https://i.pravatar.cc/150?img=60",
    username: "history_buff",
    userId: "u-kenji",
    flag: "🇪🇬",
    country: "Egypt",
    city: "Cairo",
    caption: "Standing before the Pyramids of Giza — 4500 years of history 🏛️",
    likes: 7201,
    comments: 378,
  },
];

/* ── Categorized destinations ─────────────────────────────────────── */

export const DESTINATIONS: TrendingDestination[] = [
  // 🔥 Trending
  {
    id: "td-1",
    imageUrl: "https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=600&h=800&fit=crop",
    flag: "🇯🇵",
    country: "Japan",
    city: "Kyoto",
    visitors: "12.4M",
    rating: 4.9,
    videoUrl: null,
    description: "Ancient temples, bamboo forests, and the serene beauty of geisha districts.",
    category: "trending",
  },
  {
    id: "td-2",
    imageUrl: "https://images.unsplash.com/photo-1518684079-3e8a8db71f38?w=600&h=800&fit=crop",
    flag: "🇬🇷",
    country: "Greece",
    city: "Santorini",
    visitors: "3.2M",
    rating: 4.8,
    videoUrl: null,
    description: "Whitewashed cliffside villages with caldera views and legendary sunsets.",
    category: "trending",
  },
  {
    id: "td-3",
    imageUrl: "https://images.unsplash.com/photo-1500052326673-9d3b78b6f83b?w=600&h=800&fit=crop",
    flag: "🇮🇹",
    country: "Italy",
    city: "Amalfi",
    visitors: "5.1M",
    rating: 4.7,
    videoUrl: null,
    description: "Dramatic coastline, pastel villages, and Mediterranean cuisine at its finest.",
    category: "trending",
  },
  {
    id: "td-4",
    imageUrl: "https://images.unsplash.com/photo-1573790387438-4da905039392?w=600&h=800&fit=crop",
    flag: "🇦🇪",
    country: "UAE",
    city: "Dubai",
    visitors: "17.1M",
    rating: 4.6,
    videoUrl: null,
    description: "Futuristic skyline meets ancient desert culture in this dynamic metropolis.",
    category: "trending",
  },

  // 🏆 Most Visited
  {
    id: "td-5",
    imageUrl: "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=600&h=800&fit=crop",
    flag: "🇫🇷",
    country: "France",
    city: "Paris",
    visitors: "38.1M",
    rating: 4.8,
    videoUrl: null,
    description: "The Eiffel Tower, world-class museums, and timeless café culture.",
    category: "most-visited",
  },
  {
    id: "td-6",
    imageUrl: "https://images.unsplash.com/photo-1528127269322-539801943592?w=600&h=800&fit=crop",
    flag: "🇹🇭",
    country: "Thailand",
    city: "Bangkok",
    visitors: "22.8M",
    rating: 4.5,
    videoUrl: null,
    description: "Vibrant street markets, golden temples, and legendary street food.",
    category: "most-visited",
  },
  {
    id: "td-7",
    imageUrl: "https://images.unsplash.com/photo-1499856871958-e5b598275e5f?w=600&h=800&fit=crop",
    flag: "🇬🇧",
    country: "United Kingdom",
    city: "London",
    visitors: "19.2M",
    rating: 4.6,
    videoUrl: null,
    description: "Historic landmarks, world-class museums, and buzzing multicultural energy.",
    category: "most-visited",
  },
  {
    id: "td-8",
    imageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=800&fit=crop",
    flag: "🇺🇸",
    country: "United States",
    city: "New York",
    visitors: "13.6M",
    rating: 4.7,
    videoUrl: null,
    description: "The city that never sleeps — skyscrapers, Broadway, and endless energy.",
    category: "most-visited",
  },

  // ❤️ Most Loved
  {
    id: "td-9",
    imageUrl: "https://images.unsplash.com/photo-1483683804023-6ccdb62f86ef?w=600&h=800&fit=crop",
    flag: "🇨🇭",
    country: "Switzerland",
    city: "Lucerne",
    visitors: "9.7M",
    rating: 5.0,
    videoUrl: null,
    description: "Alpine lakes, medieval bridges, and breathtaking mountain panoramas.",
    category: "most-loved",
  },
  {
    id: "td-10",
    imageUrl: "https://images.unsplash.com/photo-1531065208531-4036c0dba3ca?w=600&h=800&fit=crop",
    flag: "🇰🇪",
    country: "Kenya",
    city: "Masai Mara",
    visitors: "1.5M",
    rating: 4.9,
    videoUrl: null,
    description: "The world's greatest wildlife spectacle — the Great Migration awaits.",
    category: "most-loved",
  },
  {
    id: "td-11",
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&h=800&fit=crop",
    flag: "🇲🇻",
    country: "Maldives",
    city: "Malé",
    visitors: "1.9M",
    rating: 4.9,
    videoUrl: null,
    description: "Overwater villas, coral reefs, and the bluest waters on Earth.",
    category: "most-loved",
  },

  // 🌎 Popular Cities
  {
    id: "td-12",
    imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=800&fit=crop",
    flag: "🇫🇷",
    country: "France",
    city: "Paris",
    visitors: "38.1M",
    rating: 4.8,
    videoUrl: null,
    description: "Romance, art, and gastronomy in the world's most elegant capital.",
    category: "popular-cities",
  },
  {
    id: "td-13",
    imageUrl: "https://images.unsplash.com/photo-1540959733332-cabdc6b20c4d?w=600&h=800&fit=crop",
    flag: "🇯🇵",
    country: "Japan",
    city: "Tokyo",
    visitors: "15.2M",
    rating: 4.7,
    videoUrl: null,
    description: "Neon-lit streets, ancient shrines, and the world's best sushi.",
    category: "popular-cities",
  },
  {
    id: "td-14",
    imageUrl: "https://images.unsplash.com/photo-1499856871958-e5b598275e5f?w=600&h=800&fit=crop",
    flag: "🇬🇧",
    country: "United Kingdom",
    city: "London",
    visitors: "19.2M",
    rating: 4.6,
    videoUrl: null,
    description: "Big Ben, Buckingham Palace, and centuries of history around every corner.",
    category: "popular-cities",
  },

  // 🏖 Beaches
  {
    id: "td-15",
    imageUrl: "https://images.unsplash.com/photo-1519046172210-1aa14a76e8e7?w=600&h=800&fit=crop",
    flag: "🇲🇻",
    country: "Maldives",
    city: "Malé Atoll",
    visitors: "1.9M",
    rating: 4.9,
    videoUrl: null,
    description: "Pristine white sand, turquoise lagoons, and ultimate overwater luxury.",
    category: "beaches",
  },
  {
    id: "td-16",
    imageUrl: "https://images.unsplash.com/photo-1518509562904-e7ef99cdd5db?w=600&h=800&fit=crop",
    flag: "🇹🇭",
    country: "Thailand",
    city: "Phuket",
    visitors: "9.1M",
    rating: 4.5,
    videoUrl: null,
    description: "Tropical paradise with limestone cliffs, hidden coves, and beach parties.",
    category: "beaches",
  },
  {
    id: "td-17",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=800&fit=crop",
    flag: "🇧🇸",
    country: "Bahamas",
    city: "Nassau",
    visitors: "1.8M",
    rating: 4.6,
    videoUrl: null,
    description: "Pig beaches, pink sand, and crystal-clear Caribbean waters.",
    category: "beaches",
  },
  {
    id: "td-18",
    imageUrl: "https://images.unsplash.com/photo-1582932024-d6841d1f7a4f?w=600&h=800&fit=crop",
    flag: "🇵🇭",
    country: "Philippines",
    city: "Palawan",
    visitors: "1.2M",
    rating: 4.8,
    videoUrl: null,
    description: "Hidden lagoons, jungle cliffs, and the most beautiful island on Earth.",
    category: "beaches",
  },

  // 🏔 Mountains
  {
    id: "td-19",
    imageUrl: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=600&h=800&fit=crop",
    flag: "🇨🇭",
    country: "Switzerland",
    city: "Zermatt",
    visitors: "2.8M",
    rating: 4.9,
    videoUrl: null,
    description: "Matterhorn views, alpine meadows, and world-class skiing.",
    category: "mountains",
  },
  {
    id: "td-20",
    imageUrl: "https://images.unsplash.com/photo-1454496522488-7a8e488e1146?w=600&h=800&fit=crop",
    flag: "🇳🇵",
    country: "Nepal",
    city: "Everest Base Camp",
    visitors: "0.05M",
    rating: 5.0,
    videoUrl: null,
    description: "The ultimate trek — Sherpa villages and the roof of the world.",
    category: "mountains",
  },
  {
    id: "td-21",
    imageUrl: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=600&h=800&fit=crop",
    flag: "🇨🇦",
    country: "Canada",
    city: "Banff",
    visitors: "4.1M",
    rating: 4.8,
    videoUrl: null,
    description: "Turquoise lakes, rugged peaks, and pristine wilderness in the Rockies.",
    category: "mountains",
  },
  {
    id: "td-22",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=800&fit=crop",
    flag: "🇳🇴",
    country: "Norway",
    city: "Tromsø",
    visitors: "0.9M",
    rating: 4.7,
    videoUrl: null,
    description: "Northern lights, fjords, and Arctic adventures under the midnight sun.",
    category: "mountains",
  },

  // 🏙 Modern Cities
  {
    id: "td-23",
    imageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=800&fit=crop",
    flag: "🇺🇸",
    country: "United States",
    city: "New York",
    visitors: "13.6M",
    rating: 4.7,
    videoUrl: null,
    description: "The Big Apple — skyscrapers, Broadway, and the pulse of the modern world.",
    category: "modern-cities",
  },
  {
    id: "td-24",
    imageUrl: "https://images.unsplash.com/photo-1542051841857-5f90071a09ee?w=600&h=800&fit=crop",
    flag: "🇯🇵",
    country: "Japan",
    city: "Tokyo",
    visitors: "15.2M",
    rating: 4.7,
    videoUrl: null,
    description: "Where tradition meets technology — the world's most futuristic metropolis.",
    category: "modern-cities",
  },
  {
    id: "td-25",
    imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea264ad0f60?w=600&h=800&fit=crop",
    flag: "🇸🇬",
    country: "Singapore",
    city: "Singapore",
    visitors: "18.7M",
    rating: 4.6,
    videoUrl: null,
    description: "Gardens by the Bay, Marina Bay Sands, and a food lover's paradise.",
    category: "modern-cities",
  },
  {
    id: "td-26",
    imageUrl: "https://images.unsplash.com/photo-1573790387438-4da905039392?w=600&h=800&fit=crop",
    flag: "🇦🇪",
    country: "UAE",
    city: "Dubai",
    visitors: "17.1M",
    rating: 4.6,
    videoUrl: null,
    description: "The world's tallest building, palm-shaped islands, and desert luxury.",
    category: "modern-cities",
  },

  // 🏛 Historical Places
  {
    id: "td-27",
    imageUrl: "https://images.unsplash.com/photo-1539037116277-4dbfab89aeb6?w=600&h=800&fit=crop",
    flag: "🇪🇬",
    country: "Egypt",
    city: "Giza",
    visitors: "14.7M",
    rating: 4.8,
    videoUrl: null,
    description: "The Pyramids and the Sphinx — 4500 years of ancient civilization.",
    category: "historical",
  },
  {
    id: "td-28",
    imageUrl: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&h=800&fit=crop",
    flag: "🇮🇹",
    country: "Italy",
    city: "Rome",
    visitors: "21.0M",
    rating: 4.8,
    videoUrl: null,
    description: "The Colosseum, the Vatican, and 2000 years of Western history.",
    category: "historical",
  },
  {
    id: "td-29",
    imageUrl: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=600&h=800&fit=crop",
    flag: "🇵🇪",
    country: "Peru",
    city: "Machu Picchu",
    visitors: "1.5M",
    rating: 4.9,
    videoUrl: null,
    description: "The lost city of the Incas — mystical ruins high in the Andes.",
    category: "historical",
  },
  {
    id: "td-30",
    imageUrl: "https://images.unsplash.com/photo-1543610892-0b1f7e6397f1?w=600&h=800&fit=crop",
    flag: "🇨🇳",
    country: "China",
    city: "Great Wall",
    visitors: "10.0M",
    rating: 4.7,
    videoUrl: null,
    description: "13,000 miles of ancient engineering across mountain ridges.",
    category: "historical",
  },
];

/* ── Category metadata ────────────────────────────────────────────── */

export const CATEGORIES: {
  key: DestinationCategory;
  emoji: string;
  labelKey: string;
}[] = [
  { key: "trending", emoji: "🔥", labelKey: "travel.category.trending" },
  { key: "most-visited", emoji: "🏆", labelKey: "travel.category.most-visited" },
  { key: "most-loved", emoji: "❤️", labelKey: "travel.category.most-loved" },
  { key: "popular-cities", emoji: "🌎", labelKey: "travel.category.popular-cities" },
  { key: "beaches", emoji: "🏖️", labelKey: "travel.category.beaches" },
  { key: "mountains", emoji: "🏔️", labelKey: "travel.category.mountains" },
  { key: "modern-cities", emoji: "🏙️", labelKey: "travel.category.modern-cities" },
  { key: "historical", emoji: "🏛️", labelKey: "travel.category.historical" },
];

/* ── Backward-compat export ───────────────────────────────────────── */

export const TRENDING_DESTINATIONS: TrendingDestination[] = DESTINATIONS;

/* ── Helper: get destinations by category ─────────────────────────── */

export function getDestinationsByCategory(category: DestinationCategory): TrendingDestination[] {
  return DESTINATIONS.filter((d) => d.category === category);
}

/* ── Seed comments for feed posts ─────────────────────────────────── */

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const NOW = Date.now();

export const SEED_COMMENTS: Comment[] = [
  // fp-1 (Japan/Kyoto)
  { id: "cm-1", postId: "fp-1", userId: "u-max", username: "nomad_max", avatarUrl: "https://i.pravatar.cc/150?img=24", text: "Fushimi Inari is absolutely magical at sunrise! Went there last spring 🌅", createdAt: NOW - 2 * HOUR, likes: 34, likedBy: [], parentId: null },
  { id: "cm-2", postId: "fp-1", userId: "u-dani", username: "travel_dani", avatarUrl: "https://i.pravatar.cc/150?img=33", text: "@nomad_max Totally agree! The torii gates are endless ✨", createdAt: NOW - 90 * MIN, likes: 12, likedBy: [], parentId: "cm-1" },
  { id: "cm-3", postId: "fp-1", userId: "u-kenji", username: "explorer_kenji", avatarUrl: "https://i.pravatar.cc/150?img=45", text: "Living in Osaka and still never get tired of this place 🏯", createdAt: NOW - 45 * MIN, likes: 8, likedBy: [], parentId: null },

  // fp-2 (France/Paris)
  { id: "cm-4", postId: "fp-2", userId: "u-sara", username: "wanderlust_sara", avatarUrl: "https://i.pravatar.cc/150?img=12", text: "The Seine at golden hour is unbeatable. Great shot! 📸", createdAt: NOW - 3 * HOUR, likes: 45, likedBy: [], parentId: null },
  { id: "cm-5", postId: "fp-2", userId: "u-hopper", username: "island_hopper", avatarUrl: "https://i.pravatar.cc/150?img=5", text: "Paris is on my bucket list for next year! Any tips? 😍", createdAt: NOW - 2 * HOUR, likes: 6, likedBy: [], parentId: null },
  { id: "cm-6", postId: "fp-2", userId: "u-max", username: "nomad_max", avatarUrl: "https://i.pravatar.cc/150?img=24", text: "@island_hopper Skip the Eiffel Tower queue — go at 7am! 🗼", createdAt: NOW - 90 * MIN, likes: 19, likedBy: [], parentId: "cm-5" },

  // fp-3 (Greece/Santorini)
  { id: "cm-7", postId: "fp-3", userId: "u-ana", username: "alpine_ana", avatarUrl: "https://i.pravatar.cc/150?img=15", text: "Santorini sunsets are pure poetry 💙 Been 3 times and counting!", createdAt: NOW - 5 * HOUR, likes: 67, likedBy: [], parentId: null },
  { id: "cm-8", postId: "fp-3", userId: "u-joe", username: "safari_joe", avatarUrl: "https://i.pravatar.cc/150?img=51", text: "Oia village is the best spot for sunset photos 📷", createdAt: NOW - 4 * HOUR, likes: 22, likedBy: [], parentId: null },

  // fp-4 (Thailand/Chiang Mai)
  { id: "cm-9", postId: "fp-4", userId: "u-dani", username: "travel_dani", avatarUrl: "https://i.pravatar.cc/150?img=33", text: "The temple details are incredible! Wat Phra That Doi Suthep? 🙏", createdAt: NOW - 6 * HOUR, likes: 15, likedBy: [], parentId: null },

  // fp-5 (Italy/Amalfi)
  { id: "cm-10", postId: "fp-5", userId: "u-sara", username: "wanderlust_sara", avatarUrl: "https://i.pravatar.cc/150?img=12", text: "Amalfi is a dream! The lemon granita is a must 🍋🇮🇹", createdAt: NOW - 8 * HOUR, likes: 41, likedBy: [], parentId: null },
  { id: "cm-11", postId: "fp-5", userId: "u-hopper", username: "island_hopper", avatarUrl: "https://i.pravatar.cc/150?img=5", text: "Positano cliffs are unreal! Adding this to my trip list ✈️", createdAt: NOW - 7 * HOUR, likes: 9, likedBy: [], parentId: null },

  // fp-6 (UAE/Dubai)
  { id: "cm-12", postId: "fp-6", userId: "u-kenji", username: "explorer_kenji", avatarUrl: "https://i.pravatar.cc/150?img=45", text: "Desert safari at sunset is the best Dubai experience 🏜️🐫", createdAt: NOW - 10 * HOUR, likes: 28, likedBy: [], parentId: null },

  // fp-7 (Switzerland/Lucerne)
  { id: "cm-13", postId: "fp-7", userId: "u-max", username: "nomad_max", avatarUrl: "https://i.pravatar.cc/150?img=24", text: "Lake Lucerne reflections are surreal! 🏔️ Mirror-like!", createdAt: NOW - 12 * HOUR, likes: 33, likedBy: [], parentId: null },

  // fp-8 (Kenya/Masai Mara)
  { id: "cm-14", postId: "fp-8", userId: "u-sara", username: "wanderlust_sara", avatarUrl: "https://i.pravatar.cc/150?img=12", text: "The Great Migration is on my bucket list! 🦁 So jealous!", createdAt: NOW - 14 * HOUR, likes: 52, likedBy: [], parentId: null },
  { id: "cm-15", postId: "fp-8", userId: "u-dani", username: "travel_dani", avatarUrl: "https://i.pravatar.cc/150?img=33", text: "Wildlife photography at its finest! What camera did you use? 📷", createdAt: NOW - 13 * HOUR, likes: 7, likedBy: [], parentId: null },

  // fp-9 (Maldives)
  { id: "cm-16", postId: "fp-9", userId: "u-ana", username: "alpine_ana", avatarUrl: "https://i.pravatar.cc/150?img=15", text: "Overwater villas are paradise on Earth 🏝️💙", createdAt: NOW - 16 * HOUR, likes: 88, likedBy: [], parentId: null },
  { id: "cm-17", postId: "fp-9", userId: "u-joe", username: "safari_joe", avatarUrl: "https://i.pravatar.cc/150?img=51", text: "The water clarity is insane! Snorkeling must be amazing there 🐠", createdAt: NOW - 15 * HOUR, likes: 14, likedBy: [], parentId: null },

  // fp-10 (Egypt/Cairo)
  { id: "cm-18", postId: "fp-10", userId: "u-hopper", username: "island_hopper", avatarUrl: "https://i.pravatar.cc/150?img=5", text: "4500 years of history standing right there! Mind blowing 🏛️", createdAt: NOW - 18 * HOUR, likes: 39, likedBy: [], parentId: null },
  { id: "cm-19", postId: "fp-10", userId: "u-max", username: "nomad_max", avatarUrl: "https://i.pravatar.cc/150?img=24", text: "Went last year — the sound and light show at night is incredible ✨", createdAt: NOW - 17 * HOUR, likes: 11, likedBy: [], parentId: null },
];
