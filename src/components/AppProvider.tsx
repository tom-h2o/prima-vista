"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { localDateString } from "@/lib/dates";
import { piano } from "@/lib/audio";
import { DEFAULT_SETTINGS, type AppState, type RoundInput, type RoundResult, type Settings } from "@/lib/types";

interface Ctx {
  state: AppState | null;
  settings: Settings;
  error: string | null;
  refresh: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  submitRound: (round: RoundInput) => Promise<RoundResult | null>;
}

const AppContext = createContext<Ctx | null>(null);

const CACHE_KEY = "pv-state";
const QUEUE_KEY = "pv-pending-rounds";

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

class ApiError extends Error {
  constructor(public status: number) {
    super(`Serverfehler ${status}`);
  }
}

/** Vom Server dauerhaft abgelehnt (z. B. ungültige Runde): erneut senden hilft nicht. */
const isRejected = (e: unknown) => e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 401;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init?.headers }, cache: "no-store" });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Nicht angemeldet");
  }
  if (!res.ok) throw new ApiError(res.status);
  return (await res.json()) as T;
}

export function applyTheme(theme: Settings["theme"]) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    localStorage.setItem("pv-theme", theme);
  } catch {}
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flushing = useRef(false);

  const setAndCache = useCallback((s: AppState) => {
    setState(s);
    writeLocal(CACHE_KEY, s);
  }, []);

  const flushQueue = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      let queue = readLocal<RoundInput[]>(QUEUE_KEY, []);
      while (queue.length > 0) {
        try {
          const res = await api<RoundResult & { state: AppState }>("/api/rounds", { method: "POST", body: JSON.stringify(queue[0]) });
          setAndCache(res.state);
        } catch (e) {
          // Abgelehnte Runde verwerfen, damit sie die übrigen nicht blockiert
          if (!isRejected(e)) throw e;
        }
        queue = queue.slice(1);
        writeLocal(QUEUE_KEY, queue);
      }
    } catch {
      /* später erneut */
    } finally {
      flushing.current = false;
    }
  }, [setAndCache]);

  const refresh = useCallback(async () => {
    try {
      await flushQueue();
      setAndCache(await api<AppState>(`/api/state?today=${localDateString()}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
  }, [flushQueue, setAndCache]);

  useEffect(() => {
    const cached = readLocal<AppState | null>(CACHE_KEY, null);
    if (cached) setState(cached);
    void refresh();
    void piano.preload();
    const unlock = () => piano.unlock();
    document.addEventListener("pointerdown", unlock, { once: true });
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);

  const settings = state?.settings ?? DEFAULT_SETTINGS;

  useEffect(() => {
    piano.muted = !settings.sound;
  }, [settings.sound]);

  useEffect(() => {
    if (state) applyTheme(settings.theme);
  }, [state, settings.theme]);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      setState((prev) => {
        const base = prev ?? readLocal<AppState | null>(CACHE_KEY, null);
        if (!base) return prev;
        const next = { ...base, settings: { ...base.settings, ...patch } };
        writeLocal(CACHE_KEY, next);
        return next;
      });
      try {
        const saved = await api<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(patch) });
        setState((prev) => (prev ? { ...prev, settings: saved } : prev));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
      }
    },
    [],
  );

  const submitRound = useCallback(
    async (round: RoundInput): Promise<RoundResult | null> => {
      try {
        const res = await api<RoundResult & { state: AppState }>("/api/rounds", { method: "POST", body: JSON.stringify(round) });
        setAndCache(res.state);
        void flushQueue();
        return { unlockedNext: res.unlockedNext, newRecord: res.newRecord, previousRecord: res.previousRecord };
      } catch (e) {
        if (isRejected(e)) return null;
        // offline o. Ä.: Runde merken und später senden
        writeLocal(QUEUE_KEY, [...readLocal<RoundInput[]>(QUEUE_KEY, []), round]);
        return null;
      }
    },
    [flushQueue, setAndCache],
  );

  const value = useMemo(
    () => ({ state, settings, error, refresh, updateSettings, submitRound }),
    [state, settings, error, refresh, updateSettings, submitRound],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp außerhalb von AppProvider");
  return ctx;
}
