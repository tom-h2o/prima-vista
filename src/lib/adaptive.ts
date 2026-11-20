import type { NoteItem } from "./levels";
import { itemKey } from "./levels";
import type { NoteStat } from "./types";

/** Gewicht einer Note: unbekannte, fehleranfällige und langsame Noten kommen häufiger. */
export function noteWeight(stat: NoteStat | undefined): number {
  if (!stat || stat.attempts === 0) return 2;
  const errorPart = 5 * stat.errorAvg;
  const slowPart = Math.min(3, Math.max(0, (stat.timeAvg - 1500) / 1000));
  return 1 + errorPart + slowPart;
}

export function statMap(stats: NoteStat[]): Map<string, NoteStat> {
  return new Map(stats.map((s) => [`${s.clef}:${s.midi}`, s]));
}

const ERROR_ALPHA = 0.3;
const TIME_ALPHA = 0.3;

/** Aktualisiert eine Notenstatistik um eine Antwort (rein, ohne Seiteneffekte). */
export function updateStat(prev: NoteStat | undefined, item: NoteItem, correct: boolean, timeMs: number): NoteStat {
  const t = Math.min(timeMs, 15000);
  if (!prev || prev.attempts === 0) {
    return {
      clef: item.clef,
      midi: item.midi,
      attempts: 1,
      correct: correct ? 1 : 0,
      totalTimeMs: t,
      errorAvg: correct ? 0 : 1,
      timeAvg: t,
    };
  }
  return {
    ...prev,
    attempts: prev.attempts + 1,
    correct: prev.correct + (correct ? 1 : 0),
    totalTimeMs: prev.totalTimeMs + t,
    errorAvg: prev.errorAvg * (1 - ERROR_ALPHA) + (correct ? 0 : 1) * ERROR_ALPHA,
    timeAvg: prev.timeAvg * (1 - TIME_ALPHA) + t * TIME_ALPHA,
  };
}

/** Wie viele Noten später eine falsch beantwortete Note wiederkommt. */
export const RETRY_GAP = 3;

interface Retry {
  item: NoteItem;
  due: number; // Zugnummer, ab der die Note wieder dran ist
}

/**
 * Zieht Noten für eine Runde. Schwache Noten werden häufiger gezogen,
 * falsch beantwortete kommen ein paar Züge später wieder, bis sie sitzen,
 * und dieselbe Note kommt nie zweimal direkt hintereinander.
 */
export class NotePicker {
  private stats: Map<string, NoteStat>;
  private retries: Retry[] = [];
  private turn = 0;
  private last: string | null = null;
  current: NoteItem | null = null;

  constructor(
    private items: NoteItem[],
    stats: NoteStat[],
    private random: () => number = Math.random,
  ) {
    this.stats = statMap(stats);
  }

  next(): NoteItem {
    this.turn++;
    const dueIdx = this.retries.findIndex((r) => r.due <= this.turn && itemKey(r.item) !== this.last);
    let item: NoteItem;
    if (dueIdx >= 0) {
      item = this.retries.splice(dueIdx, 1)[0].item;
    } else {
      const candidates = this.items.filter((i) => itemKey(i) !== this.last);
      const pool = candidates.length > 0 ? candidates : this.items;
      const weights = pool.map((i) => noteWeight(this.stats.get(itemKey(i))));
      const sum = weights.reduce((a, b) => a + b, 0);
      let r = this.random() * sum;
      let idx = 0;
      while (idx < pool.length - 1 && r >= weights[idx]) {
        r -= weights[idx];
        idx++;
      }
      item = pool[idx];
    }
    this.last = itemKey(item);
    this.current = item;
    return item;
  }

  /** Meldet das Ergebnis für die aktuelle Note. */
  record(correct: boolean, timeMs: number): void {
    const item = this.current;
    if (!item) return;
    const key = itemKey(item);
    this.stats.set(key, updateStat(this.stats.get(key), item, correct, timeMs));
    if (!correct) this.retries.push({ item, due: this.turn + RETRY_GAP + 1 });
  }

  pendingRetries(): number {
    return this.retries.length;
  }
}
