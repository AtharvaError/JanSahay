"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bookmark, Shield, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";
import ProfileSettings from "@/components/settings/ProfileSettings";
import SavedSchemes from "@/components/settings/SavedSchemes";
import DigiLockerConnect from "@/components/settings/DigiLockerConnect";
import WhatsAppConnect from "@/components/settings/WhatsAppConnect";
import LanguageToggle from "@/components/ui/LanguageToggle";

type Tab = "profile" | "saved" | "digilocker" | "whatsapp";

const tabs: Array<{ id: Tab; icon: React.FC<{ size?: number; className?: string }>; labelKey: "profile" | "savedSchemes" | "digilocker" | "whatsapp"; color: string }> = [
  { id: "profile",    icon: User,          labelKey: "profile",      color: "blue" },
  { id: "saved",      icon: Bookmark,      labelKey: "savedSchemes", color: "yellow" },
  { id: "digilocker", icon: Shield,        labelKey: "digilocker",   color: "emerald" },
  { id: "whatsapp",   icon: MessageCircle, labelKey: "whatsapp",     color: "green" },
];

const colorClasses: Record<string, { active: string; icon: string; border: string }> = {
  blue:    { active: "bg-blue-600",    icon: "text-blue-400",    border: "border-blue-500/30" },
  yellow:  { active: "bg-yellow-500",  icon: "text-yellow-400",  border: "border-yellow-500/30" },
  emerald: { active: "bg-emerald-600", icon: "text-emerald-400", border: "border-emerald-500/30" },
  green:   { active: "bg-[#25D366]",   icon: "text-[#25D366]",   border: "border-[#25D366]/30" },
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const { t } = useLang();

  const activeColor = tabs.find(t => t.id === activeTab)?.color ?? "blue";
  const cc = colorClasses[activeColor];

  return (
    <div className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("settings")}</h1>
          <p className="text-slate-400 mt-1">Manage your profile, saved schemes, and connected services</p>
        </div>
        <LanguageToggle />
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar tabs */}
        <div className="lg:col-span-1">
          <nav className="space-y-1.5" aria-label="Settings sections">
            {tabs.map(({ id, icon: Icon, labelKey, color }) => {
              const active = activeTab === id;
              const c = colorClasses[color];
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all text-left",
                    active
                      ? `${c.active} text-white shadow-md`
                      : "text-slate-400 hover:bg-surface-2 hover:text-white glass border border-transparent hover:border-navy-light/30"
                  )}
                >
                  <Icon size={18} className={active ? "text-white" : c.icon} />
                  <span className="text-sm font-medium">{t(labelKey)}</span>
                </button>
              );
            })}
          </nav>

          {/* Mini language selector in sidebar */}
          <div className="mt-6 p-4 glass rounded-xl border border-navy-light/30">
            <p className="text-xs font-medium text-slate-300 mb-3">🌐 App Language</p>
            <LanguageToggle className="w-full" />
          </div>
        </div>

        {/* Content panel */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cn("glass rounded-2xl p-6 border", cc.border)}
            >
              {activeTab === "profile"    && <ProfileSettings />}
              {activeTab === "saved"      && <SavedSchemes />}
              {activeTab === "digilocker" && <DigiLockerConnect />}
              {activeTab === "whatsapp"   && <WhatsAppConnect />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
