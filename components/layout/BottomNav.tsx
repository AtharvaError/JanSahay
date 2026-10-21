"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, LayoutDashboard, ClipboardCheck, Bell, Settings, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/translations";

const navItems: { href: string; labelKey: TranslationKey; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { href: "/",              labelKey: "home",          icon: Home },
  { href: "/dashboard",     labelKey: "dashboard",     icon: LayoutDashboard },
  { href: "/eligibility",   labelKey: "eligibility",   icon: ClipboardCheck },
  { href: "/applications", labelKey: "myApplications", icon: ClipboardList },
  { href: "/notifications", labelKey: "notifications", icon: Bell },
  { href: "/settings",      labelKey: "settings",      icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLang();

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-1 py-2 bg-surface border-t border-navy-light/50"
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {navItems.map(({ href, labelKey, icon: Icon }) => {
        const active = pathname === href;
        const label = t(labelKey);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all min-w-[44px] relative",
              active ? "text-blue-400" : "text-slate-500"
            )}
          >
            {active && (
              <motion.div
                layoutId="bottom-active"
                className="absolute inset-0 bg-blue-500/15 rounded-xl border border-blue-500/25"
                transition={{ type: "spring", bounce: 0.3, duration: 0.35 }}
              />
            )}
            <Icon size={20} className="relative z-10" />
            <span className="text-[9px] font-medium relative z-10 truncate max-w-[40px] text-center">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
