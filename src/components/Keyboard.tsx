"use client";

import { useMemo } from "react";
import { isWhite, noteName } from "@/lib/notes";
import { inputBus } from "@/lib/input";
import { piano } from "@/lib/audio";

export type KeyMark = "correct" | "wrong" | "reveal";

interface Props {
  from: number;
  to: number;
  showNames: boolean;
  marks?: Record<number, KeyMark>;
  disabled?: boolean;
}

/** Klaviertastatur. Jede Berührung spielt den Ton und meldet die Taste an den InputBus. */
export function Keyboard({ from, to, showNames, marks = {}, disabled = false }: Props) {
  const { whites, blacks } = useMemo(() => {
    const whites: number[] = [];
    const blacks: { midi: number; left: number }[] = [];
    for (let m = from; m <= to; m++) {
      if (isWhite(m)) whites.push(m);
      else if (whites.length > 0 && m < to) blacks.push({ midi: m, left: whites.length });
    }
    return { whites, blacks };
  }, [from, to]);

  const whiteW = 100 / whites.length;
  const blackW = whiteW * 0.6;

  const press = (midi: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    piano.unlock();
    piano.play(midi);
    if (!disabled) inputBus.emit(midi, "screen");
  };

  return (
    <div className="keyboard" role="group" aria-label="Klaviertastatur" style={{ ["--white-count" as string]: whites.length }}>
      {whites.map((m) => (
        <button
          key={m}
          type="button"
          className={`key key--white ${marks[m] ? `key--${marks[m]}` : ""}`}
          data-midi={m}
          aria-label={noteName(m)}
          onPointerDown={press(m)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {(showNames || marks[m] === "reveal") && <span className="key-label">{noteName(m)}</span>}
          {m === 60 && <span className="key-dot" aria-hidden />}
        </button>
      ))}
      {blacks.map(({ midi, left }) => (
        <button
          key={midi}
          type="button"
          className={`key key--black ${marks[midi] ? `key--${marks[midi]}` : ""}`}
          data-midi={midi}
          aria-label={noteName(midi)}
          style={{ left: `${left * whiteW - blackW / 2}%`, width: `${blackW}%` }}
          onPointerDown={press(midi)}
          onContextMenu={(e) => e.preventDefault()}
        />
      ))}
    </div>
  );
}
