"use client";
// Browser speech helpers: speech-to-text (Web Speech API recognition) and
// text-to-speech (speechSynthesis) for English + 7 Indian languages.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { LangCode } from "@/lib/translations";

export const SPEECH_LOCALE: Record<LangCode, string> = {
  en: "en-IN", hi: "hi-IN", bn: "bn-IN", ta: "ta-IN", mr: "mr-IN", te: "te-IN", gu: "gu-IN", kn: "kn-IN",
};

// ─── Text-to-speech ──────────────────────────────────────────────────────────

function cleanForSpeech(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, "") // emoji
    .replace(/[*_#`>•]/g, "")
    .replace(/₹\s?/g, "₹ ")
    .replace(/\n+/g, ". ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Split into sentence-sized chunks — Chrome stops long utterances after ~15 s. */
function chunk(text: string, max = 180): string[] {
  const parts = text.split(/(?<=[.!?।॥]|\?)\s+/);
  const out: string[] = [];
  let cur = "";
  for (const p of parts) {
    if ((cur + " " + p).length > max && cur) { out.push(cur); cur = p; }
    else cur = cur ? `${cur} ${p}` : p;
  }
  if (cur) out.push(cur);
  return out.filter(s => s.trim().length > 0);
}

let voicesCache: SpeechSynthesisVoice[] = [];
function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length) voicesCache = v;
  return voicesCache;
}

export function pickVoice(lang: LangCode): SpeechSynthesisVoice | undefined {
  const locale = SPEECH_LOCALE[lang];
  const base = locale.split("-")[0];
  const voices = loadVoices();
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.replace("_", "-") === locale ? 4 : 0) + (/natural|neural|online|google/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
  return voices.filter(v => v.lang.toLowerCase().startsWith(base)).sort((a, b) => score(b) - score(a))[0];
}

export function hasVoiceFor(lang: LangCode): boolean {
  return !!pickVoice(lang);
}

export function ttsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

/** Speak text in the given language. Resolves when finished (or immediately if unsupported). */
export function speak(text: string, lang: LangCode, opts: { rate?: number } = {}): Promise<void> {
  return new Promise(resolve => {
    if (!ttsSupported()) return resolve();
    const synth = window.speechSynthesis;
    synth.cancel();
    const pieces = chunk(cleanForSpeech(text));
    if (!pieces.length) return resolve();
    const voice = pickVoice(lang);
    let i = 0;
    const next = () => {
      if (i >= pieces.length) return resolve();
      const u = new SpeechSynthesisUtterance(pieces[i++]);
      u.lang = voice?.lang ?? SPEECH_LOCALE[lang];
      if (voice) u.voice = voice;
      u.rate = opts.rate ?? (lang === "en" ? 1 : 0.95);
      u.onend = next;
      u.onerror = () => resolve();
      synth.speak(u);
    };
    next();
  });
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => loadVoices();
}

// ─── Speech-to-text ──────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = any;

export function sttSupported() {
  return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
}

const noopSubscribe = () => () => {};

export function useSpeechRecognition(lang: LangCode) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Feature detection without a hydration mismatch (false on the server).
  const supported = useSyncExternalStore(noopSubscribe, sttSupported, () => false);
  const recRef = useRef<Recognition>(null);

  useEffect(() => {
    return () => recRef.current?.abort?.();
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop?.();
  }, []);

  /** Listen for one utterance; calls onFinal with the transcript ("" if nothing was heard). */
  const listen = useCallback((onFinal: (text: string) => void) => {
    if (!sttSupported()) { setError("unsupported"); onFinal(""); return; }
    recRef.current?.abort?.();
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec: Recognition = new SR();
    rec.lang = SPEECH_LOCALE[lang];
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = "";
    let delivered = false;
    const deliver = () => { if (!delivered) { delivered = true; onFinal(finalText.trim()); } };

    rec.onstart = () => { setListening(true); setError(null); setInterim(""); };
    rec.onresult = (e: any) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else live += r[0].transcript;
      }
      setInterim(finalText + live);
    };
    rec.onerror = (e: any) => { if (e.error !== "aborted" && e.error !== "no-speech") setError(e.error); };
    rec.onend = () => { setListening(false); setInterim(""); recRef.current = null; deliver(); };
    recRef.current = rec;
    try { rec.start(); } catch { setListening(false); deliver(); }
  }, [lang]);

  return { listening, interim, error, supported, listen, stop };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
