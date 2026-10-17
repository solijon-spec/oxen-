// Supabase Edge Function: green-card-check
// ----------------------------------------------
// Runs an AI eligibility check for the Green Card (DV Lottery) photo
// + passport a user uploaded, after they've paid the check fee.
//
// Flow:
//   1. Receive { checkId } + the caller's Supabase access token
//      (Authorization: Bearer <user JWT>).
//   2. Verify the token belongs to a real user, and that user owns
//      the green_card_checks row (service-role client, RLS bypassed
//      only for this one verified lookup).
//   3. Require status = 'paid' (payment must already be recorded).
//   4. Download the photo + passport from the PRIVATE
//      'green-card-docs' storage bucket (service-role).
//   5. Read the AI provider + API key from `platform_ai_settings`
//      (set once by the platform owner in Owner Admin → Settings).
//      The key never reaches the browser — it only lives here.
//   6. Call the configured provider's vision API with the official
//      DV Lottery photo-requirement checklist, asking for a
//      structured verdict.
//   7. Write the result back to green_card_checks (status, eligible,
//      summary, issues) and return it.
//
// Deploy:
//   supabase functions deploy green-card-check --no-verify-jwt
//
// Required env (Supabase dashboard → Edge Functions → Secrets):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Call from the client:
//   POST {SUPABASE_URL}/functions/v1/green-card-check
//   Headers: Authorization: Bearer <user access token>
//   { "checkId": "..." }
// ----------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

// Official U.S. Diversity Visa (Green Card) photo requirements, summarized
// from the Department of State's published specification.
const DV_PHOTO_REQUIREMENTS = `
U.S. Diversity Visa (Green Card) Lottery photo requirements:
- Taken within the last 6 months, showing current appearance.
- Square, at least 600x600 pixels, at most 1200x1200 pixels, JPEG format.
- Full face, front view, directly facing the camera, neutral facial expression, both eyes open.
- Plain white or off-white background, no shadows, no objects/other people in the background.
- Head height (chin to top of head) between 50% and 69% of the image's total height.
- No eyeglasses (as of the current rule), no head covering/hat unless for religious/medical reasons,
  no headphones, no uniforms.
- No digital alteration, filters, or red-eye removal that changes natural appearance.
- Adequate lighting with no glare, shadows across the face, or overexposure.
`.trim();

const SYSTEM_PROMPT = `You are an assistant that checks a submitted photo (and, when available, a passport document) against the official U.S. Diversity Visa (Green Card) Lottery photo and basic eligibility requirements below.

${DV_PHOTO_REQUIREMENTS}

Respond with ONLY a JSON object (no markdown, no prose outside the JSON) in exactly this shape:
{"eligible": boolean, "summary": "one or two sentence plain-language verdict", "issues": ["short specific issue 1", "short specific issue 2"]}

"eligible" is true only if the photo appears to meet all requirements above. List every concrete issue you can see (e.g. "background is not plain white", "head size appears too small", "wearing eyeglasses"). If you are uncertain about something you cannot verify from the image alone (e.g. exact pixel dimensions), note it as an issue rather than assuming compliance. If a passport document was provided, briefly note anything in it (e.g. expiry, legibility) relevant to applying, but the eligible verdict is primarily about the PHOTO.`;

interface AiVerdict {
  eligible: boolean;
  summary: string;
  issues: string[];
}

function parseVerdict(raw: string): AiVerdict {
  // Models sometimes wrap JSON in a code fence despite instructions — strip it.
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const parsed = JSON.parse(cleaned) as Partial<AiVerdict>;
  return {
    eligible: !!parsed.eligible,
    summary: typeof parsed.summary === "string" ? parsed.summary : "No summary returned.",
    issues: Array.isArray(parsed.issues) ? parsed.issues.filter((i) => typeof i === "string") : [],
  };
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function callOpenAI(apiKey: string, photoB64: string): Promise<AiVerdict> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Here is the submitted photo. A passport document was also submitted separately but is not shown here — base your verdict on the photo." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${photoB64}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("OpenAI returned no content");
  return parseVerdict(content);
}

async function callAnthropic(apiKey: string, photoB64: string, passportB64: string | null): Promise<AiVerdict> {
  const content: Record<string, unknown>[] = [
    { type: "text", text: "Here is the submitted photo:" },
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: photoB64 } },
  ];
  if (passportB64) {
    content.push({ type: "text", text: "Here is the submitted passport document:" });
    content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: passportB64 } });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const textBlock = data?.content?.find((b: { type: string }) => b.type === "text");
  if (!textBlock?.text) throw new Error("Anthropic returned no content");
  return parseVerdict(textBlock.text as string);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("green-card-check: missing server env vars");
    return json(500, { error: "Server is not configured." });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!userToken) return json(401, { error: "Missing Authorization header." });

  let body: { checkId?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  const checkId = typeof body.checkId === "string" ? body.checkId : null;
  if (!checkId) return json(400, { error: "checkId is required." });

  const svc = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" };

  try {
    // ── Verify the caller is a real, authenticated user ──
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${userToken}` },
    });
    if (!userRes.ok) return json(401, { error: "Invalid or expired session." });
    const callerUser = await userRes.json();
    const callerId = callerUser?.id as string | undefined;
    if (!callerId) return json(401, { error: "Invalid session." });

    // ── Load the check row (service role) and verify ownership ──
    const checkRes = await fetch(
      `${supabaseUrl}/rest/v1/green_card_checks?id=eq.${encodeURIComponent(checkId)}&limit=1`,
      { headers: svc },
    );
    const checkRows = await checkRes.json();
    const check = Array.isArray(checkRows) ? checkRows[0] : null;
    if (!check) return json(404, { error: "Check not found." });
    if (check.user_id !== callerId) return json(403, { error: "You do not own this check." });
    if (check.status !== "paid") {
      return json(400, { error: `Check must be paid before analysis (current status: ${check.status}).` });
    }

    // Mark as processing immediately so repeat clicks don't double-charge the AI API.
    await fetch(`${supabaseUrl}/rest/v1/green_card_checks?id=eq.${encodeURIComponent(checkId)}`, {
      method: "PATCH",
      headers: { ...svc, Prefer: "return=minimal" },
      body: JSON.stringify({ status: "processing", updated_at: new Date().toISOString() }),
    });

    // ── Load the AI provider settings ──
    const settingsRes = await fetch(`${supabaseUrl}/rest/v1/platform_ai_settings?limit=1`, { headers: svc });
    const settingsRows = await settingsRes.json();
    const settings = Array.isArray(settingsRows) ? settingsRows[0] : null;
    if (!settings?.api_key) {
      await fetch(`${supabaseUrl}/rest/v1/green_card_checks?id=eq.${encodeURIComponent(checkId)}`, {
        method: "PATCH",
        headers: { ...svc, Prefer: "return=minimal" },
        body: JSON.stringify({
          status: "failed",
          error_message: "AI provider is not configured yet. The platform owner needs to add an API key in Owner Admin → Settings.",
          updated_at: new Date().toISOString(),
        }),
      });
      return json(422, { error: "AI provider not configured." });
    }

    // ── Download the files from the private bucket (service role) ──
    const [photoRes, passportRes] = await Promise.all([
      fetch(`${supabaseUrl}/storage/v1/object/green-card-docs/${check.photo_path}`, {
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      }),
      fetch(`${supabaseUrl}/storage/v1/object/green-card-docs/${check.passport_path}`, {
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      }),
    ]);
    if (!photoRes.ok) throw new Error("Could not download the submitted photo.");
    const photoB64 = toBase64(new Uint8Array(await photoRes.arrayBuffer()));
    const passportB64 = passportRes.ok ? toBase64(new Uint8Array(await passportRes.arrayBuffer())) : null;

    // ── Call the configured AI provider ──
    const verdict =
      settings.provider === "anthropic"
        ? await callAnthropic(settings.api_key, photoB64, passportB64)
        : await callOpenAI(settings.api_key, photoB64);

    await fetch(`${supabaseUrl}/rest/v1/green_card_checks?id=eq.${encodeURIComponent(checkId)}`, {
      method: "PATCH",
      headers: { ...svc, Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "completed",
        ai_eligible: verdict.eligible,
        ai_summary: verdict.summary,
        ai_issues: verdict.issues,
        updated_at: new Date().toISOString(),
      }),
    });

    return json(200, { ok: true, ...verdict });
  } catch (err) {
    console.error("green-card-check error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    try {
      await fetch(`${supabaseUrl}/rest/v1/green_card_checks?id=eq.${encodeURIComponent(checkId)}`, {
        method: "PATCH",
        headers: { ...svc, Prefer: "return=minimal" },
        body: JSON.stringify({ status: "failed", error_message: message, updated_at: new Date().toISOString() }),
      });
    } catch {
      // best-effort
    }
    return json(500, { error: message });
  }
});
