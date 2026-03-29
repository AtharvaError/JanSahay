"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, ChevronRight, Sparkles } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import VoiceButton from "@/components/ui/VoiceButton";

interface Message { id: string; role: "user" | "ai"; text: string }

const quickQuestions = [
  "Which schemes am I eligible for?",
  "How do I apply for PM-KISAN?",
  "What documents do I need?",
  "Check Ayushman Bharat eligibility",
];

const aiKnowledge: { keywords: string[]; en: string; hi: string }[] = [
  {
    keywords: ["pm-kisan", "kisan", "farmer", "agriculture", "farming"],
    en: "PM-KISAN gives farmers ₹6,000/year in 3 instalments of ₹2,000. You need Aadhaar, land records (up to 2 hectares), and a bank account. Apply at pmkisan.gov.in. Your profile shows a 92% match!",
    hi: "PM-KISAN किसानों को ₹6,000/वर्ष 3 किस्तों में देता है। आपको आधार, भूमि रिकॉर्ड (2 हेक्टेयर तक) और बैंक खाता चाहिए। pmkisan.gov.in पर आवेदन करें।",
  },
  {
    keywords: ["ayushman", "health", "hospital", "insurance", "medical"],
    en: "Ayushman Bharat PM-JAY gives ₹5 lakh/year health cover per family for 2000+ hospitals. BPL/SECC families qualify. Check eligibility at pmjay.gov.in with your Ration Card or Aadhaar.",
    hi: "आयुष्मान भारत परिवार को ₹5 लाख/वर्ष स्वास्थ्य बीमा देता है। BPL/SECC परिवार पात्र हैं। pmjay.gov.in पर पात्रता जांचें।",
  },
  {
    keywords: ["pmay", "house", "housing", "home", "awas"],
    en: "PMAY gives up to ₹2.67 lakh subsidy for first-time home buyers with annual income below ₹18 lakh. Apply at pmaymis.gov.in before June 2025 — deadline is soon!",
    hi: "PMAY पहली बार घर खरीदने वालों को ₹2.67 लाख तक की सब्सिडी देता है। आवेदन जल्द करें — अंतिम तिथि जून 2025 है।",
  },
  {
    keywords: ["scholarship", "student", "education", "study", "nsp"],
    en: "National Scholarship Portal offers up to ₹36,000/year for SC/ST/OBC/Minority students with family income below ₹2.5 lakh and 50%+ marks. Apply at scholarships.gov.in by October.",
    hi: "NSP SC/ST/OBC/अल्पसंख्यक छात्रों को ₹36,000/वर्ष तक देता है। अक्टूबर तक scholarships.gov.in पर आवेदन करें।",
  },
  {
    keywords: ["mudra", "loan", "business", "enterprise", "shop"],
    en: "PM MUDRA Yojana gives business loans up to ₹10 lakh — no collateral needed! Shishu (up to ₹50K), Kishore (₹50K–5L), Tarun (₹5L–10L). Apply at your nearest bank.",
    hi: "MUDRA योजना बिना गारंटी ₹10 लाख तक का व्यापार ऋण देती है। अपने नजदीकी बैंक में आवेदन करें।",
  },
  {
    keywords: ["document", "aadhaar", "certificate", "required", "need"],
    en: "Most schemes require: Aadhaar Card, Bank Passbook (with IFSC), Income Certificate, and a category-specific document. Connect DigiLocker in Settings to auto-fetch your documents!",
    hi: "अधिकांश योजनाओं के लिए चाहिए: आधार, बैंक पासबुक (IFSC सहित), आय प्रमाण पत्र। Settings में DigiLocker जोड़ें — दस्तावेज़ स्वतः आ जाएंगे।",
  },
  {
    keywords: ["eligible", "qualify", "check", "match", "which scheme"],
    en: "Based on your profile, you match PM-KISAN (92%), Ayushman Bharat (87%), PMAY (78%), and MUDRA Yojana (72%). Go to the Eligibility page for the full list with Apply Now buttons!",
    hi: "आपकी प्रोफ़ाइल के अनुसार: PM-KISAN (92%), आयुष्मान भारत (87%), PMAY (78%), MUDRA (72%) — Eligibility पेज पर जाएं।",
  },
];

function getReply(input: string, lang: string): string {
  const lower = input.toLowerCase();
  const match = aiKnowledge.find(k => k.keywords.some(kw => lower.includes(kw)));
  if (match) {
    return (lang === "hi" || lang === "mr") ? match.hi : match.en;
  }
  return lang === "hi" || lang === "mr"
    ? "मैं आपकी मदद करने के लिए यहाँ हूँ! कृपया अपनी समस्या बताएं — जैसे 'PM-KISAN के लिए क्या चाहिए?' या 'मेरे लिए कौन सी योजना है?'"
    : "I'm here to help! Ask me about any scheme — e.g. 'What schemes am I eligible for?' or 'Documents needed for PM-KISAN?'";
}

function now() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function GlobalAIGuide() {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = lang === "hi" || lang === "mr"
        ? "नमस्ते! 🙏 मैं आपका GovScheme AI सहायक हूँ। मैं आपको सही योजना खोजने और आवेदन करने में मदद करूँगा। आप क्या जानना चाहते हैं?"
        : "Namaste! 🙏 I'm your GovScheme AI assistant. I can help you find eligible schemes, understand documents, and guide your application. What would you like to know?";
      setMessages([{ id: "init", role: "ai", text: greeting }]);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    setInput("");
    setMessages(p => [...p, { id: Date.now().toString(), role: "user", text }]);
    setTyping(true);
    await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
    setTyping(false);
    setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: "ai", text: getReply(text, lang) }]);
  };

  return (
    <>
      {/* Floating button — bottom-right, above mobile nav */}
      <motion.button
        onClick={() => setOpen(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        className="fixed bottom-24 md:bottom-8 right-4 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-br from-[#6e9808] to-[#4e7204] text-white shadow-2xl shadow-[#6e9808]/50 hover:shadow-[#6e9808]/70 transition-shadow glow-lime"
        aria-label="Open AI Guide"
      >
        <div className="relative">
          <Bot size={20} />
          {/* Live indicator */}
          <motion.span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
        <span className="text-sm font-semibold hidden sm:inline">{t("aiGuide")}</span>
      </motion.button>

      {/* Slide-in panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop (mobile) */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] z-50 flex flex-col bg-[#080e05] border-l border-[#1c2e10]/60 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-[#1c2e10]/60 bg-gradient-to-r from-[#a8cc2a]/12 to-[#6e9808]/6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#a8cc2a] to-[#6e9808] flex items-center justify-center shadow-lg shadow-[#a8cc2a]/30">
                  <Bot size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">GovScheme AI</p>
                  <div className="flex items-center gap-1.5">
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-[11px] text-emerald-400">Always here to help</span>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close AI Guide"
                  className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
                role="log"
                aria-live="polite"
              >
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${m.role === "ai" ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white" : "bg-purple-600 text-white"}`}>
                      {m.role === "ai" ? <Bot size={14} /> : "U"}
                    </div>
                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === "ai" ? "bg-[#162035] text-slate-200 rounded-tl-sm border border-navy-light/40" : "bg-blue-600 text-white rounded-tr-sm"}`}>
                      {m.text}
                    </div>
                  </motion.div>
                ))}

                {/* Typing indicator */}
                <AnimatePresence>
                  {typing && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex gap-2.5"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Bot size={14} className="text-white" />
                      </div>
                      <div className="bg-[#162035] px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5 border border-navy-light/40">
                        {[0, 0.18, 0.36].map((d, i) => (
                          <motion.span key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                            animate={{ y: [0, -5, 0] }} transition={{ duration: 0.55, repeat: Infinity, delay: d }} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={bottomRef} />
              </div>

              {/* Quick questions */}
              <div className="px-4 pt-3 flex flex-wrap gap-1.5 border-t border-navy-light/20">
                {quickQuestions.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors"
                  >
                    <Sparkles size={9} /> {q}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="px-4 py-4">
                <form
                  onSubmit={e => { e.preventDefault(); send(input); }}
                  className="flex items-center gap-2 bg-[#162035] rounded-xl px-3 py-2.5 border border-navy-light/40 focus-within:border-blue-500/50 transition-colors"
                >
                  <VoiceButton size="sm" onTranscript={send} />
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask anything…"
                    className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    aria-label="Send"
                    className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <Send size={14} className="text-white" />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
