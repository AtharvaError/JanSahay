"use client";

import { use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Bookmark, BookmarkCheck, Share2, CheckCircle, Clock, Circle, ExternalLink } from "lucide-react";
import { schemes, stepGuide } from "@/lib/data/schemes";
import SchemeNotFound from "@/components/ui/SchemeNotFound";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";
import { useSavedSchemes } from "@/contexts/SavedSchemesContext";
import toast from "react-hot-toast";

const statusColors: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "closing-soon": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  closed: "bg-red-500/15 text-red-400 border-red-500/30",
};

const stepStatusIcon = (s: string) => {
  if (s === "completed") return <CheckCircle size={16} className="text-emerald-400" />;
  if (s === "in-progress") return <Clock size={16} className="text-blue-400" />;
  return <Circle size={16} className="text-slate-500" />;
};

export default function SchemeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const scheme = schemes.find(s => s.id === id);
  if (!scheme) return <SchemeNotFound id={id} />;
  return <SchemeDetailContent scheme={scheme} />;
}

function SchemeDetailContent({ scheme }: { scheme: (typeof schemes)[number] }) {
  const { t } = useLang();
  const { toggleSave, isSaved } = useSavedSchemes();
  const saved = isSaved(scheme.id);

  const handleSave = () => {
    toggleSave(scheme.id);
    toast.success(saved ? t("schemeUnsaved") : t("schemeSaved"), { icon: saved ? "🗑️" : "🔖" });
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("linkCopied"), { icon: "🔗" });
    } catch {
      toast(url, { icon: "🔗" });
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      {/* Back */}
      <Link
        href="/schemes"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> {t("back")}
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* Scheme card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 border border-navy-light/30"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-4">
                <span className="text-4xl">{scheme.icon}</span>
                <div>
                  <h1 className="text-xl font-bold text-white">{scheme.title}</h1>
                  <p className="text-sm text-slate-400 mt-1">{scheme.ministry}</p>
                </div>
              </div>
              <span className={`flex-shrink-0 text-xs font-medium px-3 py-1 rounded-full border ${statusColors[scheme.status]}`}>
                {scheme.status === "open" ? t("statusOpen") : scheme.status === "closing-soon" ? t("statusClosingSoon") : t("statusClosed")}
              </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-5">{scheme.description}</p>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/apply/${scheme.id}`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 hover:shadow-blue-600/40"
              >
                {t("applyNow")} <ExternalLink size={14} />
              </Link>
              <button
                onClick={handleSave}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl glass border text-sm transition-all",
                  saved
                    ? "border-yellow-500/60 text-yellow-400 bg-yellow-500/10"
                    : "border-navy-light/40 text-slate-300 hover:border-yellow-500/40 hover:text-yellow-300"
                )}
              >
                {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                {t("saveScheme")}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-navy-light/40 text-slate-300 text-sm hover:border-blue-500/40 hover:text-blue-300 transition-all"
              >
                <Share2 size={16} /> {t("share")}
              </button>
            </div>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 border border-navy-light/30"
          >
            <h2 className="text-base font-semibold text-white mb-4">🎁 {t("benefitsTitle")}</h2>
            <ul className="space-y-2.5">
              {scheme.benefits.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Eligibility */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-6 border border-navy-light/30"
          >
            <h2 className="text-base font-semibold text-white mb-4">✅ {t("checkEligibility")}</h2>
            <ul className="space-y-2.5">
              {scheme.eligibility.map((e) => (
                <li key={e} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-0.5" />
                  {e}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Step guide */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-5 border border-navy-light/30"
          >
            <h2 className="text-sm font-semibold text-white mb-4">📋 {t("howToApply")}</h2>
            <div className="relative space-y-0">
              {stepGuide.map((step, i) => (
                <div key={step.step} className="flex gap-3 pb-5 last:pb-0 relative">
                  {i < stepGuide.length - 1 && (
                    <div className="absolute left-[14px] top-6 bottom-0 w-px bg-navy-light/50" />
                  )}
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                    step.status === "completed" ? "bg-emerald-500/20" :
                    step.status === "in-progress" ? "bg-blue-500/20" : "bg-surface-2"
                  )}>
                    {stepStatusIcon(step.status)}
                  </div>
                  <div>
                    <p className={cn("text-sm font-medium", step.status === "pending" ? "text-slate-500" : "text-white")}>
                      {step.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Required documents */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-2xl p-5 border border-navy-light/30"
          >
            <h2 className="text-sm font-semibold text-white mb-4">📎 {t("requiredDocs")}</h2>
            <ul className="space-y-2">
              {scheme.documents.map((doc) => (
                <li key={doc} className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="text-blue-400">📄</span> {doc}
                </li>
              ))}
            </ul>
            <Link href="/documents" className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400 text-sm hover:bg-blue-500/25 transition-colors">
              {t("upload")} {t("documents")}
            </Link>
          </motion.div>

          {/* Deadline */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-5 border border-yellow-500/20"
          >
            <h2 className="text-sm font-semibold text-white mb-2">⏰ {t("deadline")}</h2>
            <p className="text-lg font-bold text-yellow-400">{new Date(scheme.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
            <p className="text-xs text-slate-400 mt-1">Apply before deadline to avoid rejection</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
