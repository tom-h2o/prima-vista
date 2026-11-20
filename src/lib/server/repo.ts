import "server-only";
import { db } from "./db";
import { updateStat } from "../adaptive";
import { computeStreak, bestStreak, addDays } from "../dates";
import { getLevel, itemKey, MAX_LEVEL, UNLOCK_THRESHOLD, FIXED_COUNT } from "../levels";
import type { Clef } from "../notes";
import {
  DEFAULT_SETTINGS,
  type AppState,
  type NoteStat,
  type RoundInput,
  type RoundResult,
  type Settings,
  type StatsSummary,
} from "../types";

interface Progress {
  unlockedLevel: number;
  records: Record<string, number>;
  settings: Settings;
}

function parseJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

async function getProgress(): Promise<Progress> {
  const q = await db();
  const [row] = await q("select unlocked_level::int as u, records, settings from progress where id = 1");
  return {
    unlockedLevel: Number(row?.u ?? 1),
    records: parseJson(row?.records, {}),
    settings: { ...DEFAULT_SETTINGS, ...parseJson<Partial<Settings>>(row?.settings, {}) },
  };
}

async function getNoteStats(): Promise<NoteStat[]> {
  const q = await db();
  const rows = await q(
    `select clef, note::int as note, attempts::int as attempts, correct::int as correct,
            total_time_ms::float8 as total, error_avg::float8 as err, time_avg::float8 as tavg
       from note_stats`,
  );
  return rows.map((r) => ({
    clef: r.clef as Clef,
    midi: Number(r.note),
    attempts: Number(r.attempts),
    correct: Number(r.correct),
    totalTimeMs: Number(r.total),
    errorAvg: Number(r.err),
    timeAvg: Number(r.tavg),
  }));
}

async function getDaily(): Promise<Map<string, number>> {
  const q = await db();
  const rows = await q("select local_date::text as d, practice_ms::float8 as ms from daily");
  return new Map(rows.map((r) => [String(r.d), Number(r.ms)]));
}

export function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function getState(today: string): Promise<AppState> {
  const [progress, noteStats, daily] = await Promise.all([getProgress(), getNoteStats(), getDaily()]);
  const goalMs = progress.settings.dailyGoalMinutes * 60_000;
  return {
    settings: progress.settings,
    unlockedLevel: progress.unlockedLevel,
    records: progress.records,
    noteStats,
    todayMs: daily.get(today) ?? 0,
    streak: computeStreak(daily, today, goalMs),
  };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = (await getProgress()).settings;
  const next: Settings = { ...current };
  if (typeof patch.showNoteNames === "boolean") next.showNoteNames = patch.showNoteNames;
  if (typeof patch.sound === "boolean") next.sound = patch.sound;
  if (typeof patch.dailyGoalMinutes === "number" && Number.isFinite(patch.dailyGoalMinutes)) {
    next.dailyGoalMinutes = Math.min(120, Math.max(1, Math.round(patch.dailyGoalMinutes)));
  }
  if (patch.theme === "system" || patch.theme === "light" || patch.theme === "dark") next.theme = patch.theme;
  const q = await db();
  await q("update progress set settings = $1::jsonb where id = 1", [JSON.stringify(next)]);
  return next;
}

export function validateRound(body: unknown): RoundInput | null {
  if (!body || typeof body !== "object") return null;
  const r = body as Record<string, unknown>;
  if (r.mode !== "count" && r.mode !== "timed") return null;
  const level = Number(r.level);
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) return null;
  if (!isValidDate(r.localDate)) return null;
  if (!Array.isArray(r.answers) || r.answers.length > 1000) return null;
  const durationMs = Math.round(Number(r.durationMs));
  if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > 3 * 3600_000) return null;
  const allowed = new Set(getLevel(level).items.map(itemKey));
  const answers = [];
  for (const a of r.answers as Record<string, unknown>[]) {
    const clef = a?.clef;
    const midi = Number(a?.midi);
    const pressed = Number(a?.pressed);
    const timeMs = Math.round(Number(a?.timeMs));
    if (clef !== "treble" && clef !== "bass") return null;
    if (!allowed.has(`${clef}:${midi}`)) return null;
    if (!Number.isInteger(pressed) || pressed < 0 || pressed > 127) return null;
    if (!Number.isFinite(timeMs) || timeMs < 0) return null;
    answers.push({ clef: clef as Clef, midi, pressed, correct: pressed === midi, timeMs: Math.min(timeMs, 600_000) });
  }
  return { mode: r.mode, level, durationMs, completed: r.completed === true, localDate: r.localDate, answers };
}

export async function saveRound(round: RoundInput): Promise<RoundResult & { state: AppState }> {
  const q = await db();
  const correctCount = round.answers.filter((a) => a.correct).length;
  const [inserted] = await q(
    `insert into rounds (local_date, mode, level, note_count, correct_count, duration_ms, completed)
     values ($1::date, $2, $3, $4, $5, $6, $7) returning id::text as id`,
    [round.localDate, round.mode, round.level, round.answers.length, correctCount, round.durationMs, round.completed],
  );
  const roundId = String(inserted.id);

  if (round.answers.length > 0) {
    const values: string[] = [];
    const params: unknown[] = [];
    round.answers.forEach((a, i) => {
      const o = i * 6;
      values.push(`($${o + 1}::bigint, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6})`);
      params.push(roundId, a.clef, a.midi, a.pressed, a.correct, a.timeMs);
    });
    await q(`insert into answers (round_id, clef, note, pressed, correct, time_ms) values ${values.join(",")}`, params);

    // Notenstatistik fortschreiben
    const stats = new Map((await getNoteStats()).map((s) => [`${s.clef}:${s.midi}`, s]));
    const touched = new Map<string, NoteStat>();
    for (const a of round.answers) {
      const key = `${a.clef}:${a.midi}`;
      const next = updateStat(touched.get(key) ?? stats.get(key), a, a.correct, a.timeMs);
      touched.set(key, next);
    }
    for (const s of touched.values()) {
      await q(
        `insert into note_stats (clef, note, attempts, correct, total_time_ms, error_avg, time_avg)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (clef, note) do update set attempts = excluded.attempts, correct = excluded.correct,
           total_time_ms = excluded.total_time_ms, error_avg = excluded.error_avg, time_avg = excluded.time_avg`,
        [s.clef, s.midi, s.attempts, s.correct, Math.round(s.totalTimeMs), s.errorAvg, s.timeAvg],
      );
    }
  }

  await q(
    `insert into daily (local_date, practice_ms) values ($1::date, $2)
     on conflict (local_date) do update set practice_ms = daily.practice_ms + excluded.practice_ms`,
    [round.localDate, round.durationMs],
  );

  const progress = await getProgress();
  let unlockedNext = false;
  let newRecord = false;
  const previousRecord = progress.records[String(round.level)] ?? null;

  if (
    round.completed &&
    round.mode === "count" &&
    round.answers.length >= FIXED_COUNT &&
    correctCount / round.answers.length >= UNLOCK_THRESHOLD &&
    round.level === progress.unlockedLevel &&
    round.level < MAX_LEVEL
  ) {
    unlockedNext = true;
    await q("update progress set unlocked_level = $1 where id = 1 and unlocked_level < $1", [round.level + 1]);
  }
  if (round.completed && round.mode === "timed" && correctCount > 0 && (previousRecord === null || correctCount > previousRecord)) {
    newRecord = true;
    const records = { ...progress.records, [String(round.level)]: correctCount };
    await q("update progress set records = $1::jsonb where id = 1", [JSON.stringify(records)]);
  }

  return { unlockedNext, newRecord, previousRecord, state: await getState(round.localDate) };
}

export async function getStats(today: string): Promise<StatsSummary> {
  const q = await db();
  const [progress, noteStats, daily] = await Promise.all([getProgress(), getNoteStats(), getDaily()]);
  const byClefRows = await q(
    `select clef, count(*)::int as n, sum(case when correct then 1 else 0 end)::int as c, avg(time_ms)::float8 as t
       from answers group by clef`,
  );
  const empty = { attempts: 0, correct: 0, avgMs: null as number | null };
  const byClef: StatsSummary["byClef"] = { treble: { ...empty }, bass: { ...empty } };
  for (const r of byClefRows) {
    byClef[r.clef as Clef] = { attempts: Number(r.n), correct: Number(r.c), avgMs: r.t == null ? null : Number(r.t) };
  }
  const totalAttempts = byClef.treble.attempts + byClef.bass.attempts;
  const totalCorrect = byClef.treble.correct + byClef.bass.correct;
  const totalTime = (byClef.treble.avgMs ?? 0) * byClef.treble.attempts + (byClef.bass.avgMs ?? 0) * byClef.bass.attempts;

  const since = addDays(today, -29);
  const historyRows = await q(
    `select r.local_date::text as d, count(a.id)::int as n,
            coalesce(sum(case when a.correct then 1 else 0 end), 0)::int as c,
            coalesce(avg(a.time_ms), 0)::float8 as t
       from rounds r left join answers a on a.round_id = r.id
      where r.local_date >= $1::date
      group by r.local_date order by r.local_date`,
    [since],
  );
  const history = historyRows.map((r) => ({
    date: String(r.d),
    attempts: Number(r.n),
    correct: Number(r.c),
    avgMs: Number(r.t),
    practiceMs: daily.get(String(r.d)) ?? 0,
  }));
  const [{ n: rounds }] = await q("select count(*)::int as n from rounds");

  const weakest = noteStats
    .filter((s) => s.attempts >= 3 && (s.errorAvg > 0.05 || s.correct < s.attempts * 0.9 || s.timeAvg > 2500))
    .sort((a, b) => b.errorAvg * 4 + b.timeAvg / 1000 - (a.errorAvg * 4 + a.timeAvg / 1000))
    .slice(0, 8);

  const goalMs = progress.settings.dailyGoalMinutes * 60_000;
  return {
    total: { attempts: totalAttempts, correct: totalCorrect, avgMs: totalAttempts ? totalTime / totalAttempts : null },
    byClef,
    history,
    weakest,
    records: progress.records,
    rounds: Number(rounds),
    streak: computeStreak(daily, today, goalMs),
    bestStreak: bestStreak(daily, goalMs),
  };
}
