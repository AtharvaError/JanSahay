import { NextRequest, NextResponse } from "next/server";
import type { LangCode } from "@/lib/translations";
import { getSpeechProvider, LANGS, speechStatus } from "@/lib/speech/provider";

const MAX_CHARS = 2500;

/** POST { text, lang, pace? } → audio bytes from the configured speech provider. */
export async function POST(req: NextRequest) {
  const provider = getSpeechProvider();
  if (!provider) return NextResponse.json({ success: false, error: "No speech provider configured" }, { status: 503 });

  let body: { text?: string; lang?: LangCode; pace?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  const text = String(body.text ?? "").trim().slice(0, MAX_CHARS);
  if (!text) return NextResponse.json({ success: false, error: "Empty text" }, { status: 400 });
  const lang = LANGS.includes(body.lang as LangCode) ? (body.lang as LangCode) : "hi";
  const pace = typeof body.pace === "number" && Number.isFinite(body.pace) ? body.pace : undefined;

  try {
    const { audio, mimeType } = await provider.synthesize(text, lang, { pace });
    return new Response(audio, { headers: { "Content-Type": mimeType, "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(`[voice/tts] ${provider.id} failed:`, err);
    return NextResponse.json({ success: false, error: "Speech service unavailable" }, { status: 502 });
  }
}

/** Lets the client know whether the server fallback is available (and who provides it). */
export async function GET() {
  return NextResponse.json(speechStatus());
}
