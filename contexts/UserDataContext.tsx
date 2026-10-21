"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { FollowUp, TrackedApplication, UserProfile } from "@/lib/agent/types";
import { useLang } from "@/contexts/LanguageContext";

// WhatsApp-verified sign-in, as reported by /api/whatsapp/session.
export interface Account {
  mobile: string;      // masked, e.g. "+91 98XXXXXX10"
  serverSync: boolean; // the server has a database, so data is synced and reminders can be sent
  optIn: boolean;      // citizen consented to WhatsApp reminders
}

// Citizen profile, submitted applications and reminders — kept on the user's own device,
// and mirrored to the server once they verify their mobile on WhatsApp (if a database is configured).
interface UserDataContextType {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  applications: TrackedApplication[];
  addApplication: (a: TrackedApplication) => void;
  replaceApplications: (a: TrackedApplication[]) => void;
  followUps: FollowUp[];
  addFollowUps: (f: FollowUp[]) => void;
  toggleFollowUp: (id: string) => void;
  resetAll: () => void;
  account: Account | null;
  refreshAccount: () => Promise<void>;
}

const KEY = "jansahay-userdata-v1";
const UserDataContext = createContext<UserDataContextType | null>(null);

// Union by key, keeping the device's copy when both sides have an item.
function union<T>(local: T[], server: T[], key: (t: T) => string): T[] {
  const seen = new Set(local.map(key));
  return [...local, ...server.filter(s => !seen.has(key(s)))];
}

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const [profile, setProfile] = useState<UserProfile>({});
  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const mergedFor = useRef<string | null>(null);

  // Hydrate from localStorage after mount (reading it during render would mismatch the server HTML).
  useEffect(() => {
    let d: { profile?: UserProfile; applications?: TrackedApplication[]; followUps?: FollowUp[] } = {};
    try {
      d = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {}
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from an external store */
    setProfile(d.profile ?? {});
    setApplications(d.applications ?? []);
    setFollowUps(d.followUps ?? []);
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ profile, applications, followUps }));
    } catch {}
  }, [profile, applications, followUps, loaded]);

  const refreshAccount = useCallback(async () => {
    try {
      const json = await (await fetch("/api/whatsapp/session")).json();
      setAccount(json.data ?? null);
    } catch {
      setAccount(null); // offline — keep working from localStorage
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches the session once on mount
    refreshAccount();
  }, [refreshAccount]);

  // Mirror to the server. The first sync after sign-in also pulls down anything stored from
  // another device; later syncs just push (debounced) so `done` ticks reach the reminder sender.
  useEffect(() => {
    if (!loaded || !account?.serverSync) return;
    const first = mergedFor.current !== account.mobile;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/user/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, applications, followUps, lang }),
        });
        const json = await res.json();
        if (!first || !json.success || !json.data) return;
        mergedFor.current = account.mobile;
        setApplications(prev => union(prev, json.data.applications as TrackedApplication[], a => a.referenceId));
        setFollowUps(prev => union(prev, json.data.followUps as FollowUp[], f => f.id));
      } catch {}
    }, first ? 0 : 1500);
    return () => clearTimeout(timer);
  }, [loaded, account, profile, applications, followUps, lang]);

  const addApplication = useCallback((a: TrackedApplication) => setApplications(prev => [a, ...prev]), []);
  const replaceApplications = useCallback((a: TrackedApplication[]) => setApplications(a), []);
  // Skip a reminder if an open one with the same text already exists.
  const addFollowUps = useCallback((f: FollowUp[]) => setFollowUps(prev => [
    ...prev,
    ...f.filter(n => !prev.some(p => !p.done && p.title === n.title)),
  ]), []);

  const toggleFollowUp = useCallback((id: string) => {
    setFollowUps(prev => prev.map(f => (f.id === id ? { ...f, done: !f.done } : f)));
    setApplications(prev => prev.map(a => ({
      ...a,
      followUps: a.followUps.map(f => (f.id === id ? { ...f, done: !f.done } : f)),
    })));
  }, []);

  const resetAll = useCallback(() => {
    setProfile({});
    setApplications([]);
    setFollowUps([]);
  }, []);

  return (
    <UserDataContext.Provider value={{ profile, setProfile, applications, addApplication, replaceApplications, followUps, addFollowUps, toggleFollowUp, resetAll, account, refreshAccount }}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("useUserData must be used inside UserDataProvider");
  return ctx;
}
