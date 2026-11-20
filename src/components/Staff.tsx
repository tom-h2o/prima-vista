import { fClef, gClef, noteheadWhole } from "@/lib/glyphs";
import { type Clef, staffPosition } from "@/lib/notes";

export type NoteState = "idle" | "correct" | "wrong";

interface Props {
  clef: Clef;
  midi: number | null;
  state?: NoteState;
  /** wechselt bei jeder neuen Note, damit die Einblend-Animation neu startet */
  noteKey?: string | number;
  compact?: boolean;
  className?: string;
  /** Positionsbereich, der sichtbar sein soll (0 = unterste Linie); bestimmt den Bildausschnitt */
  span?: { low: number; high: number };
}

const LINE = 0.13;
const LEDGER = 0.16;

/** Notensystem mit Schlüssel und einer ganzen Note. Einheiten: Linienabstände, y = 0 oberste Linie. */
export function Staff({ clef, midi, state = "idle", noteKey, compact = false, className, span }: Props) {
  const width = compact ? 9 : 12;
  const noteX = compact ? 5.6 : 7.6;
  const pos = midi === null ? null : staffPosition(midi, clef);
  const low = Math.min(0, span?.low ?? (compact && pos !== null ? pos : -5));
  const high = Math.max(8, span?.high ?? (compact && pos !== null ? pos : 13));
  const top = Math.min(-1.9, 4 - high / 2 - 0.9);
  const height = Math.max(6.2, 4 - low / 2 + 0.9) - top;
  const headW = noteheadWhole.x2 - noteheadWhole.x1;

  const y = pos === null ? 0 : 4 - pos / 2;
  const ledgers: number[] = [];
  if (pos !== null) {
    for (let p = -2; p >= pos; p -= 2) ledgers.push(4 - p / 2);
    for (let p = 10; p <= pos; p += 2) ledgers.push(4 - p / 2);
  }

  const clefGlyph = clef === "treble" ? gClef : fClef;
  const clefY = clef === "treble" ? 3 : 1;

  return (
    <svg
      className={`staff ${className ?? ""}`}
      viewBox={`0 ${top} ${width} ${height}`}
      role="img"
      aria-label={clef === "treble" ? "Violinschlüssel" : "Bassschlüssel"}
      data-clef={clef}
      data-midi={midi ?? ""}
    >
      <g className="staff-lines">
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={0.2} x2={width - 0.2} y1={i} y2={i} strokeWidth={LINE} />
        ))}
      </g>
      <path className="staff-clef" d={clefGlyph.d} transform={`translate(0.7 ${clefY})`} />
      {pos !== null && (
        <g key={noteKey} className={`staff-note staff-note--${state}`}>
          {ledgers.map((ly) => (
            <line
              key={ly}
              className="staff-ledger"
              x1={noteX - headW / 2 - 0.4}
              x2={noteX + headW / 2 + 0.4}
              y1={ly}
              y2={ly}
              strokeWidth={LEDGER}
            />
          ))}
          <path d={noteheadWhole.d} transform={`translate(${noteX - headW / 2} ${y})`} />
        </g>
      )}
    </svg>
  );
}
