"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Volume2, Loader2, AlertTriangle, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";
import { useUserData } from "@/contexts/UserDataContext";
import { ui } from "@/lib/agent/ui";
import { speak } from "@/lib/voice";
import type { ApplicationDraft, DraftField, TrackedApplication } from "@/lib/agent/types";

/**
 * Human-in-the-loop confirmation step. The agent can only produce a draft;
 * submission happens here, and only after the citizen ticks the confirmation box
 * and presses "Confirm & Submit".
 */
export default function DraftReviewCard({
  draft,
  onSubmitted,
  onCancel,
}: {
  draft: ApplicationDraft;
  onSubmitted?: (app: TrackedApplication) => void;
  onCancel?: () => void;
}) {
  const { lang } = useLang();
  const { addApplication } = useUserData();
  const [fields, setFields] = useState<DraftField[]>(draft.fields);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<TrackedApplication | null>(null);

  const empty = fields.filter(f => !f.value.trim());
  const canSubmit = confirmed && empty.length === 0 && !submitting;

  const update = (i: number, value: string) =>
    setFields(prev => prev.map((f, idx) => (idx === i ? { ...f, value, source: f.source === "needs_input" && value ? "derived" : f.source } : f)));

  const readAloud = () => {
    const text = fields.map(f => `${f.field}: ${f.value || ui(lang, "needsInput")}`).join(". ");
    speak(`${draft.title}. ${text}`, lang);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, fields, confirmedByUser: true, lang }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Submission failed");
      const app = json.data as TrackedApplication;
      addApplication(app);
      setSubmitted(app);
      toast.success(app.referenceId);
      onSubmitted?.(app);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <p className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
          <ShieldCheck size={16} /> {ui(lang, "submittedOk", { ref: submitted.referenceId })}
        </p>
        <a href="/applications" className="mt-2 inline-block text-xs text-blue-400 hover:text-blue-300 underline">
          {ui(lang, "myApplications")} →
        </a>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-500/30 bg-surface-2 overflow-hidden"
      role="region"
      aria-label={ui(lang, "reviewTitle")}
    >
      <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">{draft.icon} {ui(lang, "reviewTitle")} — {draft.title}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{ui(lang, "reviewNote")}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">{draft.draftId}</p>
        </div>
        <button
          onClick={readAloud}
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-blue-300 bg-blue-500/10 border border-blue-500/25 hover:bg-blue-500/20"
        >
          <Volume2 size={12} /> {ui(lang, "readDraft")}
        </button>
      </div>

      <div className="p-4 space-y-2.5 max-h-[340px] overflow-y-auto">
        {fields.map((f, i) => (
          <label key={f.field} className="block">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              {f.field}
              {f.source === "profile" && <span className="text-[9px] px-1.5 rounded-full bg-blue-500/15 text-blue-300">auto</span>}
              {!f.value && <span className="text-[9px] px-1.5 rounded-full bg-red-500/15 text-red-300">{ui(lang, "needsInput")}</span>}
            </span>
            <div className="relative">
              <input
                value={f.value}
                onChange={e => update(i, e.target.value)}
                placeholder={f.hint}
                className={cn(
                  "w-full rounded-lg bg-surface px-3 py-2 pr-8 text-sm text-white placeholder:text-slate-600 border outline-none focus:ring-2 focus:ring-blue-500/50",
                  f.value ? "border-navy-light/40" : "border-red-500/40",
                )}
              />
              <Pencil size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </label>
        ))}
      </div>

      <div className="px-4 pb-4 space-y-3">
        {empty.length > 0 && (
          <p className="flex items-start gap-1.5 text-[11px] text-red-300">
            <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
            {ui(lang, "needsInput")}: {empty.map(f => f.field).join(", ")}
          </p>
        )}
        <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-emerald-500"
          />
          {ui(lang, "confirmCheck")}
        </label>
        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={!canSubmit}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
              canSubmit ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30" : "bg-surface text-slate-500 cursor-not-allowed",
            )}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {ui(lang, "confirmSubmit")}
          </button>
          {onCancel && (
            <button onClick={onCancel} className="px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white border border-navy-light/40">
              {ui(lang, "cancelDraft")}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
