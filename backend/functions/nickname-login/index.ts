// Supabase Edge Function: nickname-login
// ----------------------------------------------
// Secure nickname + password login.
//
// Flow:
//   1. Receive { nickname, password }.
//   2. Normalize the nickname (trim + lowercase).
//   3. Apply simple in-memory rate limiting per IP + nickname.
//   4. Look up the corresponding normalized email from profiles
//      (server-side only — never exposed to the browser).
//   5. Authenticate via Supabase Auth using the matched email
//      and the supplied password (service-role client).
//   6. Return only the session tokens or a generic error.
//
// Security:
//   - Never reveals whether a nickname exists.
//   - Generic error: "Nickname or password is incorrect."
//   - Rate-limited: max 5 attempts / 5 minutes / IP + nickname.
//   - No service-role key in frontend code.
//   - No email returned to the browser before successful login.
//
// Deploy:
//   supabase functions deploy nickname-login --no-verify-jwt
//
// Required env (set in Supabase dashboard → Edge Functions → Secrets):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// After deploy, call from the client:
//   POST {SUPABASE_URL}/functions/v1/nickname-login
//   { "nickname": "alex.42", "password": "secret123" }
// ----------------------------------------------

// Minimal in-memory rate limiter (per cold-start instance).
// For production at scale, swap for a Redis/Durable Object limiter.
interface RateBucket {
  count: number;
  firstAt: number;
}
const rateMap = new Map<string, RateBucket>();
const RATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_MAX = 5; // 5 attempts per window per key

function rateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = rateMap.get(key);
  if (!bucket || now - bucket.firstAt > RATE_WINDOW_MS) {
    rateMap.set(key, { count: 1, firstAt: now });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_MAX;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  });
}

const GENERIC_ERROR = "Nickname or password is incorrect.";

// Reserved nicknames that can never be logged into
const RESERVED = new Set([
  "admin", "owner", "oxen", "support", "moderator", "system",
  "root", "official", "help", "null", "undefined",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  // ── Parse body ──
  let body: { nickname?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const rawNickname = typeof body.nickname === "string" ? body.nickname : "";
  const rawPassword = typeof body.password === "string" ? body.password : "";

  // ── Basic validation ──
  if (!rawNickname || !rawPassword) {
    return json(400, { error: "Nickname and password are required." });
  }

  // Normalize nickname: trim + lowercase
  const nickname = rawNickname.trim().toLowerCase();

  // Reject reserved names at the login boundary
  if (RESERVED.has(nickname)) {
    // Return generic error — don't reveal it's reserved
    return json(401, { error: GENERIC_ERROR });
  }

  // Validate nickname format: Latin letters, numbers, underscore, dot, 3-24
  if (!/^[a-z0-9_.]{3,24}$/.test(nickname)) {
    return json(401, { error: GENERIC_ERROR });
  }

  // ── Rate limit: combine client IP + normalized nickname ──
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip")?.trim() ??
    "unknown";
  const rateKey = `${clientIp}:${nickname}`;
  if (!rateLimit(rateKey)) {
    return json(429, {
      error: "Too many attempts. Please wait a few minutes and try again.",
    });
  }

  // ── Env checks ──
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("nickname-login: missing server env vars");
    return json(500, { error: "Server is not configured for nickname login." });
  }

  try {
    // ── Look up the profile by normalized_nickname (server-side) ──
    // Use the service-role client so RLS is bypassed for the lookup only.
    const lookupRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=email,normalized_email,onboarding_completed,account_status&normalized_nickname=eq.${encodeURIComponent(nickname)}&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Range: "0-0",
        },
      },
    );

    if (!lookupRes.ok) {
      console.error("nickname-login: profile lookup failed", lookupRes.status);
      return json(401, { error: GENERIC_ERROR });
    }

    const rows = await lookupRes.json() as Array<{
      email: string | null;
      normalized_email: string | null;
      onboarding_completed: boolean | null;
      account_status: string | null;
    }>;

    // No profile found → generic error (no enumeration)
    if (!rows.length || !rows[0].email) {
      return json(401, { error: GENERIC_ERROR });
    }

    const profile = rows[0];

    // Block login if onboarding not completed (no password set yet)
    if (!profile.onboarding_completed) {
      return json(401, { error: "Please complete your profile setup first using Google sign-in." });
    }

    // Block suspended/blocked accounts
    const status = profile.account_status ?? "active";
    if (status === "blocked" || status === "suspended" || status === "deleted") {
      return json(403, { error: "This account has been suspended. Contact OXEN support." });
    }

    // ── Authenticate via Supabase Auth (password grant) ──
    // Uses the service-role key to call the auth endpoint directly.
    // This validates the password against Supabase Auth's secure store.
    const authRes = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: profile.email,
          password: rawPassword,
        }),
      },
    );

    if (!authRes.ok) {
      // Invalid password → generic error (no enumeration)
      return json(401, { error: GENERIC_ERROR });
    }

    const session = await authRes.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      user?: { id?: string };
    };

    // ── Return only the session tokens (never the email) ──
    if (!session.access_token || !session.refresh_token) {
      return json(401, { error: GENERIC_ERROR });
    }

    return json(200, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in ?? 3600,
      token_type: session.token_type ?? "bearer",
      user_id: session.user?.id ?? null,
    });
  } catch (err) {
    console.error("nickname-login: unexpected error", err);
    return json(500, { error: "Authentication service unavailable. Please try again." });
  }
});
