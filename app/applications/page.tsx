"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RefreshCw, CheckCircle2, Circle, Clock, ExternalLink, BellRing, Volume2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";
import { useUserData } from "@/contexts/UserDataContext";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { ui } from "@/lib/agent/ui";
import { STATUS_LABEL } from "@/lib/agent/i18n";
import { speak } from "@/lib/voice";
import type { ApplicationStatus } from "@/lib/agent/types";

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  submitted: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  under_verification: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  action_required: "bg-red-500/15 text-red-300 border-red-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
};

const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function ApplicationsPage() {
  const { lang } = useLang();
  const { applications, replaceApplications, followUps, toggleFollowUp } = useUserData();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async (quiet = false) => {
    if (!applications.length) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/applications/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applications }),
      });
      const json = await res.json();
      if (json.success) {
        const changed = json.data.filter((a: { referenceId: string; status: string }) =>
          applications.find(o => o.referenceId === a.referenceId)?.status !== a.status);
        replaceApplications(json.data);
        if (!quiet || changed.length) {
          for (const c of changed) toast.success(`${c.referenceId}: ${STATUS_LABEL[c.status][lang]}`);
        }
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Refresh once, as soon as the saved applications have loaded from the device.
  const autoRefreshed = useRef(false);
  useEffect(() => {
    if (autoRefreshed.current || !applications.length) return;
    autoRefreshed.current = true;
    refresh(true);
  }, [applications.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const allFollowUps = [
    ...followUps.map(f => ({ ...f, scheme: "" })),
    ...applications.flatMap(a => a.followUps.map(f => ({ ...f, scheme: a.title }))),
  ].sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));

  const readStatus = () => {
    const text = applications.map(a => `${a.title}: ${STATUS_LABEL[a.status][lang]}`).join(". ");
    speak(text || ui(lang, "noApplications"), lang);
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{ui(lang, "myApplications")}</h1>
          <p className="text-slate-400 mt-1 text-sm">Status, timeline and reminders for applications you confirmed.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={readStatus} aria-label="Read status aloud" className="p-2 rounded-lg border border-navy-light/40 text-blue-300 hover:bg-blue-500/10"><Volume2 size={16} /></button>
          <button
            onClick={() => refresh()}
            disabled={refreshing || !applications.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> {ui(lang, "refreshStatus")}
          </button>
          <LanguageToggle />
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="glass rounded-2xl border border-navy-light/30 p-10 text-center space-y-4">
          <p className="text-slate-300 text-sm">{ui(lang, "noApplications")}</p>
          <Link href="/eligibility" className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
            {ui(lang, "talkToSaathi")} →
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {applications.map((a, i) => (
              <motion.div key={a.referenceId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl border border-navy-light/30 p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-base font-semibold text-white">{a.icon} {a.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{a.referenceId} · {fmt(a.submittedAt)}</p>
                  </div>
                  <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0", STATUS_STYLE[a.status])}>
                    {STATUS_LABEL[a.status][lang]}
                  </span>
                </div>

                {/* Timeline */}
                <ol className="relative border-l border-navy-light/40 ml-2 space-y-3">
                  {(["submitted", "under_verification", "approved"] as ApplicationStatus[]).map(st => {
                    const ev = a.timeline.find(t => t.status === st);
                    return (
                      <li key={st} className="ml-4">
                        <span className="absolute -left-[7px] mt-0.5">
                          {ev ? <CheckCircle2 size={13} className="text-emerald-400 bg-surface rounded-full" /> : <Circle size={13} className="text-slate-600 bg-surface rounded-full" />}
                        </span>
                        <p className={cn("text-xs font-medium", ev ? "text-white" : "text-slate-500")}>{STATUS_LABEL[st][lang]}</p>
                        {ev && <p className="text-[11px] text-slate-400">{fmt(ev.at)} — {ev.note}</p>}
                      </li>
                    );
                  })}
                </ol>

                <details className="mt-4">
                  <summary className="text-xs text-blue-300 cursor-pointer">Submitted details ({a.fields.length})</summary>
                  <dl className="mt-2 grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                    {a.fields.map(f => (
                      <div key={f.field} className="text-[11px]">
                        <dt className="text-slate-500">{f.field}</dt>
                        <dd className="text-slate-200">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
                <a href={a.portalUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white">
                  Official portal <ExternalLink size={11} />
                </a>
              </motion.div>
            ))}
            <p className="text-[11px] text-slate-500">
              Status updates are simulated for this demo (no public government status API). The confirmed form and reference number are stored on this device.
            </p>
          </div>

          {/* Follow-ups */}
          <div className="glass rounded-2xl border border-purple-500/20 p-5 h-fit">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><BellRing size={15} className="text-purple-300" /> {ui(lang, "followUps")}</h2>
            <ul className="space-y-2.5">
              {allFollowUps.map(f => {
                const overdue = !f.done && +new Date(f.dueDate) < Date.now();
                return (
                  <li key={f.id}>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" checked={f.done} onChange={() => toggleFollowUp(f.id)} className="mt-0.5 accent-emerald-500" />
                      <span className={cn("text-xs", f.done ? "line-through text-slate-500" : "text-slate-200")}>
                        {f.title}
                        {f.scheme && <span className="block text-[10px] text-slate-500">{f.scheme}</span>}
                        <span className={cn("flex items-center gap-1 text-[10px]", overdue ? "text-red-400" : "text-slate-500")}>
                          <Clock size={9} /> {fmtDate(f.dueDate)}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
