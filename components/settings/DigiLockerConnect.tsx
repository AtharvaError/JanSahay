"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, CheckCircle, FileText, RefreshCw, ExternalLink, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useLang } from "@/contexts/LanguageContext";

const digiDocsMock = [
  { id: "dl1", name: "Aadhaar Card", issuer: "UIDAI", type: "Identity", date: "2023-01-15", verified: true },
  { id: "dl2", name: "PAN Card", issuer: "Income Tax Dept.", type: "Identity", date: "2022-08-20", verified: true },
  { id: "dl3", name: "Driving Licence", issuer: "Road Transport Authority", type: "Identity", date: "2024-03-10", verified: true },
  { id: "dl4", name: "Income Certificate", issuer: "State Government", type: "Certificate", date: "2024-11-01", verified: true },
  { id: "dl5", name: "Caste Certificate", issuer: "District Collector Office", type: "Certificate", date: "2024-09-15", verified: false },
  { id: "dl6", name: "Birth Certificate", issuer: "Municipal Corporation", type: "Certificate", date: "2023-06-22", verified: true },
];

type ConnectState = "idle" | "connecting" | "otp" | "connected";

export default function DigiLockerConnect() {
  const { t } = useLang();
  const [state, setState] = useState<ConnectState>("idle");
  const [otp, setOtp] = useState("");
  const [fetching, setFetching] = useState(false);
  const [docs, setDocs] = useState<typeof digiDocsMock>([]);
  const [mobile, setMobile] = useState("9876543210");

  const startConnect = async () => {
    setState("connecting");
    await new Promise(r => setTimeout(r, 1200));
    setState("otp");
    toast("OTP sent to your DigiLocker-linked mobile", { icon: "📱" });
  };

  const verifyOtp = async () => {
    if (otp.length < 4) { toast.error("Enter the 6-digit OTP"); return; }
    setState("connecting");
    await new Promise(r => setTimeout(r, 1000));
    setState("connected");
    toast.success("DigiLocker connected successfully! 🎉");
  };

  const fetchDocs = async () => {
    setFetching(true);
    await new Promise(r => setTimeout(r, 1800));
    setDocs(digiDocsMock);
    setFetching(false);
    toast.success(`${digiDocsMock.length} documents fetched from DigiLocker`);
  };

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="flex items-start gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
        <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <Shield size={22} className="text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">{t("digilocker")}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{t("digilockerDesc")}</p>
          <p className="text-xs text-blue-400 mt-1.5 flex items-center gap-1"><Lock size={10} /> Secured by DigiLocker · Government of India</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* IDLE */}
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid sm:grid-cols-3 gap-3 mb-5">
              {[
                { icon: "🪪", label: "Auto-fill Aadhaar & PAN" },
                { icon: "📜", label: "Fetch income & caste certs" },
                { icon: "⚡", label: "One-click document upload" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 p-3 glass rounded-xl border border-navy-light/30 text-center">
                  <span className="text-2xl">{icon}</span>
                  <p className="text-xs text-slate-300">{label}</p>
                </div>
              ))}
            </div>
            <button
              onClick={startConnect}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20"
            >
              <Shield size={16} /> {t("connect")} DigiLocker
            </button>
          </motion.div>
        )}

        {/* CONNECTING */}
        {state === "connecting" && (
          <motion.div key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-8 gap-3">
            <div className="w-12 h-12 border-3 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" style={{ borderWidth: 3 }} />
            <p className="text-sm text-slate-300">Connecting to DigiLocker…</p>
          </motion.div>
        )}

        {/* OTP */}
        {state === "otp" && (
          <motion.div key="otp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <p className="text-sm text-emerald-300">OTP sent to mobile ending in <strong>...{mobile.slice(-4)}</strong></p>
              <p className="text-xs text-slate-400 mt-1">For demo, use OTP: <strong className="text-white">123456</strong></p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">{t("enterOTP")}</label>
              <input
                type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit OTP"
                className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-navy-light/40 focus:border-blue-500/50 text-white text-lg text-center tracking-widest font-mono outline-none transition-colors"
              />
            </div>
            <button onClick={verifyOtp} disabled={otp.length < 4}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition-all">
              {t("verifyOTP")}
            </button>
          </motion.div>
        )}

        {/* CONNECTED */}
        {state === "connected" && (
          <motion.div key="connected" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
              <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">DigiLocker Connected</p>
                <p className="text-xs text-slate-400 mt-0.5">Linked to {mobile.slice(0, 2)}XXXXX{mobile.slice(-2)}</p>
              </div>
            </div>

            {docs.length === 0 ? (
              <button onClick={fetchDocs} disabled={fetching}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/20">
                {fetching ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Fetching documents…</>
                ) : (
                  <><RefreshCw size={16} /> {t("fetchDocs")}</>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{t("docsReady")} ({docs.length})</p>
                  <button onClick={fetchDocs}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    <RefreshCw size={12} /> Refresh
                  </button>
                </div>
                {docs.map((doc, i) => (
                  <motion.div key={doc.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3.5 glass rounded-xl border border-navy-light/30">
                    <div className="w-8 h-10 rounded bg-red-500/15 border border-red-500/20 flex flex-col items-center justify-center flex-shrink-0">
                      <FileText size={13} className="text-red-400" />
                      <span className="text-[7px] text-red-400 font-bold">PDF</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                      <p className="text-xs text-slate-400">{doc.issuer} · {doc.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.verified
                        ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={12} /> Verified</span>
                        : <span className="text-xs text-yellow-400">Pending</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
