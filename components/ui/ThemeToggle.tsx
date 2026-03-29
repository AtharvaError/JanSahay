"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

export default function ThemeToggle({ className, size = "md" }: ThemeToggleProps) {
  const { isDark, toggle } = useTheme();

  const isSmall = size === "sm";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative flex items-center rounded-full border transition-colors duration-300",
        isDark
          ? "bg-[#1c2e10] border-[#2a4418] hover:border-[#a8cc2a]/50"
          : "bg-amber-100 border-amber-300 hover:border-amber-400",
        isSmall ? "w-12 h-6 p-0.5" : "w-14 h-7 p-1",
        className
      )}
    >
      {/* Track labels */}
      <span className="sr-only">{isDark ? "Dark" : "Light"}</span>

      {/* Sliding knob */}
      <motion.div
        layout
        animate={{ x: isDark ? 0 : isSmall ? 24 : 28 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "rounded-full flex items-center justify-center flex-shrink-0 shadow-md",
          isDark ? "bg-[#a8cc2a]" : "bg-amber-400",
          isSmall ? "w-5 h-5" : "w-5 h-5"
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Moon size={isSmall ? 11 : 12} className="text-[#060b04]" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Sun size={isSmall ? 11 : 12} className="text-amber-800" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Icon on the right side of track */}
      <div className={cn(
        "flex items-center justify-center flex-1",
        isDark ? "text-slate-500" : "text-amber-600"
      )}>
        {isDark
          ? <Sun size={isSmall ? 10 : 11} />
          : <Moon size={isSmall ? 10 : 11} />
        }
      </div>
    </button>
  );
}
