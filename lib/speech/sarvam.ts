// Sarvam AI (https://docs.sarvam.ai) — Bulbul TTS and Saaras STT, both covering
// en/hi/bn/ta/mr/te/gu/kn with the same BCP-47 codes we already use.
import type { LangCode } from "@/lib/translations";
import type { SpeechProvider } from "./provider";

const BASE = "https://api.sarvam.ai";
const TTS_MAX_CHARS = 2500; // bulbul:v3 limit

const LOCALE: Record<LangCode, string> = {
  en: "en-IN", hi: "hi-IN", bn: "bn-IN", ta: "ta-IN", mr: "mr-IN", te: "te-IN", gu: "gu-IN", kn: "kn-IN",
};

async function sarvamError(res: Response): Promise<Error> {
  const body = await res.text().catch(() => "");
  return new Error(`Sarvam ${res.status}: ${body.slice(0, 300)}`);
}

export function sarvamProvider(): SpeechProvider | null {
  const key = process.env.SARVAM_API_KEY?.trim();
  if (!key) return null;
  const ttsModel = process.env.SARVAM_TTS_MODEL?.trim() || "bulbul:v3";
  const speaker = process.env.SARVAM_TTS_SPEAKER?.trim() || undefined;
  const sttModel = process.env.SARVAM_STT_MODEL?.trim() || "saaras:v3";

  return {
    id: "sarvam",
    label: "Sarvam AI",

    async synthesize(text, lang, opts = {}) {
      const res = await fetch(`${BASE}/text-to-speech`, {
        method: "POST",
        headers: { "api-subscription-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.slice(0, TTS_MAX_CHARS),
          language_code: LOCALE[lang],
          model: ttsModel,
          ...(speaker ? { speaker } : {}),
          ...(opts.pace ? { pace: Math.min(2, Math.max(0.5, opts.pace)) } : {}),
          output_audio_codec: "mp3", // ~10x smaller than wav; plays in every browser
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw await sarvamError(res);
      const json = (await res.json()) as { audios?: string[] };
      const b64 = json.audios?.[0];
      if (!b64) throw new Error("Sarvam TTS returned no audio");
      return { audio: new Uint8Array(Buffer.from(b64, "base64")), mimeType: "audio/mpeg" };
    },

    async transcribe(audio, lang) {
      const form = new FormData();
      form.append("file", audio, (audio as File).name || "speech.webm");
      form.append("model", sttModel);
      form.append("mode", "transcribe");
      form.append("language_code", LOCALE[lang]);
      const res = await fetch(`${BASE}/speech-to-text`, {
        method: "POST",
        headers: { "api-subscription-key": key },
        body: form,
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw await sarvamError(res);
      const json = (await res.json()) as { transcript?: string };
      return (json.transcript ?? "").trim();
    },
  };
}
