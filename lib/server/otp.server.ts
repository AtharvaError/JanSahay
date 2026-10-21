import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { getDb } from "./db.server";

// One-time codes for WhatsApp mobile verification. Stored hashed in the database when one is
// configured (so it works across serverless instances), otherwise in process memory.

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SECRET = process.env.SESSION_SECRET ?? process.env.DRAFT_SIGNING_SECRET ?? "jansahay-dev-secret-change-me";
const hash = (mobile: string, code: string) => createHmac("sha256", SECRET).update(`otp:${mobile}:${code}`).digest("hex");

type Entry = { codeHash: string; expiresAt: number; attempts: number };
const g = globalThis as unknown as { __jansahayOtp?: Map<string, Entry> };
const memory = (g.__jansahayOtp ??= new Map());

/** Create and store a code. `demo` uses the fixed code 123456 (when no real provider can deliver it). */
export async function issueOtp(mobile: string, demo: boolean): Promise<string> {
  const code = demo ? "123456" : randomInt(100000, 1000000).toString();
  const entry: Entry = { codeHash: hash(mobile, code), expiresAt: Date.now() + TTL_MS, attempts: 0 };
  const db = await getDb();
  if (db) {
    await db.query(
      `INSERT INTO otp_codes (mobile, code_hash, expires_at, attempts) VALUES ($1, $2, $3, 0)
       ON CONFLICT (mobile) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0`,
      [mobile, entry.codeHash, new Date(entry.expiresAt).toISOString()],
    );
  } else {
    memory.set(mobile, entry);
  }
  return code;
}

/** True once for a correct, unexpired code; the code is consumed on success. */
export async function checkOtp(mobile: string, code: string): Promise<boolean> {
  const db = await getDb();
  let entry: Entry | undefined;
  if (db) {
    const [row] = await db.query<{ code_hash: string; expires_at: string; attempts: number }>(
      `SELECT code_hash, expires_at, attempts FROM otp_codes WHERE mobile = $1`, [mobile],
    );
    if (row) entry = { codeHash: row.code_hash, expiresAt: Date.parse(row.expires_at), attempts: Number(row.attempts) };
  } else {
    entry = memory.get(mobile);
  }
  if (!entry || entry.expiresAt < Date.now() || entry.attempts >= MAX_ATTEMPTS) return false;

  const a = Buffer.from(entry.codeHash);
  const b = Buffer.from(hash(mobile, code));
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (db) {
    await db.query(ok ? `DELETE FROM otp_codes WHERE mobile = $1` : `UPDATE otp_codes SET attempts = attempts + 1 WHERE mobile = $1`, [mobile]);
  } else if (ok) {
    memory.delete(mobile);
  } else {
    entry.attempts++;
  }
  return ok;
}
