"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User } from "lucide-react";
import VoiceButton from "@/components/ui/VoiceButton";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Namaste! 🙏 I'm your GovScheme AI assistant. I'll help you find government schemes you're eligible for. Let's start — what is your occupation? (e.g., farmer, student, daily wage worker, small business owner)",
    time: now(),
  },
];

const aiResponses: Record<string, string> = {
  farmer: "Great! Farmers have access to excellent schemes like PM-KISAN (₹6,000/year), PM Fasal Bima, Kisan Credit Card, and more. What is your land holding size in hectares?",
  student: "Students can benefit from National Scholarship Portal, Dr. Ambedkar Post-Matric Scholarships, and state merit scholarships. Are you SC/ST/OBC/Minority or General category?",
  "business": "Small business owners can apply for PM MUDRA Yojana (loans up to ₹10 lakh), Stand-Up India, and Startup India schemes. What is your annual business turnover?",
  "daily wage": "Daily wage workers are eligible for PM-SYM pension scheme, Ayushman Bharat health coverage, and PMAY housing. What is your monthly income?",
  default: "Thank you for sharing that. Based on your response, I'm analyzing schemes that match your profile. What is your annual household income?",
};

function now() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function AIChatInterface() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, time: now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    await new Promise(r => setTimeout(r, 1000 + Math.random() * 800));

    const lower = text.toLowerCase();
    const key = Object.keys(aiResponses).find(k => lower.includes(k)) ?? "default";
    const reply: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: aiResponses[key],
      time: now(),
    };
    setTyping(false);
    setMessages(prev => [...prev, reply]);
  };

  return (
    <div className="flex flex-col h-full glass rounded-2xl border border-navy-light/40 overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-navy-light/30 bg-surface/50">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center glow-blue">
          <Bot size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">GovScheme AI</p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0"
        role="log"
        aria-live="polite"
        aria-label="AI chat conversation"
      >
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "assistant" ? "bg-blue-600" : "bg-purple-600"}`}>
              {msg.role === "assistant" ? <Bot size={14} className="text-white" /> : <User size={14} className="text-white" />}
            </div>
            <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-surface-2 text-slate-200 rounded-tl-sm"
                  : "bg-blue-600 text-white rounded-tr-sm"
              }`}>
                {msg.content}
              </div>
              <span className="text-[10px] text-slate-500 px-1">{msg.time}</span>
            </div>
          </motion.div>
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {typing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-surface-2 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                {[0, 0.2, 0.4].map((d, i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: d }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-navy-light/30">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-2 border border-navy-light/40 focus-within:border-blue-500/40 transition-colors"
        >
          <VoiceButton size="sm" onTranscript={(t) => sendMessage(t)} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer or speak..."
            aria-label="Chat message input"
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Send message"
            className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Send size={14} className="text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
