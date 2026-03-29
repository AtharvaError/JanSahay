"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe } from "lucide-react";
import { languages } from "@/lib/data/schemes";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";
import type { LangCode } from "@/lib/translations";

interface LanguageToggleProps {
  className?: string;
}

export default function LanguageToggle({ className }: LanguageToggleProps) {
  const [open, setOpen] = useState(false);
  const { lang, setLang, langLabel } = useLang();

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Switch language"
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-blue-500/20 hover:border-blue-400/50 transition-all text-sm font-medium text-slate-200 hover:text-white"
      >
        <Globe size={16} className="text-blue-400" />
        <span className="hidden sm:inline">{langLabel}</span>
        <span className="sm:hidden">{languages.find(l => l.code === lang)?.script ?? "EN"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-48 glass rounded-xl border border-blue-500/20 shadow-xl shadow-black/40 overflow-hidden z-50"
            >
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code as LangCode); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-blue-500/10",
                    lang === l.code ? "text-blue-400 bg-blue-500/10" : "text-slate-300"
                  )}
                >
                  <span>{l.label}</span>
                  <span className="text-xs text-slate-500">{l.script}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
