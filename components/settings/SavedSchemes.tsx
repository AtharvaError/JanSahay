"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, Trash2, ExternalLink, Star } from "lucide-react";
import toast from "react-hot-toast";
import { schemes } from "@/lib/data/schemes";
import { useLang } from "@/contexts/LanguageContext";
import { useSavedSchemes } from "@/contexts/SavedSchemesContext";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "closing-soon": "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  closed: "bg-red-500/15 text-red-400 border-red-500/25",
};

export default function SavedSchemes() {
  const { t } = useLang();
  const { savedIds, toggleSave } = useSavedSchemes();
  const savedList = schemes.filter(s => savedIds.has(s.id));

  const remove = (id: string) => {
    toggleSave(id);
    toast(t("schemeUnsaved"), { icon: "🗑️" });
  };

  if (savedList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bookmark size={40} className="text-slate-600 mb-3" />
        <p className="font-medium text-white">No saved schemes yet</p>
        <p className="text-sm text-slate-400 mt-1">Tap the bookmark icon on any scheme to save it here</p>
        <Link href="/schemes" className="mt-4 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors">
          {t("exploreSchemes")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">{savedList.length} {t("savedSchemes").toLowerCase()}</p>
      {savedList.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-start gap-4 p-4 glass rounded-2xl border border-navy-light/30 hover:border-blue-500/30 transition-all group"
        >
          <span className="text-2xl flex-shrink-0">{s.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">{s.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{s.ministry.replace("Ministry of ", "")}</p>
              </div>
              <span className={cn("flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border", statusColors[s.status])}>
                {s.status === "open" ? t("statusOpen") : s.status === "closing-soon" ? t("statusClosingSoon") : t("statusClosed")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <Star size={11} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs text-yellow-400 font-medium">{s.matchPercent}% {t("matchPercent")}</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Link
                href={`/apply/${s.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
              >
                {t("applyNow")} <ExternalLink size={11} />
              </Link>
              <Link
                href={`/scheme/${s.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-navy-light/40 text-slate-300 text-xs hover:border-blue-500/40 transition-all"
              >
                {t("viewDetails")}
              </Link>
              <button
                onClick={() => remove(s.id)}
                aria-label={`Remove ${s.title} from saved`}
                className="ml-auto opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 transition-all"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
