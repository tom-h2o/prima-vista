// Klavierton über Web Audio mit Samples (Salamander Grand Piano, über tonejs-instruments).
// Alle kleinen Terzen ein Sample, dazwischen wird per playbackRate transponiert.
// Auf dem iPhone startet Audio erst nach der ersten Berührung (unlock()).

const SAMPLE_NAMES = ["C", "Ds", "Fs", "A"];
const SAMPLE_PCS = [0, 3, 6, 9];
const OCTAVES = [2, 3, 4, 5, 6];

interface Sample {
  midi: number;
  url: string;
}

const SAMPLES: Sample[] = OCTAVES.flatMap((o) =>
  SAMPLE_NAMES.map((n, i) => ({ midi: (o + 1) * 12 + SAMPLE_PCS[i], url: `/samples/${n}${o}.mp3` })),
);

class PianoAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<number, AudioBuffer>();
  private loading: Promise<void> | null = null;
  muted = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      // iOS: Ton auch bei aktivem Stummschalter des Geräts (Safari 17+)
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) {
        try {
          nav.audioSession.type = "playback";
        } catch {}
      }
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Lädt alle Samples (darf vor der ersten Berührung passieren). */
  preload(): Promise<void> {
    if (this.loading) return this.loading;
    const ctx = this.ensureContext();
    if (!ctx) return Promise.resolve();
    this.loading = Promise.all(
      SAMPLES.map(async (s) => {
        try {
          const res = await fetch(s.url);
          const data = await res.arrayBuffer();
          const buf = await ctx.decodeAudioData(data);
          this.buffers.set(s.midi, buf);
        } catch {
          /* einzelnes Sample fehlt: nächstes wird transponiert */
        }
      }),
    ).then(() => undefined);
    return this.loading;
  }

  /** Muss in einem Berührungs-/Klick-Handler aufgerufen werden. */
  unlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state !== "running") void ctx.resume();
    // stiller Puffer, damit iOS den Audiokanal freigibt
    const b = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.connect(ctx.destination);
    src.start(0);
    void this.preload();
  }

  play(midi: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    if (ctx.state !== "running") void ctx.resume();
    let best: number | null = null;
    for (const m of this.buffers.keys()) {
      if (best === null || Math.abs(m - midi) < Math.abs(best - midi) || (Math.abs(m - midi) === Math.abs(best - midi) && m < best)) best = m;
    }
    if (best === null) {
      this.synth(ctx, midi);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.buffers.get(best)!;
    src.playbackRate.value = Math.pow(2, (midi - best) / 12);
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.setTargetAtTime(0, now + 1.6, 0.35);
    src.connect(gain).connect(this.master);
    src.start(now);
    src.stop(now + 3);
  }

  /** Ersatzklang, solange die Samples noch laden. */
  private synth(ctx: AudioContext, midi: number) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    gain.connect(this.master!);
    [1, 2, 3].forEach((h, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * h;
      const g = ctx.createGain();
      g.gain.value = [1, 0.35, 0.12][i];
      osc.connect(g).connect(gain);
      osc.start(now);
      osc.stop(now + 1.5);
    });
  }
}

export const piano = new PianoAudio();
