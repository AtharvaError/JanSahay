"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface SavedSchemesContextType {
  savedIds: Set<string>;
  toggleSave: (id: string) => void;
  isSaved: (id: string) => boolean;
}

const SavedSchemesContext = createContext<SavedSchemesContextType>({
  savedIds: new Set(),
  toggleSave: () => {},
  isSaved: () => false,
});

export function SavedSchemesProvider({ children }: { children: React.ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("govscheme-saved");
      if (stored) setSavedIds(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  const toggleSave = (id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("govscheme-saved", JSON.stringify([...next]));
      return next;
    });
  };

  const isSaved = (id: string) => savedIds.has(id);

  return (
    <SavedSchemesContext.Provider value={{ savedIds, toggleSave, isSaved }}>
      {children}
    </SavedSchemesContext.Provider>
  );
}

export const useSavedSchemes = () => useContext(SavedSchemesContext);
