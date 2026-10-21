"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { schemes } from "@/lib/data/schemes";
import SchemeNotFound from "@/components/ui/SchemeNotFound";
import ApplicationWizard from "@/components/apply/ApplicationWizard";
import LanguageToggle from "@/components/ui/LanguageToggle";
import VoiceButton from "@/components/ui/VoiceButton";
import { useLang } from "@/contexts/LanguageContext";

export default function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const scheme = schemes.find(s => s.id === id);
  if (!scheme) return <SchemeNotFound id={id} />;
  return <ApplyPageContent scheme={scheme} />;
}

function ApplyPageContent({ scheme }: { scheme: (typeof schemes)[number] }) {
  const { t } = useLang();

  return (
    <div className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href={`/scheme/${scheme.id}`} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{scheme.icon}</span>
              <h1 className="text-xl font-bold text-white leading-tight">{scheme.title}</h1>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">{t("stepByStepAppGuide")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <VoiceButton size="sm" />
        </div>
      </div>

      {/* Cultural touch strip */}
      <div className="mb-8 p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/8 to-orange-500/5 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">🙏</span>
        <div>
          <p className="text-sm font-medium text-amber-200">{t("withYouEveryStep")}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t("aiSpeaksYourLang")} — just tap the blue button anytime.</p>
        </div>
      </div>

      {/* Wizard */}
      <ApplicationWizard scheme={scheme} />
    </div>
  );
}
