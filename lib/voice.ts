"use client";
// Browser speech helpers: speech-to-text (Web Speech API recognition) and
// text-to-speech (speechSynthesis) for English + 7 Indian languages.
// When the device has no voice for a language, or no Web Speech recognition,
// falls back to the server speech provider (/api/voice/tts, /api/voice/stt).
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { LangCode } from "@/lib/translations";

export const SPEECH_LOCALE: Record<LangCode, string> = {
  en: "en-IN", hi: "hi-IN", bn: "bn-IN", ta: "ta-IN", mr: "mr-IN", te: "te-IN", gu: "gu-IN", kn: "kn-IN",
};

// ─── Shared store (voices + server fallback availability) ────────────────────

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

interface ServerVoice { available: boolean; label: string | null }
const NO_SERVER: ServerVoice = { available: false, label: null };
let serverVoice: ServerVoice | null = null; // null until checked
let serverVoicePromise: Promise<ServerVoice> | null = null;

function checkServerVoice(): Promise<ServerVoice> {
  serverVoicePromise ??= fetch("/api/voice/tts")
    .then(r => r.json())
    .then(j => ({ available: !!j.available, label: j.label ?? null }))
    .catch(() => NO_SERVER)
    .then(v => { serverVoice = v; emit(); return v; });
  return serverVoicePromise;
}

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

/**
 * Where spoken replies for `lang` come from: an installed device voice, the
 * server provider, the browser's default (wrong-language) voice, or nothing.
 */
export type VoiceSource = "device" | "server" | "default" | "none";
export function voiceSource(lang: LangCode): VoiceSource {
  if (hasVoiceFor(lang)) return "device";
  if (serverVoice?.available) return "server";
  return ttsSupported() ? "default" : "none";
}

/** Reactive voice source plus the server provider's display name. */
export function useVoiceSource(lang: LangCode): { source: VoiceSource; serverLabel: string | null } {
  const source = useSyncExternalStore(subscribe, () => voiceSource(lang), () => "device" as VoiceSource);
  const serverLabel = useSyncExternalStore(subscribe, () => serverVoice?.label ?? null, () => null);
  return { source, serverLabel };
}

// Bumped on every speak()/stopSpeaking() so stale playback loops bail out.
let speakGen = 0;
let audioEl: HTMLAudioElement | null = null;
const getAudio = () => (audioEl ??= new Audio());

export function stopSpeaking() {
  speakGen++;
  if (ttsSupported()) window.speechSynthesis.cancel();
  audioEl?.pause();
}

function speakWithBrowser(pieces: string[], lang: LangCode, gen: number, rate?: number): Promise<void> {
  return new Promise(resolve => {
    if (!ttsSupported()) return resolve();
    const synth = window.speechSynthesis;
    const voice = pickVoice(lang);
    let i = 0;
    const next = () => {
      if (i >= pieces.length || gen !== speakGen) return resolve();
      const u = new SpeechSynthesisUtterance(pieces[i++]);
      u.lang = voice?.lang ?? SPEECH_LOCALE[lang];
      if (voice) u.voice = voice;
      u.rate = rate ?? (lang === "en" ? 1 : 0.95);
      u.onend = next;
      u.onerror = () => resolve();
      synth.speak(u);
    };
    next();
  });
}

function playBlob(blob: Blob, gen: number): Promise<void> {
  return new Promise(resolve => {
    if (gen !== speakGen) return resolve();
    const el = getAudio();
    const url = URL.createObjectURL(blob);
    const done = () => {
      el.onended = el.onerror = el.onpause = null;
      URL.revokeObjectURL(url);
      resolve();
    };
    el.onended = done;
    el.onerror = done;
    el.onpause = done; // stopSpeaking() pauses
    el.src = url;
    el.play().catch(done);
  });
}

function fetchSpeech(text: string, lang: LangCode, pace?: number): Promise<Blob | null> {
  return fetch("/api/voice/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang, pace }),
  })
    .then(r => (r.ok ? r.blob() : null))
    .catch(() => null);
}

/** Server TTS, sentence groups at a time, prefetching the next clip while one plays. */
async function speakWithServer(text: string, lang: LangCode, gen: number, rate?: number): Promise<boolean> {
  const pieces = chunk(text, 450);
  let pending = fetchSpeech(pieces[0], lang, rate);
  for (let i = 0; i < pieces.length; i++) {
    const blob = await pending;
    if (gen !== speakGen) return true;
    if (i + 1 < pieces.length) pending = fetchSpeech(pieces[i + 1], lang, rate);
    if (!blob) {
      if (i === 0) return false; // service down — let the caller use the browser voice
      continue;
    }
    await playBlob(blob, gen);
    if (gen !== speakGen) return true;
  }
  return true;
}

/** Speak text in the given language. Resolves when finished (or immediately if unsupported). */
export async function speak(text: string, lang: LangCode, opts: { rate?: number } = {}): Promise<void> {
  stopSpeaking();
  const gen = speakGen;
  const clean = cleanForSpeech(text);
  if (!clean) return;
  if (!hasVoiceFor(lang)) {
    const server = serverVoice ?? (await checkServerVoice());
    if (gen !== speakGen) return;
    if (server.available && (await speakWithServer(clean, lang, gen, opts.rate))) return;
    if (gen !== speakGen) return;
  }
  await speakWithBrowser(chunk(clean), lang, gen, opts.rate);
}

/** A tiny silent WAV, played on the first tap so later (non-gesture) playback is allowed. */
function silentWavUrl(): string {
  const samples = 800; // 0.1 s at 8 kHz
  const buf = new ArrayBuffer(44 + samples);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + samples, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, "data"); v.setUint32(40, samples, true);
  new Uint8Array(buf, 44).fill(128);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

if (typeof window !== "undefined") {
  if ("speechSynthesis" in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = () => { loadVoices(); emit(); };
  }
  checkServerVoice();
  // Safari/iOS only let an <audio> element play without a gesture once it has played from one.
  const unlock = () => {
    ["click", "touchend", "keydown"].forEach(t => window.removeEventListener(t, unlock, true));
    const el = getAudio();
    if (el.src) return;
    el.src = silentWavUrl();
    el.play().catch(() => {});
  };
  ["click", "touchend", "keydown"].forEach(t => window.addEventListener(t, unlock, true));
}

// ─── Speech-to-text ──────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = any;

export function sttSupported() {
  return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
}

function recorderSupported() {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

/** Recording + server transcription is usable (no Web Speech, but a provider is configured). */
function serverSttReady() {
  return recorderSupported() && !!serverVoice?.available;
}

const anySttSupported = () => sttSupported() || serverSttReady();

async function transcribe(blob: Blob, lang: LangCode): Promise<string> {
  const ext = /mp4|m4a/.test(blob.type) ? "mp4" : /ogg/.test(blob.type) ? "ogg" : "webm";
  const form = new FormData();
  form.append("file", blob, `speech.${ext}`);
  form.append("lang", lang);
  const res = await fetch("/api/voice/stt", { method: "POST", body: form });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return String(json.data?.transcript ?? "");
}

// Recorder end-of-speech detection.
const SPEECH_RMS = 0.025;
const END_SILENCE_MS = 1500;
const NO_SPEECH_MS = 7000;
const MAX_RECORD_MS = 20000; // provider REST limit is 30 s

interface RecorderSession { stop(): void; abort(): void }

export function useSpeechRecognition(lang: LangCode) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Feature detection without a hydration mismatch (false on the server).
  const supported = useSyncExternalStore(subscribe, anySttSupported, () => false);
  const recRef = useRef<Recognition>(null);
  const recorderRef = useRef<RecorderSession | null>(null);

  useEffect(() => {
    return () => { recRef.current?.abort?.(); recorderRef.current?.abort(); };
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop?.();
    recorderRef.current?.stop();
  }, []);

  /** Fallback: record one utterance with MediaRecorder and transcribe it on the server. */
  const record = useCallback(async (onFinal: (text: string) => void) => {
    recorderRef.current?.abort();
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    const meter: { timer?: ReturnType<typeof setInterval> } = {};
    let finished = false;
    let cancelled = false;
    let heardSpeech = false;
    let delivered = false;
    const deliver = (text: string) => { if (!delivered) { delivered = true; onFinal(text.trim()); } };
    const release = () => {
      clearInterval(meter.timer);
      stream?.getTracks().forEach(t => t.stop());
      ctx?.close().catch(() => {});
      if (recorderRef.current === session) recorderRef.current = null;
      setListening(false);
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      if (recorder && recorder.state !== "inactive") recorder.stop(); // onstop delivers
      else { release(); deliver(""); }
    };
    const session: RecorderSession = { stop: finish, abort: () => { cancelled = true; finish(); } };
    recorderRef.current = session;
    setListening(true); setError(null); setInterim("");

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("not-allowed");
      finish();
      return;
    }
    if (finished) { release(); return; }

    const chunks: Blob[] = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      release();
      if (cancelled || !heardSpeech || !chunks.length) return deliver("");
      setInterim("…");
      let text = "";
      try {
        text = await transcribe(new Blob(chunks, { type: recorder!.mimeType || "audio/webm" }), lang);
      } catch {
        setError("network");
      }
      setInterim("");
      deliver(text);
    };
    recorder.start();

    // Stop after a pause in speech. Without a running AudioContext (some Safari
    // cases) there is no level meter: record until tapped or the time limit.
    const started = Date.now();
    let lastVoice = started;
    let analyser: AnalyserNode | null = null;
    try {
      ctx = new AudioContext();
      await ctx.resume().catch(() => {});
      if (ctx.state === "running") {
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(analyser);
      }
    } catch { /* no level meter */ }
    if (!analyser) heardSpeech = true;
    const samples = new Float32Array(1024);
    meter.timer = setInterval(() => {
      const now = Date.now();
      if (analyser) {
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const s of samples) sum += s * s;
        if (Math.sqrt(sum / samples.length) > SPEECH_RMS) { heardSpeech = true; lastVoice = now; }
        if (heardSpeech ? now - lastVoice > END_SILENCE_MS : now - started > NO_SPEECH_MS) finish();
      }
      if (now - started > MAX_RECORD_MS) finish();
    }, 100);
  }, [lang]);

  /** Listen for one utterance; calls onFinal with the transcript ("" if nothing was heard). */
  const listen = useCallback((onFinal: (text: string) => void) => {
    if (!sttSupported()) {
      if (serverSttReady()) { record(onFinal); return; }
      setError("unsupported"); onFinal(""); return;
    }
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
  }, [lang, record]);

  return { listening, interim, error, supported, listen, stop };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
