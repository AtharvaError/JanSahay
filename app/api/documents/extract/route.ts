import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/server/ratelimit.server";
import Anthropic from "@anthropic-ai/sdk";
import { ExtractionUnavailableError, extractDocument, extractionConfigured, validAttachment } from "@/lib/agent/extract.server";
import { mergeExtraction, sanitizeProfile } from "@/lib/agent/tools.server";
import type { DocType, UserProfile } from "@/lib/agent/types";
import { DOC_TYPES } from "@/lib/agent/types";

/**
 * Document upload with automatic data extraction.
 *   { action: "extract", image: { data, mediaType }, docType? } → fields for the citizen to review
 *   { action: "confirm", docType, fields, profile }             → profile with the confirmed fields merged
 * The photo is only forwarded to Claude for reading; it is never stored.
 */
export async function POST(req: NextRequest) {
  // Protect the shared API credits: 15 requests per minute per client.
  const wait = rateLimit(`extract:${clientIp(req.headers)}`, [{ max: 15, windowMs: 60_000 }]);
  if (wait) return NextResponse.json({ success: false, error: `Too many requests. Try again in ${wait} seconds.` }, { status: 429, headers: { "Retry-After": String(wait) } });
  let body: { action?: string; image?: unknown; docType?: string; fields?: Record<string, unknown>; profile?: UserProfile };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  const docType = DOC_TYPES.includes(body.docType as DocType) ? (body.docType as DocType) : undefined;

  if (body.action === "confirm") {
    if (!docType || !body.fields || typeof body.fields !== "object") {
      return NextResponse.json({ success: false, error: "docType and fields are required" }, { status: 400 });
    }
    const profile = mergeExtraction(sanitizeProfile(body.profile), docType, body.fields);
    return NextResponse.json({ success: true, data: { profile } });
  }

  if (!extractionConfigured()) {
    return NextResponse.json(
      { success: false, code: "unavailable", error: "Document reading needs the AI service (ANTHROPIC_API_KEY), which is not configured. Please enter your details manually." },
      { status: 503 },
    );
  }
  if (!validAttachment(body.image)) {
    return NextResponse.json({ success: false, error: "Send a JPEG, PNG or WebP image under 5 MB" }, { status: 400 });
  }

  try {
    const data = await extractDocument(body.image, docType);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (err instanceof ExtractionUnavailableError) {
      return NextResponse.json({ success: false, code: "unavailable", error: err.message }, { status: 503 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[documents/extract] Claude API error:", err.status, err.message);
      return NextResponse.json(
        { success: false, code: "unavailable", error: "The document reader is unavailable right now. Please enter your details manually." },
        { status: 502 },
      );
    }
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 422 });
  }
}

export async function GET() {
  return NextResponse.json({ available: extractionConfigured() });
}
