"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { IconBack } from "@/components/Icons";
import type { Theme } from "@/lib/types";

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
];

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const goal = settings.dailyGoalMinutes;

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <main className="page">
      <header className="topbar">
        <Link href="/" className="glass-button glass-button--icon" aria-label="Zurück">
          <IconBack />
        </Link>
        <h1>Einstellungen</h1>
      </header>

      <h2 className="section-title">Üben</h2>
      <div className="glass settings-list">
        <div className="setting">
          <div className="setting-text">
            Notennamen auf den Tasten
            <span>Deutsche Schreibweise mit H, z. B. c&apos; oder H</span>
          </div>
          <Switch label="Notennamen auf den Tasten" checked={settings.showNoteNames} onChange={(v) => updateSettings({ showNoteNames: v })} />
        </div>
        <div className="setting">
          <div className="setting-text">
            Ton
            <span>Beim Tippen erklingt die gedrückte Taste</span>
          </div>
          <Switch label="Ton" checked={settings.sound} onChange={(v) => updateSettings({ sound: v })} />
        </div>
        <div className="setting">
          <div className="setting-text">
            Tagesziel
            <span>Übungszeit pro Tag für die Serie</span>
          </div>
          <div className="stepper">
            <button type="button" aria-label="Weniger" onClick={() => updateSettings({ dailyGoalMinutes: Math.max(1, goal - 1) })}>
              −
            </button>
            <output aria-live="polite" data-testid="goal">
              {goal} Min.
            </output>
            <button type="button" aria-label="Mehr" onClick={() => updateSettings({ dailyGoalMinutes: Math.min(120, goal + 1) })}>
              +
            </button>
          </div>
        </div>
      </div>

      <h2 className="section-title">Darstellung</h2>
      <div className="glass settings-list">
        <div className="setting">
          <div className="setting-text">
            Erscheinungsbild
            <span>Folgt sonst der Einstellung des Geräts</span>
          </div>
          <div className="glass segmented" role="group" aria-label="Erscheinungsbild">
            {THEMES.map((t) => (
              <button key={t.value} type="button" aria-pressed={settings.theme === t.value} onClick={() => updateSettings({ theme: t.value })}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <h2 className="section-title">Zugang</h2>
      <div className="glass settings-list">
        <div className="setting">
          <div className="setting-text">
            Abmelden
            <span>Auf diesem Gerät</span>
          </div>
          <button type="button" className="glass-button" onClick={logout}>
            Abmelden
          </button>
        </div>
      </div>
    </main>
  );
}
