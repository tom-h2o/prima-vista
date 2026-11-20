"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { ClefMark } from "@/components/Splash";
import { Staff } from "@/components/Staff";
import { IconChart, IconFlame, IconGear, IconLock } from "@/components/Icons";
import { LEVELS, FIXED_COUNT, TIMED_SECONDS } from "@/lib/levels";
import type { Mode } from "@/lib/types";

function GoalRing({ value, goal }: { value: number; goal: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, goal > 0 ? value / goal : 0);
  const done = frac >= 1;
  return (
    <svg className="goal-ring" viewBox="0 0 74 74" role="img" aria-label={`Tagesziel ${Math.round(frac * 100)} %`}>
      <circle className="ring-track" cx="37" cy="37" r={r} />
      <circle
        className={`ring-value ${done ? "ring-value--done" : ""}`}
        cx="37"
        cy="37"
        r={r}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
        transform="rotate(-90 37 37)"
      />
      <text x="37" y="44" textAnchor="middle">
        {done ? "✓" : Math.floor(value / 60000)}
      </text>
    </svg>
  );
}

const MODE_KEY = "pv-mode";

export default function Home() {
  const { state, settings } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("count");

  useEffect(() => {
    try {
      const m = localStorage.getItem(MODE_KEY);
      if (m === "count" || m === "timed") setMode(m);
    } catch {}
  }, []);
  const chooseMode = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
  };

  const unlocked = state?.unlockedLevel ?? 1;
  const goalMs = settings.dailyGoalMinutes * 60_000;
  const todayMs = state?.todayMs ?? 0;
  const minutes = Math.floor(todayMs / 60000);
  const streak = state?.streak ?? 0;
  const done = todayMs >= goalMs;

  return (
    <main className="page">
      <header className="topbar">
        <h1>
          <ClefMark className="brand-clef" />
          Prima Vista
        </h1>
        <div className="topbar-actions">
          <Link href="/statistik" className="glass-button glass-button--icon" aria-label="Statistik">
            <IconChart />
          </Link>
          <Link href="/einstellungen" className="glass-button glass-button--icon" aria-label="Einstellungen">
            <IconGear />
          </Link>
        </div>
      </header>

      <section className="glass home-hero" aria-label="Tagesziel">
        <GoalRing value={todayMs} goal={goalMs} />
        <div className="hero-text">
          <h2>{done ? "Tagesziel erreicht" : "Tagesziel"}</h2>
          <p>
            {minutes} von {settings.dailyGoalMinutes} Min. geübt
            {!done && todayMs > 0 ? ` – noch ${Math.max(1, Math.ceil((goalMs - todayMs) / 60000))} Min.` : ""}
          </p>
        </div>
        <div className={`streak ${streak === 0 ? "streak--off" : ""}`} title="Tage in Folge mit erreichtem Tagesziel">
          <IconFlame />
          {streak} {streak === 1 ? "Tag" : "Tage"}
        </div>
      </section>

      <div className="mode-row">
        <h2 className="section-title">Level</h2>
        <div className="glass segmented" role="group" aria-label="Modus">
          <button type="button" aria-pressed={mode === "count"} onClick={() => chooseMode("count")}>
            {FIXED_COUNT} Noten
          </button>
          <button type="button" aria-pressed={mode === "timed"} onClick={() => chooseMode("timed")}>
            {TIMED_SECONDS} Sekunden
          </button>
        </div>
      </div>

      <div className="levels">
        {LEVELS.map((level) => {
          const locked = level.id > unlocked;
          const sample = level.items[Math.floor(level.items.length / 2)];
          const record = state?.records[String(level.id)];
          return (
            <button
              key={level.id}
              type="button"
              className={`glass level-card ${locked ? "level-card--locked" : ""} ${level.id === unlocked ? "level-card--current" : ""}`}
              disabled={locked}
              aria-label={`Level ${level.id}: ${level.title}${locked ? " (gesperrt)" : ""}`}
              onClick={() => router.push(`/ueben?level=${level.id}&modus=${mode === "count" ? "anzahl" : "zeit"}`)}
            >
              <Staff className="level-staff" clef={sample.clef} midi={sample.midi} compact />
              <span className="level-num">Level {level.id} · {level.clefLabel}</span>
              <span className="level-title">{level.title}</span>
              <span className="level-meta">{level.range}</span>
              {locked ? (
                <IconLock className="lock" />
              ) : mode === "timed" && record ? (
                <span className="badge" title="Rekord">{record} ★</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </main>
  );
}
