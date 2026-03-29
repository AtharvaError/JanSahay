"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, AlertTriangle, CheckCircle, FileText, Sparkles, AlertCircle, Check } from "lucide-react";
import { notifications } from "@/lib/data/schemes";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useLang } from "@/contexts/LanguageContext";

type Filter = "all" | "unread" | "deadline" | "action";

const typeIcons = {
  deadline: AlertTriangle,
  approved: CheckCircle,
  document: FileText,
  new: Sparkles,
  action: AlertCircle,
};

const typeColors = {
  deadline: { icon: "text-yellow-400", bg: "bg-yellow-500/15", badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" },
  approved: { icon: "text-emerald-400", bg: "bg-emerald-500/15", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  document: { icon: "text-blue-400", bg: "bg-blue-500/15", badge: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  new: { icon: "text-purple-400", bg: "bg-purple-500/15", badge: "bg-purple-500/15 text-purple-400 border-purple-500/25" },
  action: { icon: "text-red-400", bg: "bg-red-500/15", badge: "bg-red-500/15 text-red-400 border-red-500/25" },
};


export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [readSet, setReadSet] = useState<Set<string>>(new Set(notifications.filter(n => n.read).map(n => n.id)));
  const { t } = useLang();

  const typeLabel = {
    deadline: t("notifDeadline"), approved: t("notifApproved"),
    document: t("notifDocument"), new: t("notifNewScheme"), action: t("notifAction"),
  };

  const filters: { id: Filter; label: string }[] = [
    { id: "all",      label: t("allAlerts") },
    { id: "unread",   label: t("filterUnread") },
    { id: "deadline", label: t("filterDeadlines") },
    { id: "action",   label: t("filterActionRequired") },
  ];

  const markRead = (id: string) => setReadSet(prev => new Set([...prev, id]));
  const markAll = () => setReadSet(new Set(notifications.map(n => n.id)));

  const filtered = notifications.filter(n => {
    if (activeFilter === "unread") return !readSet.has(n.id);
    if (activeFilter === "deadline") return n.type === "deadline";
    if (activeFilter === "action") return n.type === "action";
    return true;
  });

  const unreadCount = notifications.filter(n => !readSet.has(n.id)).length;

  return (
    <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{t("allAlerts")}</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">{unreadCount}</span>
            )}
          </div>
          <p className="text-slate-400 mt-1">Stay updated on scheme deadlines and status changes</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAll}
            className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Check size={14} /> {t("markAllRead")}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {filters.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveFilter(id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              activeFilter === id
                ? "bg-blue-600 text-white"
                : "bg-surface-2 text-slate-400 hover:text-white border border-navy-light/30"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-3">
        {filtered.map((notif, i) => {
          const Icon = typeIcons[notif.type];
          const colors = typeColors[notif.type];
          const isRead = readSet.has(notif.id);

          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => markRead(notif.id)}
              className={cn(
                "flex gap-4 p-4 glass rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md",
                isRead ? "border-navy-light/25 opacity-70" : "border-blue-500/20"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", colors.bg)}>
                <Icon size={18} className={colors.icon} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-white leading-tight">{notif.title}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isRead && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", colors.badge)}>
                      {typeLabel[notif.type]}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-400 mb-2 leading-relaxed">{notif.message}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{notif.time}</span>
                  {notif.schemeId && (
                    <Link
                      href={`/scheme/${notif.schemeId}`}
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {t("viewScheme")} →
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Bell size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No notifications here</p>
          <p className="text-sm text-slate-500 mt-1">You're all caught up!</p>
        </div>
      )}
    </div>
  );
}
