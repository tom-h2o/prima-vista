import { describe, expect, it } from "vitest";
import { noteName, staffPosition, isWhite, letterName } from "@/lib/notes";
import { LEVELS, keyboardRange, getLevel } from "@/lib/levels";

describe("Notennamen", () => {
  it("nutzt deutsche Schreibweise mit H und Oktavstrichen", () => {
    expect(noteName(60)).toBe("c'");
    expect(noteName(71)).toBe("h'");
    expect(noteName(84)).toBe("c'''");
    expect(noteName(48)).toBe("c");
    expect(noteName(47)).toBe("H");
    expect(noteName(36)).toBe("C");
    expect(noteName(24)).toBe("C₁");
    expect(letterName(70)).toBe("b");
    expect(letterName(66)).toBe("fis");
  });
});

describe("Position im System", () => {
  it("Violinschlüssel: e' unterste Linie, f'' oberste", () => {
    expect(staffPosition(64, "treble")).toBe(0);
    expect(staffPosition(67, "treble")).toBe(2); // g' auf der zweiten Linie
    expect(staffPosition(77, "treble")).toBe(8);
    expect(staffPosition(60, "treble")).toBe(-2); // c' auf der ersten Hilfslinie unten
  });
  it("Bassschlüssel: G unterste Linie, a oberste, f auf der vierten Linie", () => {
    expect(staffPosition(43, "bass")).toBe(0);
    expect(staffPosition(53, "bass")).toBe(6);
    expect(staffPosition(57, "bass")).toBe(8);
    expect(staffPosition(60, "bass")).toBe(10); // c' auf der ersten Hilfslinie oben
    expect(staffPosition(36, "bass")).toBe(-4);
  });
});

describe("Level", () => {
  it("haben die Töne laut Spezifikation", () => {
    const names = (id: number) => getLevel(id).items.map((i) => noteName(i.midi));
    expect(names(1)).toEqual(["e'", "f'", "g'", "a'", "h'", "c''", "d''", "e''", "f''"]);
    expect(names(2)).toEqual(["G", "H", "d", "f", "a"]);
    expect(names(3)).toEqual(["A", "c", "e", "g"]);
    expect(names(6)).toEqual(["h", "c'", "d'", "e'"]);
    expect(names(7)).toEqual(["C", "D", "E", "F"]);
    expect(names(8)).toEqual(["a", "h", "c'", "d'"]);
    expect(names(9)).toEqual(["g''", "a''", "h''", "c'''"]);
    expect(LEVELS).toHaveLength(10);
    for (const l of LEVELS) for (const i of l.items) expect(isWhite(i.midi)).toBe(true);
  });
  it("Level 10 deckt C bis c''' ab", () => {
    const midis = getLevel(10).items.map((i) => i.midi);
    expect(Math.min(...midis)).toBe(36);
    expect(Math.max(...midis)).toBe(84);
  });
  it("Tastaturausschnitt umfasst den Tonumfang", () => {
    for (const l of LEVELS) {
      const { from, to } = keyboardRange(l);
      expect(from % 12).toBe(0);
      for (const i of l.items) {
        expect(i.midi).toBeGreaterThanOrEqual(from);
        expect(i.midi).toBeLessThanOrEqual(to);
      }
    }
    expect(keyboardRange(getLevel(10))).toEqual({ from: 36, to: 84 });
    expect(keyboardRange(getLevel(7))).toEqual({ from: 36, to: 47 });
  });
});
