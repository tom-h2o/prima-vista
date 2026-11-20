import { describe, expect, it } from "vitest";
import { addDays, computeStreak, bestStreak } from "@/lib/dates";

describe("Serie", () => {
  const goal = 5 * 60_000;
  it("zählt Tage in Folge mit erreichtem Ziel", () => {
    const d = new Map([
      ["2026-11-17", goal],
      ["2026-11-18", goal + 1],
      ["2026-11-19", goal * 2],
      ["2026-11-20", goal],
    ]);
    expect(computeStreak(d, "2026-11-20", goal)).toBe(4);
  });
  it("läuft weiter, wenn heute noch nicht geübt wurde", () => {
    const d = new Map([
      ["2026-11-18", goal],
      ["2026-11-19", goal],
      ["2026-11-20", 1000],
    ]);
    expect(computeStreak(d, "2026-11-20", goal)).toBe(2);
  });
  it("reißt bei einem Tag ohne Ziel ab", () => {
    const d = new Map([
      ["2026-11-17", goal],
      ["2026-11-19", goal],
    ]);
    expect(computeStreak(d, "2026-11-20", goal)).toBe(1);
    expect(computeStreak(d, "2026-11-21", goal)).toBe(0);
    expect(bestStreak(d, goal)).toBe(1);
  });
  it("addDays über Monatsgrenzen", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
