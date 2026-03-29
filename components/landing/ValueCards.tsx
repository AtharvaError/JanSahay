"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ClipboardCheck, Zap, Globe, Headphones, FileCheck, Bell } from "lucide-react";

const features = [
  {
    icon: ClipboardCheck,
    title: "Smart Eligibility Checker",
    description: "Answer a few questions and our AI instantly matches you to schemes you qualify for.",
    href: "/eligibility",
    color: "from-blue-500/20 to-blue-600/5",
    border: "border-blue-500/25",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Get eligibility results in under 30 seconds. No waiting, no queues, no middlemen.",
    href: "/dashboard",
    color: "from-yellow-500/20 to-yellow-600/5",
    border: "border-yellow-500/25",
    iconBg: "bg-yellow-500/20",
    iconColor: "text-yellow-400",
  },
  {
    icon: Globe,
    title: "12+ Indian Languages",
    description: "Use the assistant in Hindi, Tamil, Bengali, Marathi, Telugu, and more regional languages.",
    href: "/eligibility",
    color: "from-emerald-500/20 to-emerald-600/5",
    border: "border-emerald-500/25",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: Headphones,
    title: "Voice Guidance",
    description: "Speak your query naturally. Our AI understands voice input in multiple dialects.",
    href: "/eligibility",
    color: "from-purple-500/20 to-purple-600/5",
    border: "border-purple-500/25",
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-400",
  },
  {
    icon: FileCheck,
    title: "Document Tracking",
    description: "Upload and track all your scheme documents in one place with real-time status updates.",
    href: "/documents",
    color: "from-coral/20 to-coral/5",
    border: "border-red-500/25",
    iconBg: "bg-red-500/20",
    iconColor: "text-red-400",
  },
  {
    icon: Bell,
    title: "Deadline Alerts",
    description: "Never miss a scheme deadline. Get timely alerts before applications close.",
    href: "/notifications",
    color: "from-orange-500/20 to-orange-600/5",
    border: "border-orange-500/25",
    iconBg: "bg-orange-500/20",
    iconColor: "text-orange-400",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export default function ValueCards() {
  return (
    <section className="px-4 py-20 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Everything You Need to Access{" "}
          <span className="gradient-text">Government Benefits</span>
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          A comprehensive platform designed for every Indian citizen — whether you're
          in a metro or a village, digitally savvy or a first-time user.
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {features.map(({ icon: Icon, title, description, href, color, border, iconBg, iconColor }) => (
          <motion.div key={title} variants={item}>
            <Link
              href={href}
              role="button"
              tabIndex={0}
              aria-label={`Learn more about ${title}`}
              className={`group block p-6 rounded-2xl bg-gradient-to-br ${color} border ${border} hover:border-opacity-60 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 cursor-pointer`}
            >
              <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={22} className={iconColor} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
