"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bell, ArrowRight, AlertTriangle, CheckCircle, FileText, Sparkles, AlertCircle } from "lucide-react";
import { notifications } from "@/lib/data/schemes";

const typeIcons = {
  deadline: AlertTriangle,
  approved: CheckCircle,
  document: FileText,
  new: Sparkles,
  action: AlertCircle,
};

const typeColors = {
  deadline: "text-yellow-400 bg-yellow-500/15",
  approved: "text-emerald-400 bg-emerald-500/15",
  document: "text-blue-400 bg-blue-500/15",
  new: "text-purple-400 bg-purple-500/15",
  action: "text-red-400 bg-red-500/15",
};

export default function NotificationsPreview() {
  const recent = notifications.slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Recent Alerts</h2>
          <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {notifications.filter(n => !n.read).length}
          </span>
        </div>
        <Link href="/notifications" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
          View all <ArrowRight size={14} />
        </Link>
      </div>

      <div className="space-y-3">
        {recent.map((notif, i) => {
          const Icon = typeIcons[notif.type];
          const colorClass = typeColors[notif.type];
          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 + 0.3 }}
              className={`flex items-start gap-3 p-4 glass rounded-xl border transition-colors ${notif.read ? "border-navy-light/30" : "border-blue-500/20"}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white leading-tight">{notif.title}</p>
                  {!notif.read && <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1" />}
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">{notif.message}</p>
                <p className="text-xs text-slate-500 mt-1">{notif.time}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
