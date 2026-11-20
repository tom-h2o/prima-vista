import type { Clef } from "./notes";

export type Mode = "count" | "timed";
export type Theme = "system" | "light" | "dark";

export interface Settings {
  showNoteNames: boolean;
  sound: boolean;
  dailyGoalMinutes: number;
  theme: Theme;
}

export const DEFAULT_SETTINGS: Settings = {
  showNoteNames: false,
  sound: true,
  dailyGoalMinutes: 5,
  theme: "system",
};

export interface NoteStat {
  clef: Clef;
  midi: number;
  attempts: number;
  correct: number;
  totalTimeMs: number;
  /** gleitender Mittelwert der Fehler (0..1), jüngere Antworten zählen mehr */
  errorAvg: number;
  /** gleitender Mittelwert der Antwortzeit in ms */
  timeAvg: number;
}

export interface Answer {
  clef: Clef;
  midi: number;
  pressed: number;
  correct: boolean;
  timeMs: number;
}

export interface RoundInput {
  mode: Mode;
  level: number;
  durationMs: number;
  completed: boolean;
  localDate: string; // YYYY-MM-DD in der Zeitzone des Geräts
  answers: Answer[];
}

export interface RoundResult {
  unlockedNext: boolean;
  newRecord: boolean;
  previousRecord: number | null;
}

export interface AppState {
  settings: Settings;
  unlockedLevel: number;
  /** Rekorde im Zeitmodus pro Level */
  records: Record<string, number>;
  noteStats: NoteStat[];
  todayMs: number;
  streak: number;
}

export interface StatsSummary {
  total: { attempts: number; correct: number; avgMs: number | null };
  byClef: Record<Clef, { attempts: number; correct: number; avgMs: number | null }>;
  history: { date: string; attempts: number; correct: number; avgMs: number; practiceMs: number }[];
  weakest: NoteStat[];
  records: Record<string, number>;
  rounds: number;
  streak: number;
  bestStreak: number;
}
