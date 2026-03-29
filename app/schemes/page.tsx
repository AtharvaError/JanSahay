"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Filter, Star, ArrowRight } from "lucide-react";
import { schemes } from "@/lib/data/schemes";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";

const categories = ["All", "Agriculture", "Health", "Housing", "Education", "Employment", "Women"];
const statusColors: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "closing-soon": "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  closed: "bg-red-500/15 text-red-400 border-red-500/25",
};

export default function SchemesPage() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const { t } = useLang();

  const filtered = schemes.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = cat === "All" || s.category === cat.toLowerCase();
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t("schemes")}</h1>
        <p className="text-slate-400 mt-1">{schemes.length} {t("schemesAvailable")} — {t("sortedByBestMatch")}</p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2 bg-surface-2 rounded-xl px-4 py-2.5 border border-navy-light/40 focus-within:border-blue-500/40 transition-colors">
          <Search size={16} className="text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder={t("searchSchemes")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-navy-light/40 text-slate-300 text-sm hover:border-blue-500/40 transition-all">
          <Filter size={16} /> {t("filters")}
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              cat === c
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                : "bg-surface-2 text-slate-400 hover:text-white border border-navy-light/30"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className={`group glass rounded-2xl border border-navy-light/30 hover:border-blue-500/40 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/15 h-full flex flex-col overflow-hidden scheme-${s.category}`}>
              <Link href={`/scheme/${s.id}`} className="block p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{s.icon}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColors[s.status]}`}>
                    {s.status === "open" ? t("statusOpen") : s.status === "closing-soon" ? t("statusClosingSoon") : t("statusClosed")}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors line-clamp-2">
                  {s.title}
                </h3>
                <p className="text-xs text-slate-500 mb-3">{s.ministry.replace("Ministry of ", "")}</p>
                <p className="text-xs text-slate-400 mb-4 line-clamp-2">{s.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star size={11} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-yellow-400 font-medium">{s.matchPercent}% match</span>
                  </div>
                  <div className="w-20 h-1 bg-navy-light rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${s.matchPercent}%` }}
                      transition={{ delay: i * 0.05 + 0.4, duration: 0.5 }}
                    />
                  </div>
                </div>
              </Link>

              {/* Apply Now footer */}
              <div className="px-5 pb-4">
                <Link
                  href={`/apply/${s.id}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-white text-xs font-semibold transition-all duration-200"
                >
                  {t("applyNow")} <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium text-white">{t("noSchemesFound")}</p>
          <p className="text-sm mt-1">Try adjusting your search or category filter</p>
        </div>
      )}
    </div>
  );
}
