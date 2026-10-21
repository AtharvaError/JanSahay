"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Bot, User, Mic, MicOff, Volume2, VolumeX, RotateCcw, Wrench, Radio, Loader2, FileCheck2, Smartphone,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";
import { useUserData } from "@/contexts/UserDataContext";
import { ui } from "@/lib/agent/ui";
import { speak, stopSpeaking, useSpeechRecognition, useVoiceSource } from "@/lib/voice";
import { docName, docUi } from "@/lib/agent/documentUi";
import type { AgentArtifacts, AgentResponse, DocType, ImageAttachment, ToolTrace, TrackedApplication } from "@/lib/agent/types";
import DraftReviewCard from "./DraftReviewCard";
import { DocumentUploadButton, ExtractionReviewCard, extractViaApi } from "./DocumentUpload";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolTrace[];
  artifacts?: AgentArtifacts;
}

const VERDICT_STYLE = {
  eligible: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  likely: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  not_eligible: "border-slate-600/40 bg-slate-500/10 text-slate-400",
} as const;

let idSeq = 0;
const newId = () => `${Date.now()}-${idSeq++}`;

export default function SchemeSaathiChat({ className }: { className?: string }) {
  const { lang } = useLang();
  const { profile, setProfile, applications, addFollowUps, resetAll } = useUserData();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(true);
  const [voiceMode, setVoiceMode] = useState(false);
  const [engine, setEngine] = useState<"claude" | "sarvam" | "offline" | null>(null);
  const [dismissedDrafts, setDismissedDrafts] = useState<Set<string>>(new Set());
  const [resolvedExtractions, setResolvedExtractions] = useState<Set<string>>(new Set());

  const stt = useSpeechRecognition(lang);
  const voice = useVoiceSource(lang);
  const agentState = useRef<unknown>(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  // Refs so async voice callbacks always see the latest values.
  const latest = useRef({ messages, profile, applications, lang, speakReplies, voiceMode });
  latest.current = { messages, profile, applications, lang, speakReplies, voiceMode };

  useEffect(() => {
    // Scroll only the message list (not the page) once the new content has laid out.
    const el = listRef.current;
    if (el) requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }));
  }, [messages, busy, stt.interim]);

  // ─── Talking to the agent ──────────────────────────────────────────────────
  const callAgent = useCallback(async (message: string, attachment?: ImageAttachment): Promise<AgentResponse | null> => {
    const { messages: msgs, profile: p, applications: apps, lang: l } = latest.current;
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        lang: l,
        profile: p,
        applications: apps,
        state: agentState.current,
        history: msgs.map(m => ({ role: m.role, content: m.content })),
        attachment,
      }),
    });
    const json = await res.json();
    if (!json.success) { toast.error(json.error ?? "Agent error"); return null; }
    if (json.warning) toast(json.warning, { icon: "⚠️" });
    return json.data as AgentResponse & { state?: unknown };
  }, []);

  const say = useCallback(async (text: string) => {
    if (!latest.current.speakReplies) return;
    setSpeaking(true);
    await speak(text, latest.current.lang);
    setSpeaking(false);
  }, []);

  const busyRef = useRef(false);
  const listenRef = useRef<() => void>(() => {});
  const listenTurn = () => listenRef.current();

  const send = useCallback(async (text: string, opts: { silentUser?: boolean; attachment?: ImageAttachment } = {}) => {
    const trimmed = text.trim();
    if (!trimmed || busyRef.current) return;
    busyRef.current = true;
    stopSpeaking();
    // History sent to the agent is snapshotted from `latest` before this message is added.
    if (!opts.silentUser) setMessages(prev => [...prev, { id: newId(), role: "user", content: trimmed }]);
    setInput("");
    setBusy(true);
    try {
      const data = await callAgent(trimmed, opts.attachment);
      if (!data) return;
      agentState.current = (data as { state?: unknown }).state;
      setProfile(data.profile);
      if (data.artifacts.followUps?.length) addFollowUps(data.artifacts.followUps);
      setEngine(data.engine);
      setMessages(prev => [...prev, {
        id: newId(), role: "assistant", content: data.reply, toolCalls: data.toolCalls, artifacts: data.artifacts,
      }]);
      busyRef.current = false;
      setBusy(false);
      await say(data.reply);
      // Speech-to-speech loop: after the reply is spoken, listen again — unless a card needs review.
      if (latest.current.voiceMode && !data.artifacts.draft && !data.artifacts.extraction) listenTurn();
    } catch {
      toast.error("Network error");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [callAgent, setProfile, addFollowUps, say]);

  listenRef.current = () => {
    stt.listen(heard => {
      if (heard) send(heard);
      else if (latest.current.voiceMode) {
        setVoiceMode(false); // silence → leave hands-free mode
      }
    });
  };

  // ─── Greeting on first load and when language changes before chatting ─────
  const started = useRef(false);
  useEffect(() => {
    if (started.current && messages.some(m => m.role === "user")) return;
    started.current = true;
    agentState.current = undefined;
    // The saved language loads just after mount, so a greeting for the default language may
    // still be in flight — drop it so a stale (wrong-language) greeting never wins the race.
    let cancelled = false;
    (async () => {
      setBusy(true);
      const data = await callAgent("__start__").catch(() => null);
      if (cancelled) return;
      setBusy(false);
      if (!data) return;
      agentState.current = (data as { state?: unknown }).state;
      setMessages([{ id: newId(), role: "assistant", content: data.reply, toolCalls: data.toolCalls, artifacts: data.artifacts }]);
    })();
    fetch("/api/agent").then(r => r.json()).then(j => { if (!cancelled) setEngine(j.engine); }).catch(() => {});
    return () => { cancelled = true; };
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Controls ──────────────────────────────────────────────────────────────
  const toggleMic = () => {
    if (!stt.supported) return toast.error(ui(lang, "voiceUnsupported"));
    if (stt.listening) return stt.stop();
    stopSpeaking();
    stt.listen(heard => heard && send(heard));
  };

  const toggleVoiceMode = () => {
    if (!stt.supported) return toast.error(ui(lang, "voiceUnsupported"));
    if (voiceMode) {
      setVoiceMode(false);
      stt.stop();
      stopSpeaking();
      return;
    }
    setVoiceMode(true);
    setSpeakReplies(true);
    latest.current.voiceMode = true;
    latest.current.speakReplies = true;
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
    (async () => {
      if (lastAssistant) {
        setSpeaking(true);
        await speak(lastAssistant.content, lang);
        setSpeaking(false);
      }
      if (latest.current.voiceMode) listenTurn();
    })();
  };

  // ─── Document upload ───────────────────────────────────────────────────────
  const uploadDocument = async (image: ImageAttachment) => {
    if (busyRef.current) return;
    // With Claude the agent reads it via its extract_document tool; otherwise call the extractor directly.
    if (engine === "claude" || engine === "sarvam") return send(docUi(lang, "photoSent"), { attachment: image });
    setMessages(prev => [...prev, { id: newId(), role: "user", content: docUi(lang, "photoSent") }]);
    busyRef.current = true;
    setBusy(true);
    const result = await extractViaApi(image);
    busyRef.current = false;
    setBusy(false);
    if (result.ok) {
      const content = docUi(lang, "reviewTitle", { doc: docName(lang, result.doc.docType) });
      setMessages(prev => [...prev, { id: newId(), role: "assistant", content, artifacts: { extraction: result.doc } }]);
    } else {
      const content = result.unavailable ? docUi(lang, "unavailable") : result.error;
      setMessages(prev => [...prev, { id: newId(), role: "assistant", content }]);
      say(content);
    }
  };

  const resolveExtraction = (id: string, savedCount?: number, docType?: DocType) => {
    setResolvedExtractions(s => new Set(s).add(id));
    if (savedCount === undefined || !docType) return;
    const text = docUi(lang, "saved", { n: String(savedCount), doc: docName(lang, docType) });
    setMessages(prev => [...prev, { id: newId(), role: "assistant", content: text }]);
    say(text);
  };

  const restart = () => {
    stopSpeaking();
    stt.stop();
    setVoiceMode(false);
    resetAll();
    latest.current.profile = {};
    latest.current.messages = [];
    agentState.current = undefined;
    setMessages([]);
    setDismissedDrafts(new Set());
    setResolvedExtractions(new Set());
    (async () => {
      setBusy(true);
      const data = await callAgent("__start__");
      setBusy(false);
      if (!data) return;
      agentState.current = (data as { state?: unknown }).state;
      setMessages([{ id: newId(), role: "assistant", content: data.reply }]);
      say(data.reply);
    })();
  };

  const onSubmitted = (app: TrackedApplication) => {
    const text = ui(lang, "submittedOk", { ref: app.referenceId });
    setMessages(prev => [...prev, { id: newId(), role: "assistant", content: text }]);
    say(text);
  };

  const status = stt.listening ? ui(lang, "listening") : busy ? ui(lang, "thinking") : speaking ? ui(lang, "speaking") : null;
  const voiceLabel = voice.source === "server" ? `${voice.serverLabel ?? "Cloud"} voice` : voice.source === "device" ? "Device voice" : null;
  const latestDraftId = [...messages].reverse().find(m => m.artifacts?.draft)?.artifacts?.draft?.draftId;

  return (
    <div className={cn("flex flex-col h-full glass rounded-2xl border border-navy-light/40 overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-navy-light/30 bg-surface/50">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center glow-blue flex-shrink-0">
          <Bot size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{ui(lang, "saathiTitle")}</p>
          <p className="text-[11px] text-slate-400 truncate">
            {status ?? (engine === "claude" ? "Claude AI · tool calling" : engine === "sarvam" ? "Sarvam AI · tool calling" : engine === "offline" ? "Offline agent · tool calling" : "…")}
            {voiceLabel && <span className="text-slate-500" title="Voice source"> · {voiceLabel}</span>}
          </p>
        </div>
        <button
          onClick={() => { setSpeakReplies(s => !s); if (speakReplies) stopSpeaking(); }}
          title={ui(lang, "readAloud")}
          aria-label={ui(lang, "readAloud")}
          aria-pressed={speakReplies}
          className={cn("p-2 rounded-lg border transition-colors", speakReplies ? "text-blue-300 border-blue-500/30 bg-blue-500/10" : "text-slate-500 border-navy-light/40")}
        >
          {speakReplies ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
        <button onClick={restart} title={ui(lang, "restart")} aria-label={ui(lang, "restart")} className="p-2 rounded-lg border border-navy-light/40 text-slate-400 hover:text-white">
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Voice conversation banner */}
      <button
        onClick={toggleVoiceMode}
        className={cn(
          "mx-3 mt-3 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all border",
          voiceMode ? "bg-red-500/15 border-red-500/40 text-red-300" : "bg-blue-600/15 border-blue-500/30 text-blue-300 hover:bg-blue-600/25",
        )}
      >
        <Radio size={14} className={voiceMode ? "animate-pulse" : ""} />
        {ui(lang, "voiceMode")} {voiceMode ? "● ON" : ""}
      </button>
      {speakReplies && engine && voice.source === "default" && lang !== "en" && (
        <p className="mx-3 mt-1 text-[10px] text-amber-400/80">
          No {lang}-IN voice installed on this device — replies will use the browser default voice. (Chrome/Edge include Hindi; install language voices in OS settings for others.)
        </p>
      )}

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-4" aria-live="polite">
        <AnimatePresence initial={false}>
          {messages.map(m => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-2.5", m.role === "user" && "flex-row-reverse")}>
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0", m.role === "assistant" ? "bg-blue-600/30" : "bg-emerald-600/30")}>
                {m.role === "assistant" ? <Bot size={14} className="text-blue-300" /> : <User size={14} className="text-emerald-300" />}
              </div>
              <div className={cn("max-w-[85%] min-w-0 space-y-2", m.role === "user" && "items-end flex flex-col")}>
                <div className={cn(
                  "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line",
                  m.role === "assistant" ? "bg-surface-2 text-slate-200 rounded-tl-sm border border-navy-light/30" : "bg-blue-600 text-white rounded-tr-sm",
                )}>
                  {m.content}
                  {m.role === "assistant" && (
                    <button onClick={() => { setSpeaking(true); speak(m.content, lang).then(() => setSpeaking(false)); }} aria-label="Speak" className="ml-2 inline-flex align-middle text-slate-500 hover:text-blue-300">
                      <Volume2 size={12} />
                    </button>
                  )}
                </div>

                {/* Tool calls made by the agent */}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="flex flex-wrap gap-1" aria-label={ui(lang, "toolsUsed")}>
                    {m.toolCalls.map((t, i) => (
                      <span key={i} title={JSON.stringify(t.input)} className="inline-flex items-center gap-1 max-w-full truncate text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300">
                        <Wrench size={9} /> {t.name} · {t.summary}
                      </span>
                    ))}
                  </div>
                )}

                {/* Eligibility results */}
                {m.artifacts?.eligibility && (
                  <div className="grid gap-1.5 w-full">
                    {m.artifacts.eligibility.filter(e => e.verdict !== "not_eligible").slice(0, 8).map(e => (
                      <div key={e.schemeId} className={cn("flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs", VERDICT_STYLE[e.verdict])}>
                        <span className="truncate">{e.icon} {e.title}</span>
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] opacity-80">{ui(lang, e.verdict === "eligible" ? "eligible" : "likely")}</span>
                          <button disabled={busy} onClick={() => send(`apply ${e.title}`)} aria-label={`Apply: ${e.title}`} title={`Apply: ${e.title}`} className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-semibold hover:bg-blue-500">
                            →
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Document checklist */}
                {m.artifacts?.checklist && (
                  <div className="w-full rounded-xl border border-blue-500/25 bg-blue-500/5 p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-blue-300 flex items-center gap-1.5"><FileCheck2 size={13} /> {m.artifacts.checklist.title}</p>
                    {m.artifacts.checklist.items.map(it => (
                      <div key={it.document} className="text-[11px] text-slate-300">
                        <span className="font-medium text-white">{it.inDigiLocker ? <Smartphone size={10} className="inline mr-1 text-emerald-400" /> : "• "}{it.document}</span>
                        {it.have && <span className="ml-1.5 text-[9px] px-1.5 rounded-full bg-emerald-500/15 text-emerald-300">✓ {docUi(lang, "uploaded")}</span>}
                        <span className="block pl-3 text-slate-500">{it.whereToGet}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Extracted document fields → citizen confirms before saving */}
                {m.artifacts?.extraction && !resolvedExtractions.has(m.artifacts.extraction.extractionId) && (
                  <div className="w-full">
                    <ExtractionReviewCard
                      extraction={m.artifacts.extraction}
                      onSaved={(_, n) => resolveExtraction(m.artifacts!.extraction!.extractionId, n, m.artifacts!.extraction!.docType)}
                      onDiscard={() => resolveExtraction(m.artifacts!.extraction!.extractionId)}
                    />
                  </div>
                )}

                {/* Draft → human confirmation */}
                {m.artifacts?.draft && m.artifacts.draft.draftId === latestDraftId && !dismissedDrafts.has(m.artifacts.draft.draftId) && (
                  <div className="w-full">
                    <DraftReviewCard
                      draft={m.artifacts.draft}
                      onSubmitted={onSubmitted}
                      onCancel={() => setDismissedDrafts(s => new Set(s).add(m.artifacts!.draft!.draftId))}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {(busy || stt.interim) && (
          <div className="flex gap-2.5 items-center text-xs text-slate-400 pl-9">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} className="text-red-400" />}
            <span className="italic">{stt.interim || ui(lang, "thinking")}</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); send(input); }}
        className="flex items-center gap-2 p-3 border-t border-navy-light/30 bg-surface/50"
      >
        <button
          type="button"
          onClick={toggleMic}
          aria-label={stt.listening ? "Stop voice input" : "Start voice input"}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
            stt.listening ? "bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse" : "bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30",
          )}
        >
          {stt.listening ? <MicOff size={17} /> : <Mic size={17} />}
        </button>
        <DocumentUploadButton onImage={uploadDocument} disabled={busy} />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={ui(lang, "placeholder")}
          aria-label="Chat message input"
          className="flex-1 min-w-0 bg-surface-2 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 border border-navy-light/40 outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          aria-label="Send"
          className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center text-white flex-shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
