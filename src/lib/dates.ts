/** Lokales Datum als YYYY-MM-DD */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

/**
 * Serie: Anzahl aufeinanderfolgender Tage mit erreichtem Tagesziel.
 * Ist das Ziel heute noch nicht erreicht, zählt die Serie bis gestern weiter.
 */
export function computeStreak(daily: Map<string, number>, today: string, goalMs: number): number {
  let day = (daily.get(today) ?? 0) >= goalMs ? today : addDays(today, -1);
  let streak = 0;
  while ((daily.get(day) ?? 0) >= goalMs) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export function bestStreak(daily: Map<string, number>, goalMs: number): number {
  const days = [...daily.entries()].filter(([, ms]) => ms >= goalMs).map(([d]) => d).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}
