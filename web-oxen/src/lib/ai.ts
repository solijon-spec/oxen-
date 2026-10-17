const TOOLKIT_URL = import.meta.env.EXPO_PUBLIC_TOOLKIT_URL ?? "https://toolkit.rork.com";
const TOOLKIT_KEY = import.meta.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY ?? "";

/** Structured itinerary returned by the AI travel planner. */
export interface ItineraryDay {
  day: number;
  title: string;
  morning: string;
  afternoon: string;
  evening: string;
}

export interface BudgetItem {
  category: string;
  amount: string;
}

export interface Itinerary {
  destination: string;
  summary: string;
  bestTime: string;
  days: ItineraryDay[];
  budget: BudgetItem[];
  tips: string[];
}

function buildSystemPrompt(language: string): string {
  return `You are OXEN, an expert AI travel concierge. Given a traveler's request, produce a vivid, practical, and inspiring trip plan.

CRITICAL LANGUAGE RULE — FOLLOW EXACTLY:
The user's selected language code is: "${language}".
You MUST write the ENTIRE response in the language that corresponds to this code.
If the code is "uz" → Uzbek. "ru" → Russian. "ar" → Arabic. "tr" → Turkish. "de" → German. "fr" → French. "es" → Spanish. "it" → Italian. "pt" → Portuguese. "zh" → Chinese (Simplified). "ja" → Japanese. "ko" → Korean. "hi" → Hindi. "fa" → Persian. "kk" → Kazakh. "ky" → Kyrgyz. "tg" → Tajik. "uk" → Ukrainian. "az" → Azerbaijani. "id" → Indonesian. "ms" → Malay. "en" → English.
DO NOT mix languages. DO NOT include English explanations, labels, or field names. Every string value — destination, summary, bestTime, days, budget, tips — must be in the selected language only.

Respond with ONLY valid JSON (no markdown, no code fences) matching exactly this TypeScript type:
{
  "destination": string,         // primary destination, e.g. "Kyoto, Japan"
  "summary": string,             // 1-2 sentence overview of the trip vibe
  "bestTime": string,            // best time of year to take this trip
  "days": [                      // one entry per day, sized to the request (default 4-5 if unspecified)
    { "day": number, "title": string, "morning": string, "afternoon": string, "evening": string }
  ],
  "budget": [                    // 4-6 line items
    { "category": string, "amount": string }  // amount like "$80-120 / night"
  ],
  "tips": string[]               // 3-5 short insider tips
}
Keep each field concise and evocative. Never include any text outside the JSON object.`;
}

/** Extract a JSON object from a model response that may include stray text or fences. */
function parseItinerary(raw: string): Itinerary {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  const parsed = JSON.parse(text) as Itinerary;
  if (!Array.isArray(parsed.days)) parsed.days = [];
  if (!Array.isArray(parsed.budget)) parsed.budget = [];
  if (!Array.isArray(parsed.tips)) parsed.tips = [];
  return parsed;
}

/** Call the Rork AI proxy (Vercel gateway) to generate a structured itinerary. */
export async function generateItinerary(request: string, language: string = "en"): Promise<Itinerary> {
  const langHint = `Language: ${language}. Write ALL content in this language.`;
  const res = await fetch(`${TOOLKIT_URL}/v2/vercel/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOOLKIT_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4.5",
      temperature: 0.8,
      messages: [
        { role: "system", content: buildSystemPrompt(language) },
        { role: "user", content: `${langHint}\n\n${request}` },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Planner request failed (${res.status}). ${body.slice(0, 180)}`);
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("The planner returned an empty response. Please try again.");
  return parseItinerary(content);
}
