"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, ChevronRight, Mic, Send } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import VoiceButton from "@/components/ui/VoiceButton";

interface AIGuidancePanelProps {
  stepIndex: number;
  schemeName: string;
}

const stepGuidance: Record<number, { hi: string; en: string; tip: string }> = {
  0: {
    en: "First, tick each document you have ready. Having all documents at hand means you can fill the government form without interruption.",
    hi: "पहले, हर वो दस्तावेज़ पर टिक करें जो आपके पास तैयार है। सभी दस्तावेज़ हाथ में होने से सरकारी फॉर्म बिना रुकावट भरा जा सकता है।",
    tip: "💡 DigiLocker से Aadhaar, PAN और आय प्रमाण पत्र तुरंत fetch करें — Settings में जाएं।",
  },
  1: {
    en: "Study the form field guide carefully. Each field shown here matches exactly what you'll see on the government portal. The 'From:' tag tells which document to copy from.",
    hi: "फॉर्म फ़ील्ड गाइड को ध्यान से पढ़ें। यहाँ दिखाया गया हर फ़ील्ड सरकारी पोर्टल पर भी वैसा ही दिखेगा। 'From:' टैग बताता है कि कौन से दस्तावेज़ से नकल करनी है।",
    tip: "💡 Example values को Copy बटन से clipboard में copy करें और पोर्टल पर paste करें।",
  },
  2: {
    en: "The portal will open in a new tab. Use the field guide from the previous step to fill each field correctly. After submitting, note down your reference number.",
    hi: "पोर्टल एक नए टैब में खुलेगा। पिछले चरण के फॉर्म गाइड का उपयोग करके हर फ़ील्ड सही से भरें। जमा करने के बाद अपना रेफरेंस नंबर नोट कर लें।",
    tip: "💡 अगर पोर्टल पर कोई समस्या आए तो नजदीकी CSC (Common Service Centre) पर जाएं — मुफ्त में मदद मिलती है।",
  },
  3: {
    en: "Great job! Your application is submitted on the official portal. Track your status there using the reference number. We'll send reminders if any action is needed.",
    hi: "बहुत अच्छे! आपका आवेदन सरकारी पोर्टल पर जमा हो गया। रेफरेंस नंबर से वहाँ स्थिति ट्रैक करें।",
    tip: "🎉 अपेक्षित प्रसंस्करण समय: 15-30 कार्य दिवस।",
  },
};

interface Message { id: string; role: "user" | "ai"; text: string }

export default function AIGuidancePanel({ stepIndex, schemeName }: AIGuidancePanelProps) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const guidance = stepGuidance[stepIndex] ?? stepGuidance[0];
  const guidanceText = (lang === "hi" || lang === "mr") ? guidance.hi : guidance.en;

  useEffect(() => {
    setMessages([{ id: "init", role: "ai", text: `${guidanceText}\n\n${guidance.tip}` }]);
  }, [stepIndex, lang]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    setInput("");
    setMessages(p => [...p, { id: Date.now().toString(), role: "user", text }]);
    setTyping(true);
    await new Promise(r => setTimeout(r, 900));
    const reply = lang === "hi" || lang === "mr"
      ? `${schemeName} के बारे में आपके सवाल का जवाब: यह योजना आपके लिए उपयुक्त है। अधिक जानकारी के लिए अगले चरण पर जाएं।`
      : `Great question about ${schemeName}! Based on your profile, you are on the right track. Continue to the next step to complete your application successfully.`;
    setTyping(false);
    setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: "ai", text: reply }]);
  };

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 md:bottom-8 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/40 hover:bg-blue-500 transition-colors"
        aria-label="Open AI Guide"
      >
        <Bot size={20} />
        <span className="text-sm font-semibold hidden sm:inline">AI Guide</span>
        <motion.span
          className="w-2.5 h-2.5 rounded-full bg-emerald-400"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-96 z-50 flex flex-col bg-[#111827] border-l border-navy-light/40 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-navy-light/30 bg-[#0f172a]">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">AI Application Guide</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-400">Helping you with {schemeName}</span>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0" role="log" aria-live="polite">
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${m.role === "ai" ? "bg-blue-600 text-white" : "bg-purple-600 text-white"}`}>
                      {m.role === "ai" ? "AI" : "U"}
                    </div>
                    <div className={`max-w-[85%] px-3 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-line ${m.role === "ai" ? "bg-[#1e2a3a] text-slate-200 rounded-tl-sm" : "bg-blue-600 text-white rounded-tr-sm"}`}>
                      {m.text}
                    </div>
                  </motion.div>
                ))}
                {typing && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0">AI</div>
                    <div className="bg-[#1e2a3a] px-3 py-3 rounded-xl rounded-tl-sm flex items-center gap-1">
                      {[0, 0.2, 0.4].map((d, i) => (
                        <motion.span key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                          animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: d }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-4 border-t border-navy-light/30">
                <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex items-center gap-2 bg-[#1e2a3a] rounded-xl px-3 py-2 border border-navy-light/40 focus-within:border-blue-500/40 transition-colors">
                  <VoiceButton size="sm" onTranscript={send} />
                  <input
                    type="text" value={input} onChange={e => setInput(e.target.value)}
                    placeholder="Ask anything about this scheme…"
                    className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
                  />
                  <button type="submit" disabled={!input.trim()} className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center transition-colors">
                    <Send size={12} className="text-white" />
                  </button>
                </form>

                {/* Quick questions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {["What documents do I need?", "How long does it take?", "Can I edit after submitting?"].map(q => (
                    <button key={q} onClick={() => send(q)}
                      className="text-xs px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center gap-1">
                      {q} <ChevronRight size={10} />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
