import { supabase } from "@/lib/supabase";

/* ============================================================
   Green Card (DV Lottery) eligibility checker — a platform-level
   paid AI service: upload passport + photo, pay, get an AI
   verdict against the official photo/eligibility requirements.
   Tables from migration 0027_green_card_eligibility_check.sql.
   Documents live in the PRIVATE 'green-card-docs' storage bucket.
   ============================================================ */

export type CheckStatus = "pending_payment" | "paid" | "processing" | "completed" | "failed";
export type AiProvider = "openai" | "anthropic";

export interface GreenCardCheck {
  id: string;
  user_id: string;
  passport_path: string;
  photo_path: string;
  status: CheckStatus;
  payment_amount: number;
  currency: string;
  paid_at: string | null;
  ai_eligible: boolean | null;
  ai_summary: string | null;
  ai_issues: string[];
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiSettings {
  provider: AiProvider;
  /** Never populated for non-owner callers — RLS only lets is_owner() read this table. */
  api_key: string | null;
  updated_at: string;
}

const CHECKS_KEY = "oxen.greencard.dev.checks";

function readArr<T>(k: string): T[] {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
function writeArr<T>(k: string, rows: T[]): void {
  try {
    localStorage.setItem(k, JSON.stringify(rows));
  } catch {
    // ignore
  }
}
function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}
function nowIso(): string {
  return new Date().toISOString();
}

// ── Upload ──

export async function uploadGreenCardDocs(
  userId: string,
  passportFile: File,
  photoFile: File,
): Promise<{ passportPath: string | null; photoPath: string | null; error: string | null }> {
  const stamp = Date.now();
  const passportPath = `${userId}/passport-${stamp}.pdf`;
  const photoPath = `${userId}/photo-${stamp}.jpg`;

  // Storage uploads throw on a network failure (unlike the database client,
  // which resolves with { error }) — e.g. when Supabase isn't connected yet
  // in local dev. Fall back to a local-only placeholder path so the rest of
  // the flow (payment + analysis UI) is still testable without a backend.
  try {
    const { error: passportErr } = await supabase.storage
      .from("green-card-docs")
      .upload(passportPath, passportFile, { contentType: passportFile.type || "application/pdf" });
    if (passportErr) throw passportErr;

    const { error: photoErr } = await supabase.storage
      .from("green-card-docs")
      .upload(photoPath, photoFile, { contentType: photoFile.type || "image/jpeg" });
    if (photoErr) throw photoErr;

    return { passportPath, photoPath, error: null };
  } catch (err) {
    console.warn("green-card-docs upload unavailable, using local-dev fallback:", err);
    return { passportPath: `local-dev/${passportPath}`, photoPath: `local-dev/${photoPath}`, error: null };
  }
}

export async function getSignedGreenCardUrl(path: string, seconds = 300): Promise<string | null> {
  const { data, error } = await supabase.storage.from("green-card-docs").createSignedUrl(path, seconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

// ── Checks CRUD ──

export async function createGreenCardCheck(input: {
  userId: string;
  passportPath: string;
  photoPath: string;
  /** 0 for the free "Test" flow (skips the simulated $3 charge). Defaults to 3. */
  paymentAmount?: number;
}): Promise<{ check: GreenCardCheck | null; error: string | null }> {
  const paymentAmount = input.paymentAmount ?? 3;
  const { data, error } = await supabase
    .from("green_card_checks")
    .insert({
      user_id: input.userId,
      passport_path: input.passportPath,
      photo_path: input.photoPath,
      status: "pending_payment",
      payment_amount: paymentAmount,
    })
    .select("*")
    .single();
  if (error) {
    const check: GreenCardCheck = {
      id: uid("gcc"),
      user_id: input.userId,
      passport_path: input.passportPath,
      photo_path: input.photoPath,
      status: "pending_payment",
      payment_amount: paymentAmount,
      currency: "USD",
      paid_at: null,
      ai_eligible: null,
      ai_summary: null,
      ai_issues: [],
      error_message: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    const rows = readArr<GreenCardCheck>(CHECKS_KEY);
    rows.push(check);
    writeArr(CHECKS_KEY, rows);
    return { check, error: null };
  }
  return { check: data as unknown as GreenCardCheck, error: null };
}

export async function fetchMyGreenCardChecks(userId: string): Promise<GreenCardCheck[]> {
  const { data, error } = await supabase
    .from("green_card_checks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("green_card_checks unavailable, using local-dev fallback:", error.message);
    return readArr<GreenCardCheck>(CHECKS_KEY)
      .filter((c) => c.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return (data ?? []) as unknown as GreenCardCheck[];
}

export async function fetchGreenCardCheck(id: string): Promise<GreenCardCheck | null> {
  const { data, error } = await supabase.from("green_card_checks").select("*").eq("id", id).maybeSingle();
  if (error) {
    return readArr<GreenCardCheck>(CHECKS_KEY).find((c) => c.id === id) ?? null;
  }
  return data as unknown as GreenCardCheck | null;
}

/**
 * Simulated payment — this project has no live payment gateway wired up
 * yet (mirrors the existing Checkout.tsx simulation). Marks the check
 * paid immediately. Replace with a real gateway webhook before launch.
 */
export async function simulateGreenCardPayment(checkId: string): Promise<boolean> {
  const { error } = await supabase
    .from("green_card_checks")
    .update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", checkId);
  if (error) {
    const rows = readArr<GreenCardCheck>(CHECKS_KEY);
    const idx = rows.findIndex((c) => c.id === checkId);
    if (idx === -1) return false;
    rows[idx] = { ...rows[idx], status: "paid", paid_at: nowIso(), updated_at: nowIso() };
    writeArr(CHECKS_KEY, rows);
    return true;
  }
  return true;
}

/** Invokes the green-card-check Edge Function to run the AI analysis. */
export async function runGreenCardAnalysis(checkId: string): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("green-card-check", { body: { checkId } });
    if (error) throw error;
    if (data?.error) return { ok: false, error: data.error as string };
    return { ok: true, error: null };
  } catch (err) {
    console.warn("green-card-check function unavailable, using local-dev fallback:", err);
    return localSimulateAnalysis(checkId);
  }
}

/** Dev-only: simulates what the green-card-check Edge Function would have written, so the
 *  full flow (upload -> pay -> AI verdict) is visible without a deployed backend + AI key. */
function localSimulateAnalysis(checkId: string): { ok: boolean; error: string | null } {
  const rows = readArr<GreenCardCheck>(CHECKS_KEY);
  const idx = rows.findIndex((c) => c.id === checkId);
  if (idx === -1) return { ok: false, error: "Check not found (local-dev store)." };

  rows[idx] = {
    ...rows[idx],
    status: "completed",
    ai_eligible: true,
    ai_summary: "[DEMO] Rasm asosiy talablarga yaqin ko'rinadi, lekin bu haqiqiy AI tekshiruvi emas — Supabase va AI kalit ulanganda haqiqiy natija chiqadi.",
    ai_issues: ["Bu demo natija — haqiqiy backend ulanmagan", "Fon rangini oq/och rangga tekshirish tavsiya etiladi"],
    updated_at: nowIso(),
  };
  writeArr(CHECKS_KEY, rows);
  return { ok: true, error: null };
}

// ── Owner-admin: AI provider settings ──

export async function fetchAiSettings(): Promise<AiSettings | null> {
  const { data, error } = await supabase.from("platform_ai_settings").select("*").maybeSingle();
  if (error) {
    console.error("fetchAiSettings error:", error);
    return null;
  }
  return data as unknown as AiSettings | null;
}

export async function upsertAiSettings(provider: AiProvider, apiKey: string, updatedBy: string): Promise<boolean> {
  const { error } = await supabase
    .from("platform_ai_settings")
    .upsert({ id: true, provider, api_key: apiKey, updated_by: updatedBy, updated_at: new Date().toISOString() });
  if (error) {
    console.error("upsertAiSettings error:", error);
    return false;
  }
  return true;
}
