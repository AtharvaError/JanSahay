import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import type { DocType, ExtractableKey, ExtractedDocument, ImageAttachment } from "./types";
import { DOC_TYPES, EXTRACTABLE_KEYS } from "./types";

const MODEL = "claude-opus-5-5";
export const MEDIA_TYPES: ImageAttachment["mediaType"][] = ["image/jpeg", "image/png", "image/webp"];
const MAX_BASE64 = 7_000_000; // ≈5 MB image; the client downsizes photos well below this

export class ExtractionUnavailableError extends Error {}

// Created lazily so the app still boots without credentials.
let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());
export const extractionConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

// ─── Output schema ───────────────────────────────────────────────────────────

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }] });
const str = (description: string) => nullable({ type: "string", description });
const num = (description: string) => nullable({ type: "number", description });

const FIELD_SCHEMA: Record<ExtractableKey, Record<string, unknown>> = {
  name: str("Holder's full name exactly as printed (Latin script if printed, else as printed)"),
  fatherOrHusbandName: str("Father's or husband's name (S/O, D/O, W/O, C/O line)"),
  dateOfBirth: str("DD/MM/YYYY"),
  age: num("Age in years, only if printed and no date of birth"),
  gender: nullable({ type: "string", enum: ["male", "female", "other"] }),
  village: str("Village / town / ward from the address"),
  district: str("District from the address"),
  state: str("Indian state name in English, e.g. 'Uttar Pradesh'"),
  category: nullable({ type: "string", enum: ["general", "sc", "st", "obc", "minority"] }),
  annualIncome: num("Annual family income in rupees per year (convert monthly × 12)"),
  landHectares: num("Total land area in hectares (1 acre = 0.405 ha, 1 bigha ≈ 0.25 ha, 1 guntha ≈ 0.0101 ha)"),
  bpl: nullable({ type: "boolean", description: "true if a BPL / Antyodaya (AAY) / priority-household ration card" }),
  ifsc: str("Bank IFSC code, 11 characters"),
  aadhaarLast4: str("ONLY the last 4 digits of the Aadhaar number"),
  bankAccountLast4: str("ONLY the last 4 digits of the bank account number"),
};

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    doc_type: { type: "string", enum: DOC_TYPES },
    readable: { type: "boolean", description: "false if the image is not a legible Indian identity / welfare document" },
    fields: {
      type: "object",
      properties: FIELD_SCHEMA,
      required: [...EXTRACTABLE_KEYS],
      additionalProperties: false,
    },
    warnings: { type: "array", items: { type: "string" }, description: "Short English notes, e.g. blurry, cropped, expired" },
  },
  required: ["doc_type", "readable", "fields", "warnings"],
  additionalProperties: false,
};

const PROMPT = `You are reading a photo of an Indian citizen's document for a welfare-scheme application (Aadhaar card, ration card, income certificate, bank passbook / cheque, land record such as 7/12, khatauni or patta, caste certificate).

Identify the document type and copy the fields that are actually printed on it. Use null for anything not printed or not legible — never guess.
- PRIVACY: never output a full Aadhaar number, VID or bank account number. Output only their LAST 4 digits.
- Dates as DD/MM/YYYY. Income as rupees per year. Land in hectares (convert from acres, bigha, guntha, kanal as stated).
- category only if the document states SC / ST / OBC / General / minority.
- Names in the script printed; if both English and a regional script are printed, use the English one.`;

// ─── Sanitising ──────────────────────────────────────────────────────────────

const LONG_DIGITS = /\d[\d\s-]{6,}\d/g; // 8+ digit runs (Aadhaar / account numbers)

function clean(key: ExtractableKey, val: unknown): string | null {
  if (val === null || val === undefined || val === "") return null;
  if (key === "aadhaarLast4" || key === "bankAccountLast4") {
    const digits = String(val).replace(/\D/g, "");
    return digits.length >= 4 ? digits.slice(-4) : null;
  }
  if (key === "ifsc") {
    const code = String(val).replace(/\s/g, "").toUpperCase();
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(code) ? code : null;
  }
  if (key === "bpl") return val === true || val === "true" ? "true" : val === false || val === "false" ? "false" : null;
  if (key === "age" || key === "annualIncome" || key === "landHectares") {
    const n = Number(val);
    return Number.isFinite(n) && n >= 0 ? String(Math.round(n * 100) / 100) : null;
  }
  if (key === "dateOfBirth") {
    const m = String(val).match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
    return m ? `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}` : null;
  }
  // Free text: strip anything that looks like a full ID / account number.
  const s = String(val).replace(LONG_DIGITS, "").replace(/\s+/g, " ").trim().slice(0, 120);
  return s || null;
}

function ageFromDob(dob: string): string | null {
  const [d, m, y] = dob.split("/").map(Number);
  const born = new Date(y, m - 1, d);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() < m - 1 || (now.getMonth() === m - 1 && now.getDate() < d)) age--;
  return age >= 0 && age < 120 ? String(age) : null;
}

// ─── Extraction ──────────────────────────────────────────────────────────────

export function validAttachment(a: unknown): a is ImageAttachment {
  const x = a as ImageAttachment | null;
  return Boolean(
    x && typeof x.data === "string" && x.data.length > 100 && x.data.length <= MAX_BASE64 &&
    MEDIA_TYPES.includes(x.mediaType) && /^[A-Za-z0-9+/=]+$/.test(x.data.slice(0, 200)),
  );
}

/** Read a document photo with Claude vision. The image is not stored anywhere. */
export async function extractDocument(image: ImageAttachment, hint?: DocType): Promise<ExtractedDocument> {
  if (!extractionConfigured()) throw new ExtractionUnavailableError("Document reading is not configured");

  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
        { type: "text", text: hint && hint !== "other" ? `${PROMPT}\n\nThe citizen says this is their ${hint.replace(/_/g, " ")}.` : PROMPT },
      ],
    }],
  });

  if (response.stop_reason === "refusal") throw new Error("The document could not be processed");
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map(b => b.text)
    .join("");

  let raw: { doc_type?: string; readable?: boolean; fields?: Record<string, unknown>; warnings?: unknown[] };
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Could not read the document — please try a clearer photo");
  }

  const fields: ExtractedDocument["fields"] = {};
  if (raw.readable !== false) {
    for (const key of EXTRACTABLE_KEYS) {
      const v = clean(key, raw.fields?.[key]);
      if (v !== null) fields[key] = v;
    }
    if (fields.dateOfBirth && !fields.age) {
      const age = ageFromDob(fields.dateOfBirth);
      if (age) fields.age = age;
    }
  }

  return {
    extractionId: `DOC-${randomUUID().slice(0, 8).toUpperCase()}`,
    docType: DOC_TYPES.includes(raw.doc_type as DocType) ? (raw.doc_type as DocType) : hint ?? "other",
    fields,
    warnings: (Array.isArray(raw.warnings) ? raw.warnings : [])
      .map(w => String(w).replace(LONG_DIGITS, "").slice(0, 140))
      .slice(0, 5),
  };
}
