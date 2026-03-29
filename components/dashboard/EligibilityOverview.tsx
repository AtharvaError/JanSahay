"use client";

import { motion } from "framer-motion";
import { TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";

const tiles = [
  { icon: TrendingUp, label: "Eligibility Score", value: "87%", sub: "High match", color: "emerald", bg: "bg-emerald-500/15", border: "border-emerald-500/25", text: "text-emerald-400" },
  { icon: CheckCircle, label: "Schemes Applied", value: "3", sub: "Active applications", color: "blue", bg: "bg-blue-500/15", border: "border-blue-500/25", text: "text-blue-400" },
  { icon: Clock, label: "Pending Actions", value: "2", sub: "Need your attention", color: "yellow", bg: "bg-yellow-500/15", border: "border-yellow-500/25", text: "text-yellow-400" },
  { icon: AlertCircle, label: "Closing Soon", value: "1", sub: "Deadline in 30 days", color: "red", bg: "bg-red-500/15", border: "border-red-500/25", text: "text-red-400" },
];

export default function EligibilityOverview() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {tiles.map(({ icon: Icon, label, value, sub, bg, border, text }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className={`glass rounded-2xl p-4 border ${border} flex flex-col gap-3`}
        >
          <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
            <Icon size={18} className={text} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm font-medium text-white/80">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
