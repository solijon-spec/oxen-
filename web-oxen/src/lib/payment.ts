/* ============================================================
   Payment utilities — TEST MODE
   ------------------------------------------------------------
   Simulated, in-browser payment flow. Clearly marked TEST MODE.
   No raw card number or CVV is ever stored or sent anywhere.
   Architecture mirrors Stripe's tokenization pattern so a real
   provider can be dropped in by:
     1. Adding VITE_STRIPE_PUBLISHABLE_KEY (client) + a server
        endpoint that holds the secret key.
     2. Replacing `tokenizeCard` with Stripe.createPaymentMethod.
   ============================================================ */

export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "unknown";

export interface TokenizedCard {
  /** Fake payment-method id, e.g. pm_test_xxx (mirrors Stripe pm_xxx). */
  paymentMethodId: string;
  /** Fake customer id, e.g. cus_test_xxx. */
  customerId: string;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  /** Masked display string, e.g. "•••• 4242". */
  masked: string;
}

export interface CardInput {
  cardholder: string;
  number: string;
  exp: string; // "MM/YY"
  cvv: string;
  billingCountry: string;
  billingAddress: string;
}

/** Detect card brand from the leading digits. */
export function detectBrand(number: string): CardBrand {
  const n = number.replace(/\s+/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^6(?:011|5)/.test(n)) return "discover";
  return "unknown";
}

/** Mask a card number to show only the last 4 digits. */
export function maskCard(number: string): string {
  const n = number.replace(/\s+/g, "");
  const last4 = n.slice(-4);
  return `•••• ${last4}`;
}

/** Luhn checksum — validates the card number is well-formed. */
export function luhnValid(number: string): boolean {
  const n = number.replace(/\D/g, "");
  if (n.length < 13 || n.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = parseInt(n[i], 10);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/** Generate a fake id that mimics a provider's id format. */
function fakeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 12);
  const time = Date.now().toString(36);
  return `${prefix}_test_${time}${rand}`;
}

/**
 * Tokenize a card in-browser (TEST MODE).
 * Returns a TokenizedCard with fake pm/cus ids + masked details.
 * Never throws on success; throws on validation failure.
 *
 * To swap in Stripe: replace this body with
 *   const pm = await stripe.createPaymentMethod({ type:'card', card });
 *   return { paymentMethodId: pm.id, customerId: ..., ... };
 */
export async function tokenizeCard(input: CardInput): Promise<TokenizedCard> {
  // Simulate network latency for realistic UX
  await new Promise((r) => setTimeout(r, 700));

  const number = input.number.replace(/\s+/g, "");
  if (!luhnValid(number)) {
    throw new Error("Invalid card number. (TEST MODE: use 4242 4242 4242 4242)");
  }
  const expParts = input.exp.split("/");
  const expMonth = parseInt(expParts[0] ?? "", 10);
  const expYear = parseInt((expParts[1] ?? "").padStart(2, "20"), 10);
  if (!expMonth || expMonth < 1 || expMonth > 12) {
    throw new Error("Invalid expiration month.");
  }
  if (!expYear || expYear < new Date().getFullYear()) {
    throw new Error("Card has expired.");
  }
  if (input.cvv.replace(/\D/g, "").length < 3) {
    throw new Error("Invalid CVV.");
  }

  const brand = detectBrand(number);
  const last4 = number.slice(-4);

  return {
    paymentMethodId: fakeId("pm"),
    customerId: fakeId("cus"),
    brand,
    last4,
    expMonth,
    expYear,
    masked: maskCard(number),
  };
}

// ── OTP (TEST MODE) ─────────────────────────────────────────

/** The test OTP that is always accepted. */
export const TEST_OTP = "123456";

export interface OtpSession {
  code: string;
  sentAt: number;
  expiresAt: number; // ms timestamp
  phoneNumber: string;
}

/**
 * "Send" an OTP to a phone number (TEST MODE).
 * In production this calls a server endpoint that uses Twilio.
 * Here we generate a 6-digit code and return it so the UI can
 * display it in a clearly-marked test-mode callout.
 */
export async function sendOtp(phoneNumber: string): Promise<OtpSession> {
  await new Promise((r) => setTimeout(r, 500));
  const now = Date.now();
  // Use the fixed test code so the user always knows what to type.
  return {
    code: TEST_OTP,
    sentAt: now,
    expiresAt: now + 5 * 60 * 1000, // 5 min validity
    phoneNumber,
  };
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "incorrect" | "expired" };

/** Verify an OTP against a session (TEST MODE). */
export async function verifyOtp(session: OtpSession, code: string): Promise<OtpVerifyResult> {
  await new Promise((r) => setTimeout(r, 300));
  if (Date.now() > session.expiresAt) {
    return { ok: false, reason: "expired" };
  }
  if (code.trim() !== session.code) {
    return { ok: false, reason: "incorrect" };
  }
  return { ok: true };
}

/** Resend cooldown in seconds. */
export const OTP_RESEND_SECONDS = 60;
