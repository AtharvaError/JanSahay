"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Star, ExternalLink } from "lucide-react";
import { schemes } from "@/lib/data/schemes";
import { useLang } from "@/contexts/LanguageContext";

const statusColors: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "closing-soon": "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  closed: "bg-red-500/15 text-red-400 border-red-500/25",
};


export default function RecommendedSchemes() {
  const { t } = useLang();
  const top = schemes.slice(0, 4);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Recommended for You</h2>
          <p className="text-sm text-slate-400 mt-0.5">Based on your profile — sorted by best match</p>
        </div>
        <Link href="/schemes" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
          See all <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {top.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 + 0.2 }}
            className={`group glass rounded-2xl border border-navy-light/40 hover:border-blue-500/40 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/15 overflow-hidden scheme-${s.category}`}
          >
            <Link href={`/scheme/${s.id}`} className="block p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white leading-tight group-hover:text-blue-300 transition-colors">
                      {s.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{s.ministry.split("Ministry of ")[1]}</p>
                  </div>
                </div>
                <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColors[s.status]}`}>
                  {s.status === "open" ? t("statusOpen") : s.status === "closing-soon" ? t("statusClosingSoon") : t("statusClosed")}
                </span>
              </div>

              <p className="text-xs text-slate-400 mb-4 line-clamp-2">{s.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-yellow-400 font-medium">{s.matchPercent}% match</span>
                </div>
                <div className="w-24 h-1.5 bg-navy-light rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${s.matchPercent}%` }}
                    transition={{ delay: i * 0.08 + 0.5, duration: 0.6 }}
                  />
                </div>
              </div>
            </Link>

            {/* Apply Now footer strip */}
            <div className="px-5 pb-4">
              <Link
                href={`/apply/${s.id}`}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600/15 hover:bg-blue-600 border border-blue-500/25 hover:border-blue-500 text-blue-400 hover:text-white text-xs font-semibold transition-all duration-200"
              >
                {t("applyNow")} <ExternalLink size={12} />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
