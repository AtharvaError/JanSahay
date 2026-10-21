import { NextRequest, NextResponse } from "next/server";
import type { LangCode } from "@/lib/translations";
import { getSpeechProvider, LANGS, speechStatus } from "@/lib/speech/provider";

const MAX_BYTES = 5 * 1024 * 1024; // ~20 s of opus is well under this

/** POST multipart { file, lang } → { transcript } from the configured speech provider. */
export async function POST(req: NextRequest) {
  const provider = getSpeechProvider();
  if (!provider) return NextResponse.json({ success: false, error: "No speech provider configured" }, { status: 503 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Expected multipart form data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ success: false, error: "Missing audio file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ success: false, error: "Audio too long" }, { status: 413 });
  const langField = String(form.get("lang") ?? "");
  const lang = LANGS.includes(langField as LangCode) ? (langField as LangCode) : "hi";

  try {
    const transcript = await provider.transcribe(file, lang);
    return NextResponse.json({ success: true, data: { transcript } });
  } catch (err) {
    console.error(`[voice/stt] ${provider.id} failed:`, err);
    return NextResponse.json({ success: false, error: "Speech service unavailable" }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json(speechStatus());
}
