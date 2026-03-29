"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { type LangCode, type TranslationKey, t as translate } from "@/lib/translations";
import { languages } from "@/lib/data/schemes";

interface LanguageContextType {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: TranslationKey) => string;
  langLabel: string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
  langLabel: "English",
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  const setLang = useCallback((l: LangCode) => setLangState(l), []);
  const t = useCallback((key: TranslationKey) => translate(lang, key), [lang]);
  const langLabel = languages.find(l => l.code === lang)?.label ?? "English";

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, langLabel }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
