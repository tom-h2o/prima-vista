"use client";

import { useEffect, useState } from "react";
import { fClef } from "@/lib/glyphs";

/** Startanimation: Der Bassschlüssel zeichnet sich selbst. Einmal pro App-Start. */
export function Splash() {
  const [phase, setPhase] = useState<"draw" | "fade" | "done">("draw");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("pv-splash") === "1";
      sessionStorage.setItem("pv-splash", "1");
    } catch {}
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || navigator.webdriver) {
      setPhase("done");
      return;
    }
    const t1 = setTimeout(() => setPhase("fade"), reduced ? 500 : 1900);
    const t2 = setTimeout(() => setPhase("done"), reduced ? 800 : 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "done") return null;
  const w = fClef.x2 - fClef.x1;
  const h = fClef.y2 - fClef.y1;
  return (
    <div className={`splash ${phase === "fade" ? "splash--fade" : ""}`} aria-hidden>
      <svg className="splash-clef" viewBox={`${fClef.x1 - 0.2} ${fClef.y1 - 0.2} ${w + 0.4} ${h + 0.4}`}>
        <path d={fClef.d} pathLength={1} />
      </svg>
      <div className="splash-title">Prima Vista</div>
    </div>
  );
}

export function ClefMark({ className }: { className?: string }) {
  const w = fClef.x2 - fClef.x1;
  const h = fClef.y2 - fClef.y1;
  return (
    <svg className={className} viewBox={`${fClef.x1} ${fClef.y1} ${w} ${h}`} aria-hidden>
      <path d={fClef.d} fill="currentColor" />
    </svg>
  );
}
