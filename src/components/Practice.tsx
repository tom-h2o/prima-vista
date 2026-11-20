"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./AppProvider";
import { Keyboard, type KeyMark } from "./Keyboard";
import { Staff, type NoteState } from "./Staff";
import { IconCheck, IconClose, IconMute, IconRotate, IconSound } from "./Icons";
import { NotePicker } from "@/lib/adaptive";
import { inputBus, type NoteInput } from "@/lib/input";
import { FIXED_COUNT, getLevel, keyboardRange, MAX_LEVEL, TIMED_SECONDS, UNLOCK_THRESHOLD, type NoteItem } from "@/lib/levels";
import { noteName, staffPosition } from "@/lib/notes";
import { localDateString } from "@/lib/dates";
import { piano } from "@/lib/audio";
import type { Answer, Mode, RoundResult } from "@/lib/types";

const CORRECT_DELAY = 220;
const WRONG_DELAY = 1500;
const MAX_ANSWER_MS = 15000;

type Phase = "ready" | "running" | "saving" | "done";

interface Feedback {
  correct: boolean;
  pressed: number;
}

interface Summary {
  answers: Answer[];
  durationMs: number;
  result: RoundResult | null;
}

export function Practice({ levelId, mode }: { levelId: number; mode: Mode }) {
  const router = useRouter();
  const { state, settings, updateSettings, submitRound } = useApp();
  const level = getLevel(levelId);
  const range = useMemo(() => keyboardRange(level), [level]);
  const span = useMemo(() => {
    const pos = level.items.map((i) => staffPosition(i.midi, i.clef));
    return { low: Math.min(...pos), high: Math.max(...pos) };
  }, [level]);

  const [phase, setPhase] = useState<Phase>("ready");
  const [current, setCurrent] = useState<NoteItem | null>(null);
  const [turn, setTurn] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [remainingMs, setRemainingMs] = useState(TIMED_SECONDS * 1000);
  const [summary, setSummary] = useState<Summary | null>(null);

  const picker = useRef<NotePicker | null>(null);
  const answers = useRef<Answer[]>([]);
  const shownAt = useRef(0);
  const startedAt = useRef(0);
  const locked = useRef(true);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const showNext = useCallback(() => {
    if (!picker.current) return;
    const item = picker.current.next();
    setCurrent(item);
    setFeedback(null);
    setTurn((t) => t + 1);
    shownAt.current = performance.now();
    locked.current = false;
  }, []);

  const finish = useCallback(
    async (completed: boolean) => {
      if (finished.current) return;
      finished.current = true;
      locked.current = true;
      timers.current.forEach(clearTimeout);
      const durationMs = mode === "timed" && completed ? TIMED_SECONDS * 1000 : Math.round(performance.now() - startedAt.current);
      const list = answers.current;
      if (!completed && list.length === 0) return;
      setPhase("saving");
      const result = await submitRound({
        mode,
        level: levelId,
        durationMs,
        completed,
        localDate: localDateString(),
        answers: list,
      });
      setSummary({ answers: list, durationMs, result });
      setPhase("done");
    },
    [levelId, mode, submitRound],
  );

  const start = () => {
    piano.unlock();
    picker.current = new NotePicker(level.items, state?.noteStats ?? []);
    answers.current = [];
    finished.current = false;
    setAnsweredCount(0);
    setCorrectCount(0);
    setSummary(null);
    setRemainingMs(TIMED_SECONDS * 1000);
    startedAt.current = performance.now();
    setPhase("running");
    showNext();
  };

  // Antworten über den InputBus (Bildschirm-Tastatur, später MIDI)
  useEffect(() => {
    if (phase !== "running") return;
    return inputBus.subscribe((input: NoteInput) => {
      if (locked.current || !picker.current?.current) return;
      locked.current = true;
      const item = picker.current.current;
      const correct = input.midi === item.midi;
      const timeMs = Math.min(MAX_ANSWER_MS, Math.round(input.at - shownAt.current));
      picker.current.record(correct, timeMs);
      answers.current.push({ clef: item.clef, midi: item.midi, pressed: input.midi, correct, timeMs });
      setAnsweredCount(answers.current.length);
      if (correct) setCorrectCount((c) => c + 1);
      setFeedback({ correct, pressed: input.midi });

      const roundOver = mode === "count" && answers.current.length >= FIXED_COUNT;
      later(() => (roundOver ? void finish(true) : showNext()), correct ? CORRECT_DELAY : WRONG_DELAY);
    });
  }, [phase, mode, finish, showNext]);

  // Zeitmodus: Countdown
  useEffect(() => {
    if (phase !== "running" || mode !== "timed") return;
    const id = window.setInterval(() => {
      const left = TIMED_SECONDS * 1000 - (performance.now() - startedAt.current);
      setRemainingMs(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(id);
        void finish(true);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, mode, finish]);

  const close = async () => {
    if (phase === "running") await finish(false);
    router.push("/");
  };

  const marks: Record<number, KeyMark> = {};
  let noteState: NoteState = "idle";
  if (feedback && current) {
    if (feedback.correct) {
      marks[feedback.pressed] = "correct";
      noteState = "correct";
    } else {
      marks[feedback.pressed] = "wrong";
      marks[current.midi] = "reveal";
      noteState = "wrong";
    }
  }

  const displayClef = current?.clef ?? level.items[0].clef;
  const modeLabel = mode === "count" ? `${FIXED_COUNT} Noten` : `${TIMED_SECONDS} Sekunden`;

  return (
    <div className="practice" data-phase={phase}>
      <div className="practice-bar">
        <button type="button" className="glass-button glass-button--icon" aria-label="Übung beenden" onClick={close}>
          <IconClose />
        </button>
        <div className="glass info">
          <span className="label">Level {level.id}</span>
          {mode === "count" ? (
            <>
              <div className="progress" aria-hidden>
                <div style={{ width: `${(answeredCount / FIXED_COUNT) * 100}%` }} />
              </div>
              <span className="count" data-testid="progress">
                {answeredCount} / {FIXED_COUNT}
              </span>
            </>
          ) : (
            <>
              <div className="progress progress--time" aria-hidden>
                <div style={{ width: `${(remainingMs / (TIMED_SECONDS * 1000)) * 100}%` }} />
              </div>
              <span className="count" data-testid="timer">
                {Math.ceil(remainingMs / 1000)} s
              </span>
              <span className="score" data-testid="score">
                ✓ {correctCount}
              </span>
            </>
          )}
        </div>
        <button
          type="button"
          className="glass-button glass-button--icon"
          aria-label={settings.sound ? "Ton ausschalten" : "Ton einschalten"}
          aria-pressed={!settings.sound}
          onClick={() => updateSettings({ sound: !settings.sound })}
        >
          {settings.sound ? <IconSound /> : <IconMute />}
        </button>
      </div>

      <div className="glass stage">
        <Staff clef={displayClef} midi={current?.midi ?? null} state={noteState} noteKey={turn} span={span} />
        {feedback && (
          <div className="stage-feedback" aria-live="polite">
            {feedback.correct ? (
              <IconCheck className="feedback-check" />
            ) : (
              <div className="feedback-wrong" data-testid="wrong-feedback">
                Richtig ist
                <strong>{current ? noteName(current.midi) : ""}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      <Keyboard from={range.from} to={range.to} showNames={settings.showNoteNames} marks={marks} disabled={phase !== "running"} />

      {phase === "ready" && (
        <div className="overlay">
          <div className="glass card">
            <h2>
              Level {level.id}: {level.title}
            </h2>
            <p>
              {level.clefLabel === "Beide" ? "Bass- und Violinschlüssel" : `${level.clefLabel}schlüssel`} · {level.range}
            </p>
            <p>
              {mode === "count"
                ? `${FIXED_COUNT} Noten. Ab ${Math.round(UNLOCK_THRESHOLD * 100)} % öffnet sich das nächste Level.`
                : `${TIMED_SECONDS} Sekunden – so viele richtige Noten wie möglich.`}
            </p>
            <div className="actions">
              <button type="button" className="glass-button" onClick={() => router.push("/")}>
                Zurück
              </button>
              <button type="button" className="glass-button glass-button--primary" onClick={start} autoFocus>
                Start · {modeLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "saving" && <div className="overlay" />}

      {phase === "done" && summary && (
        <Results
          levelId={level.id}
          mode={mode}
          summary={summary}
          records={state?.records ?? {}}
          nextUnlocked={level.id < MAX_LEVEL && (state?.unlockedLevel ?? 1) > level.id}
          onAgain={start}
          onNext={() => router.push(`/ueben?level=${level.id + 1}&modus=${mode === "count" ? "anzahl" : "zeit"}`)}
          onHome={() => router.push("/")}
        />
      )}

      <div className="rotate-hint" role="alert">
        <IconRotate />
        <p>Bitte dreh dein Gerät ins Querformat.</p>
      </div>
    </div>
  );
}

function Results({
  levelId,
  mode,
  summary,
  records,
  nextUnlocked,
  onAgain,
  onNext,
  onHome,
}: {
  levelId: number;
  mode: Mode;
  summary: Summary;
  records: Record<string, number>;
  nextUnlocked: boolean;
  onAgain: () => void;
  onNext: () => void;
  onHome: () => void;
}) {
  const total = summary.answers.length;
  const correct = summary.answers.filter((a) => a.correct).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const avg = total ? summary.answers.reduce((s, a) => s + a.timeMs, 0) / total / 1000 : 0;
  const mistakes = summary.answers.filter((a) => !a.correct);
  const unique = Array.from(new Map(mistakes.map((m) => [`${m.clef}:${m.midi}`, m])).values()).slice(0, 8);
  const result = summary.result;
  const record = records[String(levelId)];

  return (
    <div className="overlay">
      <div className="glass card" data-testid="results">
        {mode === "count" ? (
          <>
            <h2>Runde geschafft</h2>
            <div className="big-number" data-testid="result-score">
              {correct} / {total}
            </div>
            <div className="result-grid">
              <div>
                <strong>{pct} %</strong>richtig
              </div>
              <div>
                <strong>{avg.toFixed(1).replace(".", ",")} s</strong>pro Note
              </div>
            </div>
            {result?.unlockedNext ? (
              <div className="note-banner note-banner--good">Level {levelId + 1} ist freigeschaltet!</div>
            ) : pct < UNLOCK_THRESHOLD * 100 && levelId < MAX_LEVEL ? (
              <div className="note-banner note-banner--hint">Mit {Math.round(UNLOCK_THRESHOLD * 100)} % öffnet sich das nächste Level.</div>
            ) : null}
          </>
        ) : (
          <>
            <h2>Zeit um</h2>
            <div className="big-number" data-testid="result-score">
              {correct}
            </div>
            <p>richtige Noten in {TIMED_SECONDS} Sekunden</p>
            <div className="result-grid">
              <div>
                <strong>{pct} %</strong>Treffer
              </div>
              <div>
                <strong>{record ?? correct}</strong>Rekord
              </div>
            </div>
            {result?.newRecord && (
              <div className="note-banner note-banner--good">
                Neuer Rekord!{result.previousRecord ? ` Bisher: ${result.previousRecord}` : ""}
              </div>
            )}
          </>
        )}
        {!result && <div className="note-banner note-banner--hint">Offline gespeichert – wird später übertragen.</div>}
        {unique.length > 0 && (
          <>
            <p style={{ marginTop: 14 }}>Daran arbeiten:</p>
            <div className="mistakes">
              {unique.map((m) => (
                <div className="mistake" key={`${m.clef}:${m.midi}`}>
                  <Staff clef={m.clef} midi={m.midi} compact />
                  {noteName(m.midi)}
                </div>
              ))}
            </div>
          </>
        )}
        <div className="actions">
          <button type="button" className="glass-button" onClick={onHome}>
            Übersicht
          </button>
          <button type="button" className="glass-button" onClick={onAgain}>
            Nochmal
          </button>
          {nextUnlocked && (
            <button type="button" className="glass-button glass-button--primary" onClick={onNext}>
              Level {levelId + 1}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
