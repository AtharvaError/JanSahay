import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// Signed, httpOnly session cookie issued after the WhatsApp OTP proves the citizen owns the mobile.
// Value: "<mobile>.<expiresAtMs>.<hmac>". No server-side session table needed.

const COOKIE = "js_session";
const MAX_AGE_S = 90 * 24 * 3600;
const SECRET = process.env.SESSION_SECRET ?? process.env.DRAFT_SIGNING_SECRET ?? "jansahay-dev-secret-change-me";

const sign = (payload: string) => createHmac("sha256", SECRET).update(`session:${payload}`).digest("hex");

/** Normalise to a 10-digit Indian mobile, or null. */
export function normaliseMobile(raw: unknown): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export async function setSession(mobile: string) {
  const payload = `${mobile}.${Date.now() + MAX_AGE_S * 1000}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: MAX_AGE_S, path: "/",
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

/** The verified mobile for this request, or null. */
export async function getSessionMobile(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [mobile, exp, mac] = raw.split(".");
  if (!mobile || !exp || !mac) return null;
  const expected = Buffer.from(sign(`${mobile}.${exp}`));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return Number(exp) > Date.now() ? mobile : null;
}

export const maskMobile = (m: string) => `+91 ${m.slice(0, 2)}XXXXXX${m.slice(-2)}`;
