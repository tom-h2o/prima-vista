import { type Clef, whiteRange, onLines, inSpaces } from "./notes";

export interface NoteItem {
  clef: Clef;
  midi: number;
}

export interface Level {
  id: number;
  title: string;
  clefLabel: string;
  range: string;
  items: NoteItem[];
}

const t = (notes: number[]): NoteItem[] => notes.map((midi) => ({ clef: "treble", midi }));
const b = (notes: number[]): NoteItem[] => notes.map((midi) => ({ clef: "bass", midi }));

const TREBLE_STAFF = whiteRange(64, 77); // e' – f''
const BASS_STAFF = whiteRange(43, 57); // G – a

export const LEVELS: Level[] = [
  { id: 1, title: "Noten im System", clefLabel: "Violin", range: "e' bis f''", items: t(TREBLE_STAFF) },
  { id: 2, title: "Noten auf den Linien", clefLabel: "Bass", range: "G, H, d, f, a", items: b(onLines(BASS_STAFF, "bass")) },
  { id: 3, title: "Noten in den Zwischenräumen", clefLabel: "Bass", range: "A, c, e, g", items: b(inSpaces(BASS_STAFF, "bass")) },
  { id: 4, title: "Komplettes System", clefLabel: "Bass", range: "G bis a", items: b(BASS_STAFF) },
  { id: 5, title: "Systeme gemischt", clefLabel: "Beide", range: "wie Level 1 und 4", items: [...t(TREBLE_STAFF), ...b(BASS_STAFF)] },
  { id: 6, title: "Hilfslinien oberhalb", clefLabel: "Bass", range: "h bis e'", items: b(whiteRange(59, 64)) },
  { id: 7, title: "Hilfslinien unterhalb", clefLabel: "Bass", range: "C bis F", items: b(whiteRange(36, 41)) },
  { id: 8, title: "Hilfslinien unterhalb", clefLabel: "Violin", range: "a bis d'", items: t(whiteRange(57, 62)) },
  { id: 9, title: "Hilfslinien oberhalb", clefLabel: "Violin", range: "g'' bis c'''", items: t(whiteRange(79, 84)) },
  { id: 10, title: "Alles gemischt", clefLabel: "Beide", range: "C bis c'''", items: [...b(whiteRange(36, 64)), ...t(whiteRange(57, 84))] },
];

export const MAX_LEVEL = LEVELS.length;

export function getLevel(id: number): Level {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Unbekanntes Level ${id}`);
  return level;
}

export function itemKey(item: NoteItem): string {
  return `${item.clef}:${item.midi}`;
}

/** Tastaturausschnitt: vom c unterhalb des tiefsten Tons bis zum h oberhalb des höchsten (bzw. bis zum höchsten c). */
export function keyboardRange(level: Level): { from: number; to: number } {
  const notes = level.items.map((i) => i.midi);
  const min = Math.min(...notes);
  const max = Math.max(...notes);
  const from = min - (min % 12);
  const to = max % 12 === 0 ? max : max - (max % 12) + 11;
  return { from, to };
}

export const UNLOCK_THRESHOLD = 0.9;
export const FIXED_COUNT = 20;
export const TIMED_SECONDS = 60;
