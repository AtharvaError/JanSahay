"use client";

import { motion } from "framer-motion";
import { MessageSquare, ListChecks } from "lucide-react";
import { useState } from "react";
import SchemeSaathiChat from "@/components/agent/SchemeSaathiChat";
import EligibleSchemesList from "@/components/eligibility/EligibleSchemesList";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";

type Mode = "schemes" | "chat";

export default function EligibilityPage() {
  const [mode, setMode] = useState<Mode>("chat");
  const { t } = useLang();

  const MODES = [
    { id: "schemes" as Mode, labelKey: "eligibleSchemes" as const, icon: ListChecks },
    { id: "chat"    as Mode, labelKey: "chatWithAI"      as const, icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("eligibilityCheck")}</h1>
          <p className="text-slate-400 mt-1">{t("checkEligibility")} — {t("applyNow").toLowerCase()} in minutes.</p>
        </div>
        <LanguageToggle />
      </div>

      {/* Mode toggle */}
      <div className="inline-flex p-1 bg-surface-2 rounded-xl border border-navy-light/30 mb-8">
        {MODES.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              mode === id
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Icon size={16} />
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Main panel */}
        <div className="lg:col-span-3 min-w-0">
          {mode === "schemes" ? (
            <motion.div
              key="schemes"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <EligibleSchemesList onTalk={() => setMode("chat")} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-[680px]"
            >
              <SchemeSaathiChat />
            </motion.div>
          )}
        </div>

        {/* Tips panel */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className="glass rounded-2xl p-5 border border-blue-500/20">
            <h3 className="text-sm font-semibold text-white mb-3">💡 {t("howMatchingWorks")}</h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              {([
                t("matchingTip1"),
                t("matchingTip2"),
                t("matchingTip3"),
                t("matchingTip4"),
              ] as string[]).map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-2xl p-5 border border-emerald-500/20">
            <h3 className="text-sm font-semibold text-white mb-3">🔒 {t("privacyAssured")}</h3>
            <p className="text-sm text-slate-400">{t("privacyText")}</p>
          </div>

          <div className="glass rounded-2xl p-5 border border-purple-500/20">
            <h3 className="text-sm font-semibold text-white mb-2">📞 {t("needHelp")}</h3>
            <p className="text-sm text-slate-400 mb-3">{t("needHelpText")}</p>
            <p className="text-xs text-purple-400">Helpline: 1800-XXX-XXXX (Toll Free)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
