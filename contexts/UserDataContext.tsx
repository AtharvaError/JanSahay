"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { FollowUp, TrackedApplication, UserProfile } from "@/lib/agent/types";

// Citizen profile, submitted applications and reminders — kept on the user's own device.
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
}

const KEY = "jansahay-userdata-v1";
const UserDataContext = createContext<UserDataContextType | null>(null);

export function UserDataProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>({});
  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loaded, setLoaded] = useState(false);

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
    <UserDataContext.Provider value={{ profile, setProfile, applications, addApplication, replaceApplications, followUps, addFollowUps, toggleFollowUp, resetAll }}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("useUserData must be used inside UserDataProvider");
  return ctx;
}
