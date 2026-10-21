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
export const extractionConfigured = () =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.SARVAM_API_KEY);

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

/** Turn a raw model result into a sanitised ExtractedDocument (last 4 digits only, validated values). */
function finish(raw: { doc_type?: string; readable?: boolean; fields?: Record<string, unknown>; warnings?: unknown[] }, hint?: DocType): ExtractedDocument {
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

/**
 * Read a document photo with Claude vision or Sarvam Document AI (free tier). LLM_PROVIDER picks
 * which goes first; if that one fails (bad key, outage) the other configured provider is tried.
 */
export async function extractDocument(image: ImageAttachment, hint?: DocType): Promise<ExtractedDocument> {
  const claude = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  const sarvam = Boolean(process.env.SARVAM_API_KEY);
  const order = process.env.LLM_PROVIDER?.toLowerCase() === "sarvam" ? ["sarvam", "claude"] : ["claude", "sarvam"];
  const readers = order
    .filter(p => (p === "claude" ? claude : sarvam))
    .map(p => (p === "claude" ? extractWithClaude : extractWithSarvam));
  if (!readers.length) throw new ExtractionUnavailableError("Document reading is not configured");

  let lastError: unknown;
  for (const read of readers) {
    try {
      return await read(image, hint);
    } catch (err) {
      lastError = err;
      console.error("[documents/extract] provider failed, trying next:", (err as Error).message);
    }
  }
  throw lastError;
}

// ─── Sarvam Document AI (Sarvam Vision) ──────────────────────────────────────

const SARVAM_DOC = "https://api.sarvam.ai/doc-ai/v1/job";

// Sarvam's extract schema: every field needs a type and description; no nullable unions.
const SARVAM_SCHEMA = {
  type: "object",
  properties: {
    doc_type: { type: "string", enum: DOC_TYPES, description: "Type of Indian document in the image" },
    readable: { type: "boolean", description: "false if this is not a legible Indian identity / welfare document" },
    name: { type: "string", description: "Holder's full name exactly as printed (the English one if both are printed)" },
    fatherOrHusbandName: { type: "string", description: "Father's or husband's name (S/O, D/O, W/O, C/O, पुत्र, पत्नी line)" },
    dateOfBirth: { type: "string", description: "Date of birth as DD/MM/YYYY" },
    gender: { type: "string", enum: ["male", "female", "other"], description: "Gender of the holder" },
    village: { type: "string", description: "Village / town / ward from the address" },
    district: { type: "string", description: "District from the address" },
    state: { type: "string", description: "Indian state name in English, e.g. Uttar Pradesh" },
    category: { type: "string", enum: ["general", "sc", "st", "obc", "minority"], description: "Social category, only if the document states it" },
    annualIncome: { type: "number", description: "Annual family income in rupees per year" },
    landHectares: { type: "number", description: "Total land area converted to hectares (1 acre = 0.405 ha, 1 bigha = 0.25 ha)" },
    bpl: { type: "boolean", description: "true if this is a BPL / Antyodaya / priority-household ration card" },
    ifsc: { type: "string", description: "Bank IFSC code (11 characters)" },
    idNumber: { type: "string", description: "The Aadhaar number or bank account number as printed" },
  },
};

async function sarvamFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${SARVAM_DOC}${path}`, {
    ...init,
    headers: { "api-subscription-key": process.env.SARVAM_API_KEY!, ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Sarvam Document AI ${res.status}: ${json?.error?.message ?? json?.message ?? "request failed"}`);
  return json;
}

async function extractWithSarvam(image: ImageAttachment, hint?: DocType): Promise<ExtractedDocument> {
  if (image.mediaType === "image/webp") throw new Error("Please upload a JPG or PNG photo");
  const ext = image.mediaType === "image/png" ? "png" : "jpg";
  const form = new FormData();
  form.append("file", new Blob([Buffer.from(image.data, "base64")], { type: image.mediaType }), `document.${ext}`);
  form.append("schema", JSON.stringify(SARVAM_SCHEMA));
  form.append("language", "hi-IN");
  form.append("output_format", "json");

  const job = await sarvamFetch("/extract", { method: "POST", body: form });
  if (!job.job_id) throw new Error("Could not start document reading");

  // Poll: a one-page photo usually finishes in ~5 s.
  const deadline = Date.now() + 60_000;
  let status = String(job.status ?? "pending").toLowerCase();
  while (!/completed|failed|cancel/.test(status)) {
    if (Date.now() > deadline) throw new Error("Document reading timed out — please try again");
    await new Promise(r => setTimeout(r, 1000));
    status = String((await sarvamFetch(`/${job.job_id}/status`)).status ?? "").toLowerCase();
  }
  if (!status.includes("completed")) throw new Error("Could not read the document — please try a clearer photo");

  const { result = {} } = await sarvamFetch(`/${job.job_id}/results`);
  const { doc_type, readable, idNumber, ...rest } = result as Record<string, unknown>;
  const docType = (DOC_TYPES.includes(doc_type as DocType) ? doc_type : hint) as DocType | undefined;
  // Keep only the last 4 digits of the ID, in the field that matches the document.
  const last4Key = docType === "bank_passbook" ? "bankAccountLast4" : docType === "aadhaar" ? "aadhaarLast4" : null;
  const fields: Record<string, unknown> = { ...rest };
  if (last4Key && idNumber) fields[last4Key] = idNumber;
  return finish({ doc_type: docType, readable: readable as boolean | undefined, fields, warnings: [] }, hint);
}

// ─── Claude vision ───────────────────────────────────────────────────────────

async function extractWithClaude(image: ImageAttachment, hint?: DocType): Promise<ExtractedDocument> {
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

  try {
    return finish(JSON.parse(text), hint);
  } catch {
    throw new Error("Could not read the document — please try a clearer photo");
  }
}
