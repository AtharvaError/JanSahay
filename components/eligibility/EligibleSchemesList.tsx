"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Star, ArrowRight, CheckCircle, Clock, AlertCircle,
  Sparkles, Filter
} from "lucide-react";
import { schemes } from "@/lib/data/schemes";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLang } from "@/contexts/LanguageContext";

const categories = ["All", "Agriculture", "Health", "Housing", "Education", "Employment", "Women"];

const categoryColors: Record<string, string> = {
  agriculture: "from-green-500/20 to-emerald-500/5 border-green-500/25",
  health:      "from-red-500/20 to-rose-500/5 border-red-500/25",
  housing:     "from-blue-500/20 to-indigo-500/5 border-blue-500/25",
  education:   "from-purple-500/20 to-violet-500/5 border-purple-500/25",
  employment:  "from-yellow-500/20 to-amber-500/5 border-yellow-500/25",
  women:       "from-pink-500/20 to-fuchsia-500/5 border-pink-500/25",
};

const matchBadge = (pct: number) => {
  if (pct >= 85) return { label: "Excellent Match", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
  if (pct >= 70) return { label: "Good Match", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
  return { label: "Partial Match", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
};

const statusColors: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "closing-soon": "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  closed: "bg-red-500/15 text-red-400 border-red-500/25",
};

export default function EligibleSchemesList() {
  const [cat, setCat] = useState("All");
  const { t } = useLang();

  // Sort by match percent descending
  const filtered = schemes
    .filter(s => cat === "All" || s.category === cat.toLowerCase())
    .sort((a, b) => b.matchPercent - a.matchPercent);

  const topScheme = filtered[0];

  return (
    <div className="space-y-5">
      {/* Top match highlight */}
      {topScheme && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-5 rounded-2xl bg-gradient-to-br border",
            categoryColors[topScheme.category] ?? "from-blue-500/20 to-blue-500/5 border-blue-500/25"
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} className="text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">{t("bestMatchForYou")}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{topScheme.icon}</span>
              <div>
                <h3 className="text-base font-bold text-white">{topScheme.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{topScheme.ministry.replace("Ministry of ", "")}</p>
                <p className="text-xs text-slate-300 mt-2 line-clamp-2">{topScheme.description}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-bold text-emerald-400">{topScheme.matchPercent}%</div>
              <div className="text-[10px] text-slate-400">match</div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Link
              href={`/apply/${topScheme.id}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/30"
            >
              {t("applyNow")} <ArrowRight size={13} />
            </Link>
            <Link
              href={`/scheme/${topScheme.id}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg glass border border-navy-light/40 text-slate-300 hover:text-white text-xs font-medium transition-all hover:border-blue-500/40"
            >
              {t("viewDetails")}
            </Link>
          </div>
        </motion.div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              cat === c
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-surface-2 text-slate-400 hover:text-white border border-navy-light/30 hover:border-blue-500/30"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Eligible schemes count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          <span className="text-white font-semibold">{filtered.length}</span> schemes you can apply for
        </p>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Filter size={12} />
          {t("sortedByBestMatch")}
        </div>
      </div>

      {/* Scheme list */}
      <div className="space-y-3">
        {filtered.map((s, i) => {
          const badge = matchBadge(s.matchPercent);
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="group glass rounded-2xl border border-navy-light/30 hover:border-blue-500/35 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/10 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0 mt-0.5">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors leading-tight">
                        {s.title}
                      </h3>
                      <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColors[s.status]}`}>
                        {s.status === "open" ? t("statusOpen") : s.status === "closing-soon" ? t("statusClosingSoon") : t("statusClosed")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{s.ministry.replace("Ministry of ", "")}</p>

                    {/* Benefits preview */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {s.benefits.slice(0, 2).map(b => (
                        <span key={b} className="flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <CheckCircle size={9} /> {b}
                        </span>
                      ))}
                    </div>

                    {/* Match bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star size={11} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-semibold text-yellow-400">{s.matchPercent}%</span>
                      </div>
                      <div className="flex-1 h-1.5 bg-navy-light rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${s.matchPercent}%` }}
                          transition={{ delay: i * 0.06 + 0.3, duration: 0.6 }}
                        />
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action footer */}
              <div className="flex border-t border-navy-light/30">
                <Link
                  href={`/scheme/${s.id}`}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs text-slate-400 hover:text-white hover:bg-navy-light/20 transition-all"
                >
                  {t("viewDetails")}
                </Link>
                <div className="w-px bg-navy-light/30" />
                <Link
                  href={`/apply/${s.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-blue-400 hover:text-white hover:bg-blue-600/80 transition-all"
                >
                  {t("applyNow")} <ArrowRight size={12} />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle size={28} className="text-slate-500 mx-auto mb-3" />
          <p className="text-sm text-white font-medium">No schemes in this category</p>
          <p className="text-xs text-slate-400 mt-1">Try switching to "All"</p>
        </div>
      )}
    </div>
  );
}
