"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconBack } from "@/components/Icons";
import { Staff } from "@/components/Staff";
import { localDateString, addDays } from "@/lib/dates";
import { LEVELS } from "@/lib/levels";
import { noteName, CLEF_NAME } from "@/lib/notes";
import type { StatsSummary } from "@/lib/types";

const pct = (c: number, n: number) => (n ? `${Math.round((c / n) * 100)} %` : "–");
const secs = (ms: number | null) => (ms == null ? "–" : `${(ms / 1000).toFixed(1).replace(".", ",")} s`);
const shortDate = (d: string) => {
  const [, m, day] = d.split("-");
  return `${Number(day)}.${Number(m)}.`;
};

interface Point {
  date: string;
  value: number | null;
  label: string;
}

/** Ein-Serien-Diagramm über die letzten 30 Tage: Balken oder Linie, mit Hover-Tooltip. */
function DayChart({ points, kind, max, ticks, format }: { points: Point[]; kind: "bar" | "line"; max: number; ticks: number[]; format: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 160;
  const padL = 40;
  const padB = 20;
  const innerW = W - padL;
  const innerH = H - padB - 6;
  const step = innerW / points.length;
  const y = (v: number) => 6 + innerH - (Math.min(v, max) / max) * innerH;
  const x = (i: number) => padL + step * i + step / 2;
  // Linie nur zwischen aufeinanderfolgenden Übungstagen, Lücken bleiben offen
  const segments: string[][] = [];
  points.forEach((p, i) => {
    if (p.value == null) return;
    const pt = `${x(i)},${y(p.value)}`;
    if (i > 0 && points[i - 1].value != null) segments[segments.length - 1].push(pt);
    else segments.push([pt]);
  });
  const hp = hover != null ? points[hover] : null;

  return (
    <div ref={box} style={{ position: "relative" }}>
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.floor((px - padL) / step);
          setHover(i >= 0 && i < points.length ? i : null);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={padL} x2={W} y1={y(t)} y2={y(t)} />
            <text className="axis-label" x={padL - 6} y={y(t) + 4} textAnchor="end">
              {format(t)}
            </text>
          </g>
        ))}
        {[0, Math.floor(points.length / 2), points.length - 1].map((i) => (
          <text key={i} className="axis-label" x={x(i)} y={H - 4} textAnchor="middle">
            {shortDate(points[i].date)}
          </text>
        ))}
        {hover != null && <line className="grid-line" x1={x(hover)} x2={x(hover)} y1={6} y2={6 + innerH} />}
        {kind === "bar" &&
          points.map((p, i) =>
            p.value == null ? null : (
              <path
                key={p.date}
                className="bar"
                opacity={hover == null || hover === i ? 1 : 0.55}
                d={roundedTop(x(i) - step * 0.32, y(p.value), step * 0.64, 6 + innerH - y(p.value), 4)}
              />
            ),
          )}
        {kind === "line" &&
          segments.filter((seg) => seg.length > 1).map((seg) => <polyline key={seg[0]} className="series-line" points={seg.join(" ")} />)}
      </svg>
      {kind === "line" &&
        points.map((p, i) =>
          p.value == null ? null : (
            <span
              key={p.date}
              className="chart-dot"
              style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(p.value) / H) * 100}%`, transform: `translate(-50%, -50%) scale(${hover === i ? 1.4 : 1})` }}
            />
          ),
        )}
      {hp && (
        <div className="chart-tip glass" style={{ left: `${(x(hover!) / W) * 100}%` }}>
          <strong>{shortDate(hp.date)}</strong> {hp.label}
        </div>
      )}
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/stats?today=${localDateString()}`, { cache: "no-store" })
      .then((r) => {
        if (r.status === 401) window.location.href = "/login";
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  const today = localDateString();
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  const byDay = new Map(stats?.history.map((h) => [h.date, h]));
  const accPoints: Point[] = days.map((d) => {
    const h = byDay.get(d);
    return h && h.attempts ? { date: d, value: (h.correct / h.attempts) * 100, label: `${Math.round((h.correct / h.attempts) * 100)} % richtig · ${h.attempts} Noten` } : { date: d, value: null, label: "nicht geübt" };
  });
  const timePoints: Point[] = days.map((d) => {
    const h = byDay.get(d);
    return h && h.attempts ? { date: d, value: h.avgMs / 1000, label: `Ø ${secs(h.avgMs)} · ${Math.round(h.practiceMs / 60000)} Min. geübt` } : { date: d, value: null, label: "nicht geübt" };
  });
  const maxTime = Math.max(3, Math.ceil(Math.max(0, ...timePoints.map((p) => p.value ?? 0))));
  const timeTicks = [0, Math.round(maxTime / 2), maxTime];

  return (
    <main className="page">
      <header className="topbar">
        <Link href="/" className="glass-button glass-button--icon" aria-label="Zurück">
          <IconBack />
        </Link>
        <h1>Statistik</h1>
      </header>

      {error && <div className="glass empty">Statistik konnte nicht geladen werden.</div>}
      {!stats && !error && <div className="glass empty">Lade …</div>}

      {stats && (
        <>
          <div className="stat-tiles">
            <div className="glass tile">
              <div className="tile-label">Trefferquote</div>
              <div className="tile-value" data-testid="total-accuracy">
                {pct(stats.total.correct, stats.total.attempts)}
              </div>
              <div className="tile-sub">{stats.total.attempts} Noten · {stats.rounds} Runden</div>
            </div>
            <div className="glass tile">
              <div className="tile-label">Antwortzeit</div>
              <div className="tile-value">{secs(stats.total.avgMs)}</div>
              <div className="tile-sub">im Durchschnitt</div>
            </div>
            {(["bass", "treble"] as const).map((clef) => (
              <div className="glass tile" key={clef}>
                <div className="tile-label">{CLEF_NAME[clef]}</div>
                <div className="tile-value">{pct(stats.byClef[clef].correct, stats.byClef[clef].attempts)}</div>
                <div className="tile-sub">
                  {stats.byClef[clef].attempts} Noten · Ø {secs(stats.byClef[clef].avgMs)}
                </div>
              </div>
            ))}
            <div className="glass tile">
              <div className="tile-label">Serie</div>
              <div className="tile-value">{stats.streak} {stats.streak === 1 ? "Tag" : "Tage"}</div>
              <div className="tile-sub">Bestwert: {stats.bestStreak}</div>
            </div>
          </div>

          <h2 className="section-title">Verlauf · letzte 30 Tage</h2>
          {stats.history.length === 0 ? (
            <div className="glass empty">Noch keine Runden. Los geht’s!</div>
          ) : (
            <div className="charts">
              <div className="glass chart-card">
                <h3>Trefferquote pro Tag</h3>
                <div className="chart-sub">Anteil richtiger Antworten</div>
                <DayChart points={accPoints} kind="bar" max={100} ticks={[0, 50, 100]} format={(v) => `${v} %`} />
              </div>
              <div className="glass chart-card">
                <h3>Antwortzeit pro Tag</h3>
                <div className="chart-sub">Durchschnitt in Sekunden, weniger ist besser</div>
                <DayChart points={timePoints} kind="line" max={maxTime} ticks={timeTicks} format={(v) => `${v} s`} />
              </div>
            </div>
          )}

          <h2 className="section-title">Schwächste Noten</h2>
          {stats.weakest.length === 0 ? (
            <div className="glass empty">Sobald du jede Note ein paar Mal gesehen hast, erscheinen hier deine Baustellen.</div>
          ) : (
            <div className="weak-list">
              {stats.weakest.map((n) => (
                <div className="glass weak-item" key={`${n.clef}:${n.midi}`}>
                  <Staff clef={n.clef} midi={n.midi} compact />
                  <div>
                    <strong>{noteName(n.midi)}</strong>
                    <span>
                      {pct(n.correct, n.attempts)} · Ø {secs(n.totalTimeMs / n.attempts)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="section-title">Rekorde im Zeitmodus</h2>
          {Object.keys(stats.records).length === 0 ? (
            <div className="glass empty">Noch keine Rekorde – probier den 60-Sekunden-Modus.</div>
          ) : (
            <div className="glass records">
              {LEVELS.filter((l) => stats.records[String(l.id)]).map((l) => (
                <div className="records-row" key={l.id}>
                  <span>
                    Level {l.id} · {l.title} ({l.clefLabel})
                  </span>
                  <strong>{stats.records[String(l.id)]} Noten</strong>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
