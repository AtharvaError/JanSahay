"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, LayoutDashboard, ClipboardCheck, FileText,
  Bell, FolderOpen, ChevronLeft, ChevronRight, Settings, ClipboardList } from "lucide-react";
import GovSchemeLogo from "@/components/ui/GovSchemeLogo";
import { cn } from "@/lib/utils";
import LanguageToggle from "@/components/ui/LanguageToggle";
import VoiceButton from "@/components/ui/VoiceButton";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useLang } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/translations";

const navItems: { href: string; labelKey: TranslationKey; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { href: "/",             labelKey: "home",          icon: Home },
  { href: "/dashboard",    labelKey: "dashboard",     icon: LayoutDashboard },
  { href: "/eligibility",  labelKey: "eligibility",   icon: ClipboardCheck },
  { href: "/applications", labelKey: "myApplications", icon: ClipboardList },
  { href: "/schemes",      labelKey: "schemes",       icon: FileText },
  { href: "/notifications",labelKey: "notifications", icon: Bell },
  { href: "/documents",    labelKey: "documents",     icon: FolderOpen },
  { href: "/settings",     labelKey: "settings",      icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { t } = useLang();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="hidden md:flex flex-col h-screen sticky top-0 bg-surface border-r border-navy-light/50 z-40 overflow-hidden flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-navy-light/30">
        <div className="flex-shrink-0 glow-lime rounded-xl overflow-hidden">
          <GovSchemeLogo size={36} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <p className="text-sm font-bold text-white leading-tight">GovScheme</p>
              <p className="text-xs text-slate-400">AI Assistant</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, labelKey, icon: Icon }) => {
          const active = pathname === href;
          const label = t(labelKey);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                active
                  ? "bg-blue-500/20 text-blue-400 shadow-sm"
                  : "text-slate-400 hover:bg-surface-2 hover:text-white"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-blue-500/15 rounded-xl border border-blue-500/30"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <Icon size={20} className={cn("flex-shrink-0 relative z-10", active && "text-blue-400")} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.12 }}
                    className="text-sm font-medium relative z-10 whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>

              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-surface-2 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-navy-light/50 z-50">
                  {label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: language + voice + collapse */}
      <div className="px-2 py-3 border-t border-navy-light/30 space-y-1">
        {!collapsed && (
          <div className="flex flex-col gap-2 px-2 mb-3">
            <div className="flex items-center gap-2">
              <LanguageToggle className="flex-1" />
              <VoiceButton size="sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Theme</span>
              <ThemeToggle size="sm" />
            </div>
          </div>
        )}

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-surface-2 hover:text-white transition-all"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="text-xs">{t("back")}</span>}
        </button>
      </div>
    </motion.aside>
  );
}
