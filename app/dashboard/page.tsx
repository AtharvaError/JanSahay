"use client";

import EligibilityOverview from "@/components/dashboard/EligibilityOverview";
import RecommendedSchemes from "@/components/dashboard/RecommendedSchemes";
import NotificationsPreview from "@/components/dashboard/NotificationsPreview";
import LanguageToggle from "@/components/ui/LanguageToggle";
import VoiceButton from "@/components/ui/VoiceButton";
import { useLang } from "@/contexts/LanguageContext";

export default function DashboardPage() {
  const { t } = useLang();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("goodMorning") : hour < 17 ? t("goodAfternoon") : t("goodEvening");

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{greeting}, Ramesh 👋</h1>
          <p className="text-slate-400 mt-1">You have 2 actions pending and 1 scheme closing soon.</p>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <VoiceButton size="sm" />
        </div>
      </div>

      {/* Overview tiles */}
      <EligibilityOverview />

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        {/* Schemes - takes 2 cols */}
        <div className="lg:col-span-2">
          <RecommendedSchemes />
        </div>

        {/* Notifications sidebar */}
        <div>
          <NotificationsPreview />

          {/* Quick actions */}
          <div className="mt-6 glass rounded-2xl p-5 border border-navy-light/30">
            <h3 className="text-sm font-semibold text-white mb-4">{t("quickActions")}</h3>
            <div className="space-y-2">
              {[
                { label: "Update Profile", href: "/eligibility", emoji: "✏️" },
                { label: "Upload Documents", href: "/documents", emoji: "📎" },
                { label: "Track Applications", href: "/schemes", emoji: "🔍" },
              ].map(({ label, href, emoji }) => (
                <a
                  key={label}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-500/10 transition-colors group"
                >
                  <span className="text-lg">{emoji}</span>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
