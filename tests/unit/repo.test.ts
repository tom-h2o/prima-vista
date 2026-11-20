import { beforeAll, describe, expect, it } from "vitest";
import { getLevel } from "@/lib/levels";

process.env.PGLITE_DIR = "memory";
delete process.env.DATABASE_URL;

const repo = await import("@/lib/server/repo");

function round(level: number, correct: number, total = 20, mode: "count" | "timed" = "count", date = "2026-11-20") {
  const items = getLevel(level).items;
  const answers = Array.from({ length: total }, (_, i) => {
    const item = items[i % items.length];
    return { clef: item.clef, midi: item.midi, pressed: i < correct ? item.midi : item.midi + 1, timeMs: 1200 };
  });
  return repo.validateRound({ mode, level, durationMs: 90_000, completed: true, localDate: date, answers })!;
}

describe("Datenbank", () => {
  beforeAll(async () => {
    await repo.getState("2026-11-20");
  });

  it("startet mit Level 1 und Standard-Einstellungen", async () => {
    const s = await repo.getState("2026-11-20");
    expect(s.unlockedLevel).toBe(1);
    expect(s.settings.dailyGoalMinutes).toBe(5);
    expect(s.streak).toBe(0);
  });

  it("lehnt ungültige Runden ab", () => {
    expect(repo.validateRound({ mode: "x" })).toBeNull();
    expect(
      repo.validateRound({ mode: "count", level: 2, durationMs: 1, localDate: "2026-11-20", answers: [{ clef: "treble", midi: 64, pressed: 64, timeMs: 1 }] }),
    ).toBeNull();
  });

  it("schaltet das nächste Level erst ab 90 % frei", async () => {
    let r = await repo.saveRound(round(1, 17));
    expect(r.unlockedNext).toBe(false);
    expect(r.state.unlockedLevel).toBe(1);
    r = await repo.saveRound(round(1, 18));
    expect(r.unlockedNext).toBe(true);
    expect(r.state.unlockedLevel).toBe(2);
  });

  it("speichert Rekorde im Zeitmodus", async () => {
    let r = await repo.saveRound(round(2, 12, 14, "timed"));
    expect(r.newRecord).toBe(true);
    r = await repo.saveRound(round(2, 10, 12, "timed"));
    expect(r.newRecord).toBe(false);
    expect(r.previousRecord).toBe(12);
    expect(r.state.records["2"]).toBe(12);
  });

  it("führt Notenstatistik, Tagesübungszeit und Serie", async () => {
    const s = await repo.getState("2026-11-20");
    expect(s.todayMs).toBe(4 * 90_000);
    expect(s.streak).toBe(1);
    const stat = s.noteStats.find((n) => n.clef === "treble" && n.midi === 64)!;
    expect(stat.attempts).toBeGreaterThan(0);
    const stats = await repo.getStats("2026-11-20");
    expect(stats.total.attempts).toBe(20 + 20 + 14 + 12);
    expect(stats.byClef.bass.attempts).toBe(26);
    expect(stats.history).toHaveLength(1);
    expect(stats.rounds).toBe(4);
  });

  it("speichert Einstellungen mit Grenzen", async () => {
    const s = await repo.saveSettings({ dailyGoalMinutes: 500, theme: "dark", showNoteNames: true });
    expect(s.dailyGoalMinutes).toBe(120);
    expect(s.theme).toBe("dark");
    expect((await repo.getState("2026-11-20")).settings.showNoteNames).toBe(true);
  });
});
