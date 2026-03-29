"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, MessageCircle, Bell, Zap, Globe } from "lucide-react";
import toast from "react-hot-toast";
import { useLang } from "@/contexts/LanguageContext";

type WaState = "idle" | "otp-sent" | "connected";

const features = [
  { icon: Bell, text: "Scheme deadline reminders" },
  { icon: Zap, text: "Instant application status updates" },
  { icon: Globe, text: "AI guidance in your language" },
  { icon: MessageCircle, text: "Reply to get scheme info on chat" },
];

export default function WhatsAppConnect() {
  const { t, lang } = useLang();
  const [waState, setWaState] = useState<WaState>("idle");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (mobile.length < 10) { toast.error("Enter a valid 10-digit mobile number"); return; }
    setLoading(true);
    // Call API
    await fetch("/api/whatsapp/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile, lang }),
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    setWaState("otp-sent");
    toast("OTP sent to your WhatsApp number", { icon: "💬" });
  };

  const verify = async () => {
    if (otp.length < 4) { toast.error("Enter the OTP"); return; }
    setLoading(true);
    const res = await fetch("/api/whatsapp/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile, otp }),
    }).catch(() => null);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setWaState("connected");
    toast.success(t("whatsappConnected"));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4 p-4 bg-[#25D366]/10 border border-[#25D366]/25 rounded-2xl">
        <div className="w-12 h-12 rounded-xl bg-[#25D366]/20 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={22} className="text-[#25D366]" />
        </div>
        <div>
          <h3 className="font-semibold text-white">{t("whatsapp")}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{t("whatsappDesc")}</p>
        </div>
      </div>

      {/* Feature list */}
      <div className="grid grid-cols-2 gap-3">
        {features.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-start gap-2.5 p-3 glass rounded-xl border border-navy-light/30">
            <Icon size={14} className="text-[#25D366] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-snug">{text}</p>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* IDLE */}
        {waState === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">{t("enterMobile")}</label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 py-2.5 bg-surface-2 border border-navy-light/40 rounded-xl text-sm text-slate-400 font-medium">
                  🇮🇳 +91
                </div>
                <input
                  type="tel" maxLength={10} value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit mobile number"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-surface-2 border border-navy-light/40 focus:border-[#25D366]/50 text-slate-200 text-sm outline-none transition-colors"
                />
              </div>
            </div>
            <button
              onClick={sendOtp} disabled={loading || mobile.length < 10}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg"
              style={{ background: mobile.length >= 10 ? "#25D366" : "#25D36660", color: "white" }}
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                : <><MessageCircle size={16} /> {t("sendOTP")} on WhatsApp</>}
            </button>
          </motion.div>
        )}

        {/* OTP SENT */}
        {waState === "otp-sent" && (
          <motion.div key="otp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="p-4 bg-[#25D366]/10 border border-[#25D366]/25 rounded-xl">
              <p className="text-sm text-white">{t("otpSent")}</p>
              <p className="text-xs text-slate-400 mt-1">+91 {mobile.slice(0,3)}XXXX{mobile.slice(-3)}</p>
              <p className="text-xs text-slate-500 mt-1">Demo OTP: <strong className="text-white">123456</strong></p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">{t("enterOTP")}</label>
              <input
                type="text" maxLength={6} value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit OTP"
                className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-navy-light/40 focus:border-[#25D366]/50 text-white text-xl text-center tracking-[0.5em] font-mono outline-none transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setWaState("idle")}
                className="px-4 py-2.5 rounded-xl glass border border-navy-light/40 text-slate-300 text-sm hover:border-white/20 transition-all">
                Change Number
              </button>
              <button onClick={verify} disabled={loading || otp.length < 4}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50"
                style={{ background: "#25D366" }}>
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : t("verifyOTP")}
              </button>
            </div>
          </motion.div>
        )}

        {/* CONNECTED */}
        {waState === "connected" && (
          <motion.div key="connected" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-[#25D366]/15 border border-[#25D366]/30 rounded-2xl">
              <CheckCircle size={22} className="text-[#25D366] flex-shrink-0" />
              <div>
                <p className="font-semibold text-white">{t("whatsappConnected")}</p>
                <p className="text-sm text-slate-400 mt-0.5">+91 {mobile} is now connected for scheme updates</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                "You'll receive deadline reminders 7 days before expiry",
                "Application status changes will be sent instantly",
                `Messages will arrive in ${lang === "hi" ? "Hindi" : lang === "ta" ? "Tamil" : "your chosen language"}`,
              ].map(item => (
                <div key={item} className="flex items-start gap-2 text-slate-300">
                  <CheckCircle size={13} className="text-[#25D366] flex-shrink-0 mt-0.5" />
                  <span className="text-xs">{item}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { setWaState("idle"); setOtp(""); setMobile(""); }}
              className="text-xs text-slate-400 hover:text-white transition-colors">
              Disconnect WhatsApp
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
