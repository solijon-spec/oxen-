/**
 * AI Tour Package Recommendation Engine
 *
 * Architecture:
 * 1. Collect user request (natural language + optional structured filters)
 * 2. AI extracts structured travel criteria from the request
 * 3. Query Supabase for eligible published tour packages (pre-filter)
 * 4. Deterministic matching/scoring in application logic
 * 5. AI explains/ranks ONLY the real candidate packages
 * 6. AI generates an itinerary based on real package data
 *
 * The AI NEVER invents package data. It only explains and plans around
 * real records from Supabase. If the AI fails, deterministic filtering
 * still provides package recommendations.
 */

import {
  searchPublishedTourPosts,
  formatPrice,
  calculateDuration,
  parseStringArray,
  type TourPost,
} from "@/lib/tour-posts";
import type { Itinerary } from "@/lib/ai";

const TOOLKIT_URL = import.meta.env.EXPO_PUBLIC_TOOLKIT_URL ?? "https://toolkit.rork.com";
const TOOLKIT_KEY = import.meta.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY ?? "";

// ── Types ──────────────────────────────────────────────────────

export interface TravelCriteria {
  destination?: string;
  destinationCity?: string;
  departureCity?: string;
  departureCountry?: string;
  travelDates?: {
    start?: string;
    end?: string;
    month?: string;
  };
  travelers: number;
  durationDays?: number;
  budget?: number;
  currency: string;
  travelStyle?: string;
  hotelPreference?: string;
  visaPreference?: string;
  mealPreference?: string;
  flightPreference?: string;
  includedPreferences: string[];
}

export interface PackageMatch {
  post: TourPost;
  score: number;
  estimatedTotal: number;
  withinBudget: boolean;
  reasons: string[];
  /** Human-readable tags like "Lowest price", "Best included services" */
  badges: string[];
  /** Differences from user criteria (for "closest match" scenarios) */
  differences: string[];
}

export interface AIRecommendationResult {
  /** AI-generated intro text in the user's language */
  intro: string;
  /** Best match (highest score) — null if no packages found */
  bestMatch: PackageMatch | null;
  /** Other recommended packages, sorted by score */
  alternatives: PackageMatch[];
  /** All matched packages including best match, sorted by score */
  allMatches: PackageMatch[];
  /** Whether we found exact matches or only closest matches */
  exactMatch: boolean;
  /** AI-generated trip plan (separate from real package data) */
  itinerary: Itinerary | null;
  /** Whether the AI explanation is available or fallback was used */
  aiAvailable: boolean;
  /** The extracted criteria (for showing "understood preferences" UI) */
  criteria: TravelCriteria;
}

// ── 1. AI Intent Extraction ────────────────────────────────────

function buildIntentExtractionPrompt(language: string): string {
  return `You are OXEN's AI travel intent extractor. Given a user's travel request, extract structured travel preferences.

CRITICAL LANGUAGE RULE:
The user's selected language code is: "${language}".
Understand the request regardless of which language it's written in. The request may be in Uzbek, Russian, English, Arabic, Turkish, or any other language.

Extract these fields if mentioned:
- destination: country or city name (normalized to English country/city name)
- destinationCity: specific city if mentioned
- departureCity: departure city if mentioned
- departureCountry: departure country if mentioned
- travelMonth: month name or number if mentioned (e.g. "September", "Sentabr", "sentya")
- travelDates.start: ISO date if exact date mentioned
- travelDates.end: ISO date if exact return date mentioned
- travelers: number of travelers (default 1 if not specified, but "with wife" = 2, "family of 4" = 4)
- durationDays: trip duration in days if mentioned
- budget: numeric budget amount if mentioned
- currency: currency code if mentioned (USD, EUR, UZS, RUB, AED, etc.) — default "USD"
- travelStyle: style if mentioned (luxury, budget, adventure, relax, cultural, family, honeymoon, business)
- hotelPreference: hotel preference if mentioned (5-star, boutique, apartment, etc.)
- visaPreference: if visa support is requested
- mealPreference: meal preference if mentioned (breakfast, half-board, all-inclusive)
- flightPreference: if flight inclusion is requested
- includedPreferences: array of requested inclusions (flight, hotel, visa, transfer, meals, insurance)

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "destination": string | null,
  "destinationCity": string | null,
  "departureCity": string | null,
  "departureCountry": string | null,
  "travelMonth": string | null,
  "travelDates": { "start": string | null, "end": string | null },
  "travelers": number,
  "durationDays": number | null,
  "budget": number | null,
  "currency": string,
  "travelStyle": string | null,
  "hotelPreference": string | null,
  "visaPreference": string | null,
  "mealPreference": string | null,
  "flightPreference": string | null,
  "includedPreferences": string[]
}

Only include fields that are explicitly mentioned or can be directly inferred. Do NOT guess or fabricate values.`;
}

function parseIntentResponse(raw: string): Record<string, unknown> {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  return JSON.parse(text) as Record<string, unknown>;
}

/**
 * Extract structured travel criteria from a natural language prompt.
 * Combines AI extraction with any structured filters the user provided.
 */
export async function extractTravelIntent(
  prompt: string,
  structuredFilters: Partial<TravelCriteria>,
  language: string,
): Promise<TravelCriteria> {
  // Start with structured filters (these are authoritative)
  const criteria: TravelCriteria = {
    travelers: structuredFilters.travelers ?? 1,
    currency: structuredFilters.currency ?? "USD",
    ...structuredFilters,
    includedPreferences: structuredFilters.includedPreferences ?? [],
  };

  // If no prompt, just return structured filters
  if (!prompt.trim()) return criteria;

  try {
    const res = await fetch(`${TOOLKIT_URL}/v2/vercel/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOOLKIT_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4.5",
        temperature: 0.3,
        max_tokens: 800,
        messages: [
          { role: "system", content: buildIntentExtractionPrompt(language) },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Intent extraction failed (${res.status})`);

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("Empty intent response");

    const extracted = parseIntentResponse(content);

    // Merge: structured filters take priority, AI fills gaps
    if (!criteria.destination && extracted.destination) {
      criteria.destination = extracted.destination as string;
    }
    if (!criteria.destinationCity && extracted.destinationCity) {
      criteria.destinationCity = extracted.destinationCity as string;
    }
    if (!criteria.departureCity && extracted.departureCity) {
      criteria.departureCity = extracted.departureCity as string;
    }
    if (!criteria.departureCountry && extracted.departureCountry) {
      criteria.departureCountry = extracted.departureCountry as string;
    }
    if (!criteria.travelDates) {
      const start = (extracted.travelDates as Record<string, string>)?.start ?? null;
      const end = (extracted.travelDates as Record<string, string>)?.end ?? null;
      const month = (extracted.travelMonth as string) ?? null;
      if (start || end || month) {
        criteria.travelDates = { start: start ?? undefined, end: end ?? undefined, month: month ?? undefined };
      }
    }
    if (typeof extracted.travelers === "number" && extracted.travelers > 0 && !structuredFilters.travelers) {
      criteria.travelers = extracted.travelers;
    }
    if (typeof extracted.durationDays === "number" && !structuredFilters.durationDays) {
      criteria.durationDays = extracted.durationDays;
    }
    if (typeof extracted.budget === "number" && !structuredFilters.budget) {
      criteria.budget = extracted.budget;
    }
    if (typeof extracted.currency === "string" && !structuredFilters.currency) {
      criteria.currency = extracted.currency;
    }
    if (typeof extracted.travelStyle === "string" && !criteria.travelStyle) {
      criteria.travelStyle = extracted.travelStyle;
    }
    if (typeof extracted.hotelPreference === "string" && !criteria.hotelPreference) {
      criteria.hotelPreference = extracted.hotelPreference;
    }
    if (typeof extracted.visaPreference === "string" && !criteria.visaPreference) {
      criteria.visaPreference = extracted.visaPreference;
    }
    if (typeof extracted.mealPreference === "string" && !criteria.mealPreference) {
      criteria.mealPreference = extracted.mealPreference;
    }
    if (typeof extracted.flightPreference === "string" && !criteria.flightPreference) {
      criteria.flightPreference = extracted.flightPreference;
    }
    if (Array.isArray(extracted.includedPreferences) && criteria.includedPreferences.length === 0) {
      criteria.includedPreferences = extracted.includedPreferences as string[];
    }
  } catch (err) {
    console.warn("AI intent extraction failed, using structured filters only:", err);
    // Fallback: try simple regex extraction from prompt
    applyFallbackExtraction(prompt, criteria);
  }

  return criteria;
}

/** Simple regex-based fallback when AI is unavailable */
function applyFallbackExtraction(prompt: string, criteria: TravelCriteria): void {
  const lower = prompt.toLowerCase();

  // Destination patterns
  const destMatches = lower.match(/(?:to|to\b|в|в\b|га|gа|dubai|dubay|turkey|turkiya|toshkent|tashkent|moscow|moskva|istanbul|istanbul|mecca|makka|baku|boku|korea|koreya|japan|yaponiya)/gi);

  // Budget pattern: $1200, 1200 dollar, 1200$
  const budgetMatch = prompt.match(/\$?\s*(\d{3,6})\s*(?:dollar|usd|\$|sum|so'm|rub|rubl|eur|euro)/i);
  if (budgetMatch && !criteria.budget) {
    criteria.budget = parseInt(budgetMatch[1], 10);
    if (/\$|dollar|usd/i.test(budgetMatch[0])) criteria.currency = "USD";
    else if (/eur|euro/i.test(budgetMatch[0])) criteria.currency = "EUR";
    else if (/rub|rubl/i.test(budgetMatch[0])) criteria.currency = "RUB";
    else if (/sum|so'm/i.test(budgetMatch[0])) criteria.currency = "UZS";
  }

  // Travelers: "2 kishi", "with wife", "family of 4", "xotinim bilan"
  if (/with wife|xotinim|жена|2 kishi|2 человек|couple/i.test(prompt)) criteria.travelers = 2;
  else if (/family of (\d+)/i.test(prompt)) {
    const m = prompt.match(/family of (\d+)/i);
    if (m) criteria.travelers = parseInt(m[1], 10);
  }
  else if (/(\d+)\s*(?:kishi|человек|people|persons|travelers|путешественников)/i.test(prompt)) {
    const m = prompt.match(/(\d+)\s*(?:kishi|человек|people|persons|travelers|путешественников)/i);
    if (m) criteria.travelers = parseInt(m[1], 10);
  }

  // Duration: "5 days", "5 kun", "5 дней", "7 nights"
  const durMatch = prompt.match(/(\d+)\s*(?:days?|kun|дней|дня|nights?|noch)/i);
  if (durMatch && !criteria.durationDays) criteria.durationDays = parseInt(durMatch[1], 10);

  // Month detection
  const months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const monthsLocalized = ["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentabr","sentyabr","oktyabr","noyabr","dekabr","yan","fev","sen","okt","nov","dek","sent","sentya"];
  const allMonths = [...months, ...monthsLocalized];
  for (const m of allMonths) {
    if (lower.includes(m)) {
      if (!criteria.travelDates) criteria.travelDates = {};
      criteria.travelDates.month = m;
      break;
    }
  }

  // Destination: check common destinations
  const destMap: Record<string, string> = {
    "dubai": "UAE", "dubay": "UAE", "uae": "UAE", "birlashgan": "UAE",
    "turkey": "Turkey", "turkiya": "Turkey", "турция": "Turkey", "istanbul": "Turkey",
    "russia": "Russia", "moscow": "Russia", "moskva": "Russia", "москва": "Russia",
    "korea": "South Korea", "koreya": "South Korea", "корея": "South Korea",
    "japan": "Japan", "yaponiya": "Japan", "япония": "Japan",
    "mecca": "Saudi Arabia", "makka": "Saudi Arabia", "мекка": "Saudi Arabia",
    "baku": "Azerbaijan", "boku": "Azerbaiban",
  };
  for (const [key, country] of Object.entries(destMap)) {
    if (lower.includes(key) && !criteria.destination) {
      criteria.destination = country;
      if (key === "dubai" || key === "dubay") criteria.destinationCity = "Dubai";
      if (key === "istanbul") criteria.destinationCity = "Istanbul";
      if (key === "moscow" || key === "moskva" || key === "москва") criteria.destinationCity = "Moscow";
      if (key === "baku" || key === "boku") criteria.destinationCity = "Baku";
      break;
    }
  }
}

// ── 2. Package Search & Pre-filtering ──────────────────────────

/** Convert month name to month number (1-12) */
function monthToNumber(month: string): number | null {
  const months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const monthsLocalized = ["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentabr","sentyabr","oktyabr","noyabr","dekabr","yan","fev","sen","okt","nov","dek","sent","sentya"];
  const lower = month.toLowerCase();
  const idx = months.findIndex(m => m.startsWith(lower));
  if (idx >= 0) return idx + 1;
  const idxLoc = monthsLocalized.findIndex(m => m.startsWith(lower));
  if (idxLoc >= 0) {
    // map localized to real month
    const map: Record<string, number> = { yan:1, yanvar:1, fev:2, fevral:2, mart:3, aprel:4, may:5, iyun:6, iyul:7, avgust:8, sen:9, sent:9, sentabr:9, sentyabr:9, okt:10, oktyabr:10, noy:11, noyabr:11, dek:12, dekabr:12 };
    return map[lower] ?? null;
  }
  return null;
}

/** Build date range from criteria for Supabase query */
function buildDateRange(criteria: TravelCriteria): { after?: string; before?: string } {
  const result: { after?: string; before?: string } = {};
  const year = new Date().getFullYear();

  if (criteria.travelDates?.start) {
    result.after = criteria.travelDates.start;
  } else if (criteria.travelDates?.month) {
    const monthNum = monthToNumber(criteria.travelDates.month);
    if (monthNum) {
      // Allow packages departing in that month ±1 month window
      result.after = new Date(year, monthNum - 2, 1).toISOString().split("T")[0];
      result.before = new Date(year, monthNum, 28).toISOString().split("T")[0];
    }
  }

  if (criteria.travelDates?.end) {
    result.before = criteria.travelDates.end;
  }

  return result;
}

/**
 * Search eligible published packages from Supabase.
 * Pre-filters by destination, price range, dates — limiting the
 * candidate set before sending to the AI.
 */
export async function searchEligiblePackages(criteria: TravelCriteria): Promise<TourPost[]> {
  const dateRange = buildDateRange(criteria);

  // Build search params — use wide price range if budget specified
  const params: Parameters<typeof searchPublishedTourPosts>[0] = {
    destination: criteria.destination || criteria.destinationCity,
    currency: criteria.currency,
    limit: 50,
  };

  if (criteria.budget) {
    // Search in a range from 50% to 200% of budget to catch both
    // per_person and total pricing
    params.minPrice = Math.round(criteria.budget * 0.2);
    params.maxPrice = Math.round(criteria.budget * 2.5);
  }

  if (dateRange.after) params.departureAfter = dateRange.after;
  if (dateRange.before) params.departureBefore = dateRange.before;

  let packages = await searchPublishedTourPosts(params);

  // If destination filter returned nothing, try without destination
  // (we'll still score by destination proximity)
  if (packages.length === 0 && params.destination) {
    const { destination: _dest, ...rest } = params;
    packages = await searchPublishedTourPosts(rest);
  }

  // If still nothing, get all published packages (broadest fallback)
  if (packages.length === 0) {
    packages = await searchPublishedTourPosts({ limit: 50 });
  }

  // Filter out packages from unpublished companies
  return packages.filter((p) => p.company?.is_published !== false);
}

// ── 3. Deterministic Matching & Scoring ────────────────────────

/**
 * Calculate a weighted relevance score for a package against criteria.
 * Score is 0-100. Destination and budget have high importance.
 */
export function scorePackage(post: TourPost, criteria: TravelCriteria): PackageMatch {
  let score = 0;
  const reasons: string[] = [];
  const differences: string[] = [];
  let maxScore = 100;

  // ── Destination match (30 points) ──
  if (criteria.destination) {
    const dest = criteria.destination.toLowerCase();
    const country = (post.destination_country ?? "").toLowerCase();
    const city = (post.destination_city ?? "").toLowerCase();
    if (country === dest || country.includes(dest) || dest.includes(country)) {
      score += 30;
      reasons.push("destination-matches");
    } else if (city === dest || city.includes(dest) || dest.includes(city)) {
      score += 28;
      reasons.push("city-matches");
    } else if (country && dest && (country.includes(dest.split(" ")[0]) || dest.includes(country.split(" ")[0]))) {
      score += 15;
      reasons.push("nearby-destination");
    } else {
      differences.push("different-destination");
    }
  } else {
    // No destination specified — give baseline points
    score += 15;
  }

  // ── Budget match (25 points) ──
  const estimatedTotal = calculateEstimatedTotal(post, criteria.travelers);
  const withinBudget = criteria.budget ? estimatedTotal <= criteria.budget : true;

  if (criteria.budget) {
    if (withinBudget) {
      // Full points if within budget, scaled by how close to budget
      const ratio = estimatedTotal / criteria.budget;
      score += Math.round(25 * Math.min(1, ratio * 1.1));
      reasons.push("within-budget");
    } else {
      // Partial points based on how much over budget
      const overRatio = criteria.budget / estimatedTotal;
      const partialScore = Math.round(25 * overRatio * 0.5);
      score += partialScore;
      const overAmount = estimatedTotal - criteria.budget;
      differences.push(`$${overAmount} above your stated budget`);
    }
  } else {
    score += 12;
  }

  // ── Duration match (15 points) ──
  if (criteria.durationDays) {
    const pkgDuration = post.departure_date && post.return_date
      ? Math.round((new Date(post.return_date).getTime() - new Date(post.departure_date).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    if (pkgDuration !== null) {
      const diff = Math.abs(pkgDuration - criteria.durationDays);
      if (diff === 0) {
        score += 15;
        reasons.push("exact-duration");
      } else if (diff <= 1) {
        score += 12;
        reasons.push("close-duration");
      } else if (diff <= 2) {
        score += 8;
      } else {
        score += Math.max(0, 5 - diff);
        differences.push(diff > 0 ? `Departure is ${diff} days different from requested duration` : "");
      }
    }
  } else {
    score += 7;
  }

  // ── Included features match (20 points total) ──
  const includedPrefs = criteria.includedPreferences.map(p => p.toLowerCase());
  let includedScore = 0;
  const includedMap: Record<string, boolean> = {
    flight: post.flight_included,
    hotel: post.hotel_included,
    visa: post.visa_included,
    transfer: post.airport_transfer_included,
    meals: post.meals_included,
    insurance: post.travel_insurance_included,
    guide: post.guide_included,
  };

  if (includedPrefs.length > 0) {
    for (const pref of includedPrefs) {
      const key = Object.keys(includedMap).find(k => pref.includes(k));
      if (key && includedMap[key]) {
        includedScore += Math.round(20 / includedPrefs.length);
        reasons.push(`${key}-included`);
      }
    }
  } else {
    // No specific preferences — give points for having inclusions
    const hasInclusions = Object.values(includedMap).filter(Boolean).length;
    includedScore = Math.min(10, hasInclusions * 2);
  }

  score += includedScore;

  // ── Travel date match (10 points) ──
  if (criteria.travelDates?.month || criteria.travelDates?.start) {
    if (post.departure_date) {
      const depDate = new Date(post.departure_date);
      let targetDate: Date | null = null;

      if (criteria.travelDates.start) {
        targetDate = new Date(criteria.travelDates.start);
      } else if (criteria.travelDates.month) {
        const monthNum = monthToNumber(criteria.travelDates.month);
        if (monthNum) {
          targetDate = new Date(depDate.getFullYear(), monthNum - 1, 15);
        }
      }

      if (targetDate) {
        const dayDiff = Math.abs(depDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24);
        if (dayDiff <= 7) {
          score += 10;
          reasons.push("matching-dates");
        } else if (dayDiff <= 14) {
          score += 6;
          differences.push(`Departure is ${Math.round(dayDiff)} days from requested date`);
        } else if (dayDiff <= 30) {
          score += 3;
          differences.push(`Departure is ${Math.round(dayDiff)} days from requested date`);
        }
      }
    }
  } else {
    score += 5;
  }

  // Normalize score to 0-100
  const finalScore = Math.min(100, Math.round((score / maxScore) * 100));

  // Generate badges
  const badges: string[] = [];

  return {
    post,
    score: finalScore,
    estimatedTotal,
    withinBudget,
    reasons,
    badges,
    differences: differences.filter(Boolean),
  };
}

/** Calculate estimated total cost for N travelers */
export function calculateEstimatedTotal(post: TourPost, travelers: number): number {
  const price = post.price ?? 0;
  if (post.price_type === "per_person") {
    return price * travelers;
  }
  return price;
}

/** Assign badges like "Lowest price", "Best included services" to matches */
function assignBadges(matches: PackageMatch[]): void {
  if (matches.length === 0) return;

  // Lowest price
  const sorted = [...matches];
  const lowest = sorted.sort((a, b) => a.estimatedTotal - b.estimatedTotal)[0];
  if (lowest) lowest.badges.push("Lowest price");

  // Best included services
  const byInclusions = [...matches].sort((a, b) => {
    const aCount = countInclusions(a.post);
    const bCount = countInclusions(b.post);
    return bCount - aCount;
  });
  const bestIncluded = byInclusions[0];
  if (bestIncluded && countInclusions(bestIncluded.post) > 0) {
    bestIncluded.badges.push("Best included services");
  }

  // Closest dates — only if user specified dates
  // (handled separately as it depends on criteria)
}

function countInclusions(post: TourPost): number {
  return [
    post.flight_included,
    post.hotel_included,
    post.visa_included,
    post.airport_transfer_included,
    post.guide_included,
    post.travel_insurance_included,
    post.meals_included,
  ].filter(Boolean).length;
}

// ── 4. AI Explanation & Itinerary ──────────────────────────────

function buildRecommendationPrompt(
  criteria: TravelCriteria,
  matches: PackageMatch[],
  language: string,
): string {
  const langMap: Record<string, string> = {
    en: "English", uz: "Uzbek", ru: "Russian", ar: "Arabic", tr: "Turkish",
    de: "German", fr: "French", es: "Spanish", it: "Italian", pt: "Portuguese",
    zh: "Chinese", ja: "Japanese", ko: "Korean", hi: "Hindi", fa: "Persian",
    kk: "Kazakh", ky: "Kyrgyz", tg: "Tajik", uk: "Ukrainian", az: "Azerbaijani",
    id: "Indonesian", ms: "Malay",
  };
  const langName = langMap[language] ?? "English";

  const criteriaStr = JSON.stringify({
    destination: criteria.destination,
    destinationCity: criteria.destinationCity,
    travelers: criteria.travelers,
    durationDays: criteria.durationDays,
    budget: criteria.budget,
    currency: criteria.currency,
    travelStyle: criteria.travelStyle,
    includedPreferences: criteria.includedPreferences,
    travelMonth: criteria.travelDates?.month,
  });

  const packagesStr = matches.slice(0, 10).map((m, i) => ({
    index: i,
    title: m.post.title,
    destination: m.post.destination_country,
    city: m.post.destination_city,
    price: m.post.price,
    currency: m.post.currency,
    priceType: m.post.price_type,
    estimatedTotal: m.estimatedTotal,
    withinBudget: m.withinBudget,
    duration: calculateDuration(m.post.departure_date, m.post.return_date),
    departureDate: m.post.departure_date,
    returnDate: m.post.return_date,
    availableSeats: m.post.available_seats,
    agency: m.post.company?.name,
    flightIncluded: m.post.flight_included,
    hotelIncluded: m.post.hotel_included,
    visaIncluded: m.post.visa_included,
    transferIncluded: m.post.airport_transfer_included,
    mealsIncluded: m.post.meals_included,
    insuranceIncluded: m.post.travel_insurance_included,
    matchScore: m.score,
    differences: m.differences,
  }));

  return `You are OXEN's AI travel concierge. A traveler requested a trip, and we found real OXEN tour packages that match their criteria.

LANGUAGE: Write the ENTIRE response in ${langName}. Do not mix languages.

TRAVELER CRITERIA:
${criteriaStr}

REAL OXEN PACKAGES FOUND (from Supabase — these are real packages from real travel agencies):
${JSON.stringify(packagesStr, null, 2)}

Your task:
1. Write a concise intro (1-2 sentences) in ${langName} summarizing what was found. Example: "Found 3 matching OXEN tour packages for your request."
2. For the BEST MATCH package (index 0), write a short "why this fits" explanation (2-3 sentences) referencing real features of the package.
3. Generate an AI trip plan (itinerary) for the destination. This is AI-GENERATED content — it should NOT reference specific hotels, prices, or agency offers. It should be a general day-by-day plan.

IMPORTANT:
- Only reference features that exist in the package data above.
- Do NOT invent hotel names, prices, or agency offers in the itinerary.
- The itinerary should be a general travel plan for the destination.
- If the best match is over budget or has differences, mention that honestly.

Respond with ONLY valid JSON (no markdown):
{
  "intro": string,
  "bestMatchReason": string,
  "itinerary": {
    "destination": string,
    "summary": string,
    "bestTime": string,
    "days": [{ "day": number, "title": string, "morning": string, "afternoon": string, "evening": string }],
    "budget": [{ "category": string, "amount": string }],
    "tips": string[]
  }
}`;
}

function parseRecommendationResponse(raw: string): {
  intro: string;
  bestMatchReason: string;
  itinerary: Itinerary | null;
} {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  const parsed = JSON.parse(text) as {
    intro: string;
    bestMatchReason: string;
    itinerary: Itinerary | null;
  };

  // Validate itinerary
  if (parsed.itinerary) {
    if (!Array.isArray(parsed.itinerary.days)) parsed.itinerary.days = [];
    if (!Array.isArray(parsed.itinerary.budget)) parsed.itinerary.budget = [];
    if (!Array.isArray(parsed.itinerary.tips)) parsed.itinerary.tips = [];
  }

  return parsed;
}

/**
 * Generate AI explanation and itinerary for the matched packages.
 * Falls back gracefully if AI is unavailable.
 */
async function generateAIExplanation(
  criteria: TravelCriteria,
  matches: PackageMatch[],
  language: string,
): Promise<{
  intro: string;
  bestMatchReason: string;
  itinerary: Itinerary | null;
}> {
  if (matches.length === 0) {
    return { intro: "", bestMatchReason: "", itinerary: null };
  }

  try {
    const res = await fetch(`${TOOLKIT_URL}/v2/vercel/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOOLKIT_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4.5",
        temperature: 0.7,
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content: `You are OXEN's AI travel concierge. You explain and recommend REAL tour packages. You never invent package data. You generate helpful travel itineraries based on destinations.`,
          },
          {
            role: "user",
            content: buildRecommendationPrompt(criteria, matches, language),
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`AI explanation failed (${res.status})`);

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("Empty AI response");

    return parseRecommendationResponse(content);
  } catch (err) {
    console.warn("AI explanation failed, using fallback:", err);
    return generateFallbackExplanation(criteria, matches, language);
  }
}

/** Fallback when AI is unavailable — deterministic text generation */
function generateFallbackExplanation(
  criteria: TravelCriteria,
  matches: PackageMatch[],
  language: string,
): { intro: string; bestMatchReason: string; itinerary: Itinerary | null } {
  const count = matches.length;
  const intro = `AI explanation is temporarily unavailable, but we found ${count} matching OXEN package${count !== 1 ? "s" : ""} for your request.`;

  const best = matches[0];
  const bestMatchReason = buildDeterministicReason(best, criteria);

  return { intro, bestMatchReason, itinerary: null };
}

/** Build a deterministic reason string from package features */
function buildDeterministicReason(match: PackageMatch, criteria: TravelCriteria): string {
  const parts: string[] = [];
  const post = match.post;

  if (match.withinBudget && criteria.budget) {
    parts.push(`within your ${formatPrice(criteria.budget, criteria.currency)} budget`);
  }
  if (post.destination_country && criteria.destination) {
    if (post.destination_country.toLowerCase().includes(criteria.destination.toLowerCase())) {
      parts.push(`matching destination (${post.destination_country})`);
    }
  }
  if (post.flight_included) parts.push("flight included");
  if (post.hotel_included) parts.push("hotel included");
  if (post.visa_included) parts.push("visa included");
  if (post.airport_transfer_included) parts.push("airport transfer included");
  if (post.meals_included) parts.push("meals included");

  const duration = calculateDuration(post.departure_date, post.return_date);
  if (duration && criteria.durationDays) {
    parts.push(`${duration}`);
  }

  return parts.length > 0
    ? `Best match because it's ${parts.join(", ")}.`
    : "Best overall match for your preferences.";
}

// ── 5. Main Recommendation Pipeline ────────────────────────────

/**
 * The complete AI recommendation pipeline:
 * 1. Extract intent from user prompt + structured filters
 * 2. Search eligible packages from Supabase
 * 3. Score and rank packages
 * 4. Generate AI explanation + itinerary
 * 5. Return structured result
 */
export async function recommendPackages(
  prompt: string,
  structuredFilters: Partial<TravelCriteria>,
  language: string,
  globeCountry?: string | null,
): Promise<AIRecommendationResult> {
  // Merge globe country as a hint
  if (globeCountry && !structuredFilters.destination) {
    structuredFilters.destination = globeCountry;
  }

  // Step 1: Extract intent
  const criteria = await extractTravelIntent(prompt, structuredFilters, language);

  // Step 2: Search eligible packages
  const packages = await searchEligiblePackages(criteria);

  // Step 3: Score and rank
  let matches = packages.map((p) => scorePackage(p, criteria));
  matches.sort((a, b) => b.score - a.score);

  // Determine exact vs closest matches
  const exactMatches = matches.filter((m) => m.differences.length === 0 && m.score >= 60);
  const exactMatch = exactMatches.length > 0;

  // If no exact matches, use closest matches (still sorted by score)
  const finalMatches = exactMatch ? exactMatches : matches;
  matches = finalMatches.slice(0, 10);

  // Assign badges
  assignBadges(matches);

  // Step 4: Generate AI explanation + itinerary
  const aiResult = await generateAIExplanation(criteria, matches, language);

  // Attach best match reason to the best match
  if (matches.length > 0 && aiResult.bestMatchReason) {
    matches[0].reasons.push("ai-reason");
  }

  const bestMatch = matches.length > 0 ? matches[0] : null;
  const alternatives = matches.slice(1);

  return {
    intro: aiResult.intro,
    bestMatch,
    alternatives,
    allMatches: matches,
    exactMatch,
    itinerary: aiResult.itinerary,
    aiAvailable: !aiResult.intro.includes("temporarily unavailable"),
    criteria,
  };
}

// ── Helper: Format criteria for display ─────────────────────────

export function formatCriteriaSummary(criteria: TravelCriteria): string[] {
  const parts: string[] = [];
  if (criteria.destination) parts.push(`Destination: ${criteria.destination}`);
  if (criteria.destinationCity) parts.push(`City: ${criteria.destinationCity}`);
  if (criteria.departureCity) parts.push(`From: ${criteria.departureCity}`);
  if (criteria.travelers > 1) parts.push(`Travelers: ${criteria.travelers}`);
  if (criteria.durationDays) parts.push(`Duration: ${criteria.durationDays} days`);
  if (criteria.budget) parts.push(`Budget: ${formatPrice(criteria.budget, criteria.currency)}`);
  if (criteria.travelDates?.month) parts.push(`When: ${criteria.travelDates.month}`);
  else if (criteria.travelDates?.start) parts.push(`When: ${criteria.travelDates.start}`);
  if (criteria.travelStyle) parts.push(`Style: ${criteria.travelStyle}`);
  if (criteria.includedPreferences.length > 0) {
    parts.push(`Includes: ${criteria.includedPreferences.join(", ")}`);
  }
  return parts;
}
