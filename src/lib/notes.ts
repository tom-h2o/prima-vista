// Noten als MIDI-Nummern (c' = 60). Deutsche Schreibweise mit H.

export type Clef = "treble" | "bass";

const LETTERS = ["c", "d", "e", "f", "g", "a", "h"] as const;
const PC_TO_LETTER: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
const BLACK_NAMES: Record<number, string> = { 1: "cis", 3: "dis", 6: "fis", 8: "gis", 10: "b" };

export function isWhite(midi: number): boolean {
  return PC_TO_LETTER[((midi % 12) + 12) % 12] !== undefined;
}

/** Diatonischer Index (nur weiße Tasten): c' = 35 */
export function diatonic(midi: number): number {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const letter = PC_TO_LETTER[pc];
  if (letter === undefined) throw new Error(`Keine Stammnote: ${midi}`);
  return octave * 7 + letter;
}

/** Deutscher Notenname mit Oktavbezeichnung: C₁, C, c, c', c'', c''' */
export function noteName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const base = PC_TO_LETTER[pc] !== undefined ? LETTERS[PC_TO_LETTER[pc]] : BLACK_NAMES[pc];
  const octave = Math.floor(midi / 12) - 1; // wissenschaftliche Oktave: c' = 4
  if (octave <= 2) {
    const upper = base.charAt(0).toUpperCase() + base.slice(1);
    if (octave === 2) return upper;
    return upper + ["₁", "₂", "₃"][Math.min(2, 1 - octave)];
  }
  return base + "'".repeat(octave - 3);
}

/** Kurzer Name ohne Oktave, z. B. für Tastenbeschriftung */
export function letterName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  return PC_TO_LETTER[pc] !== undefined ? LETTERS[PC_TO_LETTER[pc]] : BLACK_NAMES[pc];
}

export const CLEF_BOTTOM_LINE: Record<Clef, number> = { treble: 64, bass: 43 }; // e' bzw. G

/** Position im System: 0 = unterste Linie, 1 = erster Zwischenraum, …, 8 = oberste Linie */
export function staffPosition(midi: number, clef: Clef): number {
  return diatonic(midi) - diatonic(CLEF_BOTTOM_LINE[clef]);
}

export const CLEF_NAME: Record<Clef, string> = { treble: "Violinschlüssel", bass: "Bassschlüssel" };

/** Alle weißen Tasten von a bis b (einschließlich) */
export function whiteRange(from: number, to: number): number[] {
  const out: number[] = [];
  for (let m = from; m <= to; m++) if (isWhite(m)) out.push(m);
  return out;
}

/** Linien-Noten bzw. Zwischenraum-Noten eines Bereichs */
export function onLines(notes: number[], clef: Clef): number[] {
  return notes.filter((n) => staffPosition(n, clef) % 2 === 0);
}
export function inSpaces(notes: number[], clef: Clef): number[] {
  return notes.filter((n) => Math.abs(staffPosition(n, clef)) % 2 === 1);
}
