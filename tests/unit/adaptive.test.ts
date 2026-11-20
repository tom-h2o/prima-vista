import { describe, expect, it } from "vitest";
import { NotePicker, noteWeight, RETRY_GAP } from "@/lib/adaptive";
import { getLevel, itemKey } from "@/lib/levels";
import type { NoteStat } from "@/lib/types";

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe("NotePicker", () => {
  it("zieht nie dieselbe Note zweimal hintereinander", () => {
    const picker = new NotePicker(getLevel(3).items, [], seeded(1));
    let last = "";
    for (let i = 0; i < 500; i++) {
      const k = itemKey(picker.next());
      expect(k).not.toBe(last);
      last = k;
      picker.record(i % 3 !== 0, 1000);
    }
  });

  it("bringt falsch beantwortete Noten nach ein paar Zügen zurück, bis sie sitzen", () => {
    const picker = new NotePicker(getLevel(4).items, [], seeded(7));
    const first = picker.next();
    picker.record(false, 2000);
    const seen: string[] = [];
    for (let i = 0; i < RETRY_GAP + 1; i++) {
      seen.push(itemKey(picker.next()));
      picker.record(true, 800);
    }
    expect(seen[RETRY_GAP]).toBe(itemKey(first));
    expect(picker.pendingRetries()).toBe(0);
  });

  it("zieht schwache Noten häufiger", () => {
    const items = getLevel(2).items;
    const weak = items[0];
    const stats: NoteStat[] = items.map((i) => ({
      clef: i.clef,
      midi: i.midi,
      attempts: 20,
      correct: i === weak ? 8 : 20,
      totalTimeMs: 20000,
      errorAvg: i === weak ? 0.6 : 0,
      timeAvg: i === weak ? 3500 : 900,
    }));
    expect(noteWeight(stats[0])).toBeGreaterThan(noteWeight(stats[1]) * 3);
    const picker = new NotePicker(items, stats, seeded(3));
    const counts = new Map<string, number>();
    for (let i = 0; i < 2000; i++) {
      const k = itemKey(picker.next());
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const weakCount = counts.get(itemKey(weak)) ?? 0;
    const other = counts.get(itemKey(items[1])) ?? 0;
    expect(weakCount).toBeGreaterThan(other * 2);
  });
});
