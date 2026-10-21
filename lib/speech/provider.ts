// Server-side speech providers (TTS + STT) used when the browser has no voice
// for a language or no Web Speech recognition (Firefox, Safari, many Androids).
import type { LangCode } from "@/lib/translations";
import { sarvamProvider } from "./sarvam";

export const LANGS: LangCode[] = ["en", "hi", "bn", "ta", "mr", "te", "gu", "kn"];

export interface SynthesizedAudio {
  audio: Uint8Array<ArrayBuffer>;
  mimeType: string;
}

export interface SpeechProvider {
  id: string;
  /** Human-readable name shown in the chat header. */
  label: string;
  synthesize(text: string, lang: LangCode, opts?: { pace?: number }): Promise<SynthesizedAudio>;
  transcribe(audio: Blob, lang: LangCode): Promise<string>;
}

const PROVIDERS: Record<string, () => SpeechProvider | null> = {
  sarvam: sarvamProvider,
};

/** The configured provider, or null when no keys are set (browser-only voice). */
export function getSpeechProvider(): SpeechProvider | null {
  const wanted = process.env.SPEECH_PROVIDER?.trim().toLowerCase();
  if (wanted) return PROVIDERS[wanted]?.() ?? null;
  for (const make of Object.values(PROVIDERS)) {
    const p = make();
    if (p) return p;
  }
  return null;
}

export function speechStatus() {
  const p = getSpeechProvider();
  return { available: !!p, provider: p?.id ?? null, label: p?.label ?? null };
}
