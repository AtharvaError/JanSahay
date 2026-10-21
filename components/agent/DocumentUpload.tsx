"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, FileScan, Loader2, Save, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";
import { useUserData } from "@/contexts/UserDataContext";
import { docName, docUi, fieldLabel } from "@/lib/agent/documentUi";
import type { DocType, ExtractableKey, ExtractedDocument, ImageAttachment, UserProfile } from "@/lib/agent/types";
import { EXTRACTABLE_KEYS } from "@/lib/agent/types";

// ─── Image handling ──────────────────────────────────────────────────────────

const MAX_DIM = 1600; // plenty for reading a card; keeps uploads small on mobile data

/** Downscale a phone photo to a JPEG and return it as base64 (no data: prefix). */
export async function fileToAttachment(file: File): Promise<ImageAttachment> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const url = canvas.toDataURL("image/jpeg", 0.85);
    return { data: url.slice(url.indexOf(",") + 1), mediaType: "image/jpeg" };
  } catch {
    // Browser couldn't decode it (e.g. HEIC) — send as-is if the type is supported.
    const url: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    return { data: url.slice(url.indexOf(",") + 1), mediaType: file.type as ImageAttachment["mediaType"] };
  }
}

export type ExtractResult =
  | { ok: true; doc: ExtractedDocument }
  | { ok: false; unavailable: boolean; error: string };

/** Call the extraction route directly (used by the wizard and the offline chat). */
export async function extractViaApi(image: ImageAttachment, docType?: DocType): Promise<ExtractResult> {
  try {
    const res = await fetch("/api/documents/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extract", image, docType }),
    });
    const json = await res.json();
    if (json.success) return { ok: true, doc: json.data as ExtractedDocument };
    return { ok: false, unavailable: json.code === "unavailable", error: String(json.error ?? "Extraction failed") };
  } catch {
    return { ok: false, unavailable: false, error: "Network error" };
  }
}

// ─── Upload button ───────────────────────────────────────────────────────────

export function DocumentUploadButton({
  onImage,
  disabled,
  variant = "icon",
}: {
  onImage: (image: ImageAttachment) => void;
  disabled?: boolean;
  variant?: "icon" | "wide";
}) {
  const { lang } = useLang();
  const input = useRef<HTMLInputElement>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose a photo (JPG / PNG)");
    onImage(await fileToAttachment(file));
  };

  const label = docUi(lang, "upload");
  return (
    <>
      {/* No `capture` attribute: phones then offer both camera and gallery. */}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={onChange} aria-hidden tabIndex={-1} />
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={disabled}
          title={label}
          aria-label={label}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40"
        >
          <Camera size={17} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={disabled}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-left disabled:opacity-50"
        >
          <span className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            {disabled ? <Loader2 size={18} className="animate-spin text-emerald-300" /> : <Camera size={18} className="text-emerald-300" />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">{disabled ? docUi(lang, "reading") : label}</span>
            <span className="block text-[11px] text-slate-400">{docUi(lang, "uploadHint")}</span>
          </span>
        </button>
      )}
    </>
  );
}

// ─── Review card: the citizen confirms extracted values before saving ────────

export function ExtractionReviewCard({
  extraction,
  onSaved,
  onDiscard,
}: {
  extraction: ExtractedDocument;
  onSaved?: (profile: UserProfile, count: number) => void;
  onDiscard?: () => void;
}) {
  const { lang } = useLang();
  const { profile, setProfile } = useUserData();
  const keys = EXTRACTABLE_KEYS.filter(k => extraction.fields[k] !== undefined);
  const [values, setValues] = useState<Partial<Record<ExtractableKey, string>>>(extraction.fields);
  const [saving, setSaving] = useState(false);
  const doc = docName(lang, extraction.docType);

  const save = async () => {
    setSaving(true);
    try {
      const fields = Object.fromEntries(keys.map(k => [k, values[k]?.trim() ?? ""]).filter(([, v]) => v));
      const res = await fetch("/api/documents/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", docType: extraction.docType, fields, profile }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Could not save");
      const merged = json.data.profile as UserProfile;
      setProfile(merged);
      onSaved?.(merged, Object.keys(fields).length);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-500/30 bg-surface-2 overflow-hidden"
      role="region"
      aria-label={docUi(lang, "reviewTitle", { doc })}
    >
      <div className="px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20">
        <p className="text-sm font-bold text-white flex items-center gap-1.5">
          <FileScan size={15} className="text-emerald-300" /> {docUi(lang, "reviewTitle", { doc })}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">{docUi(lang, "reviewNote")}</p>
      </div>

      {keys.length === 0 ? (
        <p className="p-4 text-xs text-amber-300">{docUi(lang, "nothingFound")}</p>
      ) : (
        <div className="p-4 space-y-2.5 max-h-[340px] overflow-y-auto">
          {keys.map(k => (
            <label key={k} className="block">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
                {fieldLabel(lang, k)}
                <span className="text-[9px] px-1.5 rounded-full bg-emerald-500/15 text-emerald-300">{docUi(lang, "fromDocument")}</span>
              </span>
              <input
                value={values[k] ?? ""}
                onChange={e => setValues(v => ({ ...v, [k]: e.target.value }))}
                inputMode={k === "aadhaarLast4" || k === "bankAccountLast4" || k === "age" || k === "annualIncome" ? "numeric" : undefined}
                maxLength={k === "aadhaarLast4" || k === "bankAccountLast4" ? 4 : 120}
                className="w-full rounded-lg bg-surface px-3 py-2 text-sm text-white border border-navy-light/40 outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </label>
          ))}
        </div>
      )}

      {extraction.warnings.length > 0 && (
        <p className="px-4 pb-2 flex items-start gap-1.5 text-[11px] text-amber-300">
          <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> {extraction.warnings.join(" · ")}
        </p>
      )}

      <div className="px-4 pb-4 flex gap-2">
        {keys.length > 0 && (
          <button
            onClick={save}
            disabled={saving}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
              "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 disabled:opacity-60",
            )}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {docUi(lang, "save")}
          </button>
        )}
        {onDiscard && (
          <button onClick={onDiscard} className="px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white border border-navy-light/40">
            {docUi(lang, "discard")}
          </button>
        )}
      </div>
    </motion.div>
  );
}
