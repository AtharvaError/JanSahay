"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useLang } from "@/contexts/LanguageContext";
import type { LangCode } from "@/lib/translations";

interface VoiceButtonProps {
  onTranscript?: (text: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

// Recognition lang per app language
const RECOGNITION_LANG: Record<LangCode, string> = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  mr: "mr-IN",
  te: "te-IN",
  gu: "gu-IN",
  kn: "kn-IN",
};

// Language change command detection
const LANG_COMMANDS: { patterns: RegExp[]; code: LangCode; name: string }[] = [
  {
    patterns: [/hindi|हिंदी|हिन्दी/i],
    code: "hi",
    name: "हिंदी (Hindi)",
  },
  {
    patterns: [/marathi|मराठी/i],
    code: "mr",
    name: "मराठी (Marathi)",
  },
  {
    patterns: [/english|अंग्रेज़ी|ইংরেজি/i],
    code: "en",
    name: "English",
  },
  {
    patterns: [/telugu|తెలుగు/i],
    code: "te",
    name: "తెలుగు (Telugu)",
  },
  {
    patterns: [/kannada|ಕನ್ನಡ/i],
    code: "kn",
    name: "ಕನ್ನಡ (Kannada)",
  },
  {
    patterns: [/tamil|தமிழ்/i],
    code: "ta",
    name: "தமிழ் (Tamil)",
  },
  {
    patterns: [/bengali|bangla|বাংলা/i],
    code: "bn",
    name: "বাংলা (Bengali)",
  },
  {
    patterns: [/gujarati|ગુજરાતી/i],
    code: "gu",
    name: "ગુજરાતી (Gujarati)",
  },
];

/**
 * Returns the matched LangCode if the transcript contains a language-switch intent,
 * otherwise null. Intent words are broad to cover native + English phrasing.
 */
function detectLangChange(transcript: string): { code: LangCode; name: string } | null {
  const lower = transcript.toLowerCase();
  const hasIntent =
    /change|switch|set|use|speak|select|बदलो|बदल|में बात|mein|भाषा|language|lang/.test(lower);

  for (const { patterns, code, name } of LANG_COMMANDS) {
    if (patterns.some((p) => p.test(transcript))) {
      // Require intent OR the transcript is very short (user just said the language name)
      if (hasIntent || transcript.trim().split(/\s+/).length <= 3) {
        return { code, name };
      }
    }
  }
  return null;
}

// Animated sound-wave bars shown while listening
function SoundWave({ size }: { size: "sm" | "md" | "lg" }) {
  const barCount = size === "sm" ? 3 : 4;
  const heights =
    size === "sm"
      ? [8, 14, 8]
      : size === "lg"
      ? [10, 20, 28, 20]
      : [8, 16, 22, 16];

  return (
    <div className="flex items-center gap-[2px]">
      {heights.slice(0, barCount).map((h, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-white"
          animate={{ scaleY: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.55,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
          style={{ height: h, originY: "center" }}
        />
      ))}
    </div>
  );
}

export default function VoiceButton({ onTranscript, className, size = "md" }: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { lang, setLang } = useLang();

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    );
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  };

  const startListening = () => {
    if (!supported) {
      toast.error("Voice input not supported. Try Chrome.");
      return;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Use the app's current language for recognition so users can speak natively
    recognition.lang = RECOGNITION_LANG[lang] ?? "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript.trim();
      if (!transcript) return;

      // ── Language-change command detection ──
      const langMatch = detectLangChange(transcript);
      if (langMatch) {
        setLang(langMatch.code);
        toast.success(`Language changed to ${langMatch.name}`, { icon: "🌐", duration: 3000 });
        return; // command consumed — don't pass to parent
      }

      // ── Regular transcript ──
      onTranscript?.(transcript);
    };

    recognition.onerror = (e: any) => {
      setListening(false);
      recognitionRef.current = null;
      if (e.error === "not-allowed") {
        toast.error("Microphone access denied. Allow mic in browser settings.");
      } else if (e.error === "no-speech") {
        toast("No speech detected. Try again.", { icon: "🎤" });
      } else if (e.error !== "aborted") {
        toast.error(`Voice error: ${e.error}`);
      }
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
    }
  };

  const sizes = { sm: 32, md: 40, lg: 52 };

  return (
    <motion.button
      onClick={listening ? stopListening : startListening}
      whileHover={{ scale: supported ? 1.08 : 1 }}
      whileTap={{ scale: supported ? 0.92 : 1 }}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      title={
        !supported
          ? "Voice input not supported in this browser"
          : listening
          ? "Listening… tap to stop"
          : 'Tap to speak — try "change language to Hindi"'
      }
      style={{ width: sizes[size], height: sizes[size] }}
      className={cn(
        "relative flex items-center justify-center rounded-full transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-400 flex-shrink-0 overflow-hidden",
        listening
          ? "bg-red-500 shadow-lg shadow-red-500/50"
          : "bg-blue-500/20 border border-blue-500/40 hover:bg-blue-500/30 hover:border-blue-400/70 text-blue-400",
        !supported && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      {/* Ripple rings when listening */}
      <AnimatePresence>
        {listening && (
          <>
            <motion.span
              key="ring1"
              className="absolute inset-0 rounded-full border-2 border-red-400/60"
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              key="ring2"
              className="absolute inset-0 rounded-full border-2 border-red-400/40"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.7, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut", delay: 0.35 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Icon: mic when idle, sound wave when listening */}
      <span className="relative z-10">
        {listening ? (
          <SoundWave size={size} />
        ) : (
          <Mic size={size === "sm" ? 14 : size === "lg" ? 22 : 18} />
        )}
      </span>
    </motion.button>
  );
}
