// Eingabequellen sind austauschbar: Die Übung hört nur auf den InputBus.
// Version 1: Bildschirm-Tastatur. Version 2: MIDI-Keyboard (Web MIDI) meldet sich hier ebenfalls an.

export type InputSource = "screen" | "midi" | "keyboard";

export interface NoteInput {
  midi: number;
  source: InputSource;
  at: number; // performance.now()
}

type Listener = (input: NoteInput) => void;

class InputBus {
  private listeners = new Set<Listener>();

  emit(midi: number, source: InputSource): void {
    const input = { midi, source, at: performance.now() };
    for (const l of this.listeners) l(input);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const inputBus = new InputBus();

/**
 * Vorbereitung für Version 2: verbindet alle MIDI-Eingänge mit dem InputBus.
 * Läuft nur in Browsern mit Web MIDI (Chrome/Edge auf dem Mac), nicht in Safari.
 */
export async function connectMidi(): Promise<() => void> {
  const nav = navigator as Navigator & { requestMIDIAccess?: () => Promise<MIDIAccess> };
  if (!nav.requestMIDIAccess) throw new Error("Web MIDI wird von diesem Browser nicht unterstützt.");
  const access = await nav.requestMIDIAccess();
  const handler = (e: MIDIMessageEvent) => {
    const data = e.data;
    if (!data || data.length < 3) return;
    const isNoteOn = (data[0] & 0xf0) === 0x90 && data[2] > 0;
    if (isNoteOn) inputBus.emit(data[1], "midi");
  };
  const attach = () => access.inputs.forEach((input) => (input.onmidimessage = handler));
  attach();
  access.onstatechange = attach;
  return () => access.inputs.forEach((input) => (input.onmidimessage = null));
}
