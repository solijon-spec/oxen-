const TOOLKIT_URL = import.meta.env.EXPO_PUBLIC_TOOLKIT_URL ?? "https://toolkit.rork.com";
const TOOLKIT_KEY = import.meta.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY ?? "";

/* ------------------------------------------------------------------ */
/*  University AI recommendation — suggests universities based on     */
/*  user preferences (country, budget, scores, major, goals)          */
/* ------------------------------------------------------------------ */

export interface UniversityAIInput {
  preferredCountry?: string;
  budget?: string;
  ieltsScore?: string;
  toeflScore?: string;
  satScore?: string;
  academicDegree?: string;
  major?: string;
  careerGoals?: string;
  scholarshipPreference?: string;
  language?: string;
  savedUniversities?: string[];
  visitedUniversities?: string[];
}

export interface UniversityRecommendation {
  id: string;
  name: string;
  country: string;
  city: string;
  qsRanking: number;
  matchScore: number;
  reasons: string[];
  tuition: string;
  scholarshipAvailable: boolean;
}

export interface UniversityAIResponse {
  recommendations: UniversityRecommendation[];
  summary: string;
}

function buildSystemPrompt(language: string): string {
  return `You are OXEN University Advisor, an expert AI that recommends universities to students based on their preferences.

CRITICAL LANGUAGE RULE — FOLLOW EXACTLY:
The user's selected language code is: "${language}".
You MUST write the ENTIRE response in the language that corresponds to this code.
If the code is "uz" → Uzbek. "ru" → Russian. "ar" → Arabic. "tr" → Turkish. "de" → German. "fr" → French. "es" → Spanish. "it" → Italian. "pt" → Portuguese. "zh" → Chinese (Simplified). "ja" → Japanese. "ko" → Korean. "hi" → Hindi. "fa" → Persian. "kk" → Kazakh. "ky" → Kyrgyz. "tg" → Tajik. "uk" → Ukrainian. "az" → Azerbaijani. "id" → Indonesian. "ms" → Malay. "en" → English.
DO NOT mix languages. Every string value must be in the selected language only.

Given the student's preferences, recommend the 5 best matching universities from this list (use their IDs):
- harvard: Harvard University, USA, QS #4, $57,261/yr, IELTS 7.5+, SAT 1460-1580
- stanford: Stanford University, USA, QS #6, $61,731/yr, IELTS 7.0+, SAT 1470-1570
- mit: MIT, USA, QS #1, $57,986/yr, IELTS 7.5+, SAT 1520-1580
- oxford: University of Oxford, UK, QS #3, ~$37,000/yr, IELTS 7.5+
- cambridge: University of Cambridge, UK, QS #2, ~$31,000/yr, IELTS 7.5+
- toronto: University of Toronto, Canada, QS #25, ~$43,000/yr, IELTS 6.5+
- eth-zurich: ETH Zurich, Switzerland, QS #7, ~$1,660/yr, IELTS 7.0+
- nus: National University of Singapore, QS #8, ~$28,000/yr, IELTS 6.5+
- seoul-national: Seoul National University, South Korea, QS #31, ~$4,200/yr, IELTS 6.5+
- tokyo: University of Tokyo, Japan, QS #32, ~$3,600/yr, IELTS 6.0+
- tsinghua: Tsinghua University, China, QS #20, ~$4,200/yr, IELTS 6.5+
- peking: Peking University, China, QS #14, ~$4,200/yr, IELTS 6.5+
- sorbonne: Sorbonne University, France, QS #59, ~$10,200/yr, IELTS 6.5+
- melbourne: University of Melbourne, Australia, QS #13, ~$35,000/yr, IELTS 6.5+
- sydney: University of Sydney, Australia, QS #19, ~$38,000/yr, IELTS 7.0+
- tum: Technical University of Munich, Germany, QS #28, ~$144/yr, IELTS 6.5+
- kaist: KAIST, South Korea, QS #47, ~$28,000/yr, IELTS 6.5+
- epfl: EPFL, Switzerland, QS #36, ~$1,430/yr, IELTS 7.0+
- bocconi: Bocconi University, Italy, QS #46, ~$14,500/yr, IELTS 6.5+
- polimi: Politecnico di Milano, Italy, QS #123, ~$4,500/yr, IELTS 6.0+

Respond with ONLY valid JSON (no markdown, no code fences) matching this TypeScript type:
{
  "recommendations": [
    {
      "id": string,
      "name": string,
      "country": string,
      "city": string,
      "qsRanking": number,
      "matchScore": number,
      "reasons": string[],
      "tuition": string,
      "scholarshipAvailable": boolean
    }
  ],
  "summary": string
}
The "matchScore" is 0-100 based on how well it matches the student's criteria.
The "reasons" array should have 2-3 short reasons in the selected language.
The "summary" should be 1-2 sentences in the selected language.
Recommend exactly 5 universities, sorted by matchScore descending.`;
}

function parseResponse(raw: string): UniversityAIResponse {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  const parsed = JSON.parse(text) as UniversityAIResponse;
  if (!Array.isArray(parsed.recommendations)) parsed.recommendations = [];
  return parsed;
}

/** Call the Rork AI proxy to get university recommendations. */
export async function getUniversityRecommendations(
  input: UniversityAIInput,
  language: string = "en",
): Promise<UniversityAIResponse> {
  const userMessage = `Student preferences:
- Preferred country: ${input.preferredCountry ?? "Any"}
- Budget: ${input.budget ?? "Not specified"}
- IELTS score: ${input.ieltsScore ?? "Not specified"}
- TOEFL score: ${input.toeflScore ?? "Not specified"}
- SAT score: ${input.satScore ?? "Not specified"}
- Academic degree: ${input.academicDegree ?? "Not specified"}
- Major: ${input.major ?? "Not specified"}
- Career goals: ${input.careerGoals ?? "Not specified"}
- Scholarship preference: ${input.scholarshipPreference ?? "Not specified"}
- Preferred language of instruction: ${input.language ?? "Any"}
- Already saved universities: ${input.savedUniversities?.join(", ") ?? "None"}
- Already visited universities: ${input.visitedUniversities?.join(", ") ?? "None"}

Please recommend the best 5 universities for this student.`;

  const res = await fetch(`${TOOLKIT_URL}/v2/vercel/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOOLKIT_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4.5",
      temperature: 0.7,
      messages: [
        { role: "system", content: buildSystemPrompt(language) },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI recommendation request failed (${res.status}). ${body.slice(0, 180)}`);
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("The AI returned an empty response. Please try again.");
  return parseResponse(content);
}
