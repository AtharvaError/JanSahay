"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Shield, Users, Zap } from "lucide-react";
import VoiceButton from "@/components/ui/VoiceButton";
import { useLang } from "@/contexts/LanguageContext";

const AIMascot = dynamic(() => import("./AIMascot"), { ssr: false });

const stats = [
  { icon: Users,    label: "Citizens Helped", value: "2.4 Cr+" },
  { icon: Shield,   label: "Schemes Covered",  value: "500+" },
  { icon: Sparkles, label: "AI Accuracy",      value: "97%" },
];

export default function HeroSection() {
  const { t } = useLang();
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden px-4 py-20">
      {/* Theme-aware background */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--hero-gradient)" }} />
      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-400/7 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-10 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: Text */}
        <div className="space-y-8">

          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="pill-badge w-fit"
          >
            <Sparkles size={13} />
            AI-Powered Government Scheme Assistant
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-white">
              Find{" "}
              <span className="gradient-text">Government<br className="hidden lg:block" /> Schemes</span>{" "}
              You Deserve
            </h1>
            <p className="mt-4 text-lg text-slate-400 leading-relaxed max-w-xl">
              Instantly discover and apply for welfare schemes in your language.
              Our AI checks your eligibility across 500+ central and state schemes
              in seconds — no paperwork confusion.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap gap-4"
          >
            <Link
              href="/eligibility"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/35 hover:shadow-blue-500/55 hover:-translate-y-0.5"
            >
              {t("checkEligibility")}
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/schemes"
              className="flex items-center gap-2 px-6 py-3 rounded-xl glass border border-blue-500/30 text-blue-400 font-semibold hover:border-blue-500/60 hover:bg-blue-500/10 transition-all"
            >
              {t("exploreSchemes")}
            </Link>
            <div className="flex items-center gap-3">
              <VoiceButton size="md" />
              <span className="text-sm text-slate-400">or speak to search</span>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="flex flex-wrap gap-6"
          >
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <Icon size={16} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-base font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: 3D Mascot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="h-72 lg:h-[480px]"
        >
          <AIMascot />
        </motion.div>
      </div>
    </section>
  );
}
