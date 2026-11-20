# Prima Vista

Persönliche Web-App zum Training des Notenlesens am Klavier – Schwerpunkt Bassschlüssel, dazu Violinschlüssel mit Hilfslinien. Läuft auf dem iPhone als Web-App vom Home-Bildschirm und auf dem MacBook im Browser.

## Funktionen (Version 1)

- Einzelne Noten im Bass- und Violinschlüssel, mit und ohne Hilfslinien
- Antwort über eine Bildschirm-Tastatur; es zählt die exakte Taste inklusive Oktave
- Ton beim Tippen (Klavier-Samples), Stummschalter in der Übung und in den Einstellungen
- Zwei Modi: **20 Noten** (Trefferquote und Antwortzeit) und **60 Sekunden** (richtige Noten, Rekord pro Level)
- 10 Level, die sich nacheinander öffnen: Eine 20-Noten-Runde mit mindestens 90 % schaltet das nächste frei
- Adaptives Üben: fehleranfällige und langsame Noten kommen häufiger, falsche Noten kehren nach drei Zügen zurück, bis sie sitzen, keine Note zweimal direkt hintereinander
- Statistik: Trefferquote und Antwortzeit gesamt und pro Schlüssel, Verlauf der letzten 30 Tage, schwächste Noten, Rekorde
- Tagesziel (Standard 5 Minuten) und Serie
- Ein App-Passwort, Fortschritt in Postgres (Neon) – auf allen Geräten gleich
- Hell- und Dunkelmodus (folgt dem System oder von Hand), Startanimation mit Bassschlüssel

## Level

| Level | Schlüssel | Inhalt | Tonumfang |
| --- | --- | --- | --- |
| 1 | Violin | Noten im System | e' bis f'' |
| 2 | Bass | Noten auf den Linien | G, H, d, f, a |
| 3 | Bass | Noten in den Zwischenräumen | A, c, e, g |
| 4 | Bass | komplettes System | G bis a |
| 5 | beide | Systeme gemischt | wie Level 1 und 4 |
| 6 | Bass | Hilfslinien oberhalb | h bis e' |
| 7 | Bass | Hilfslinien unterhalb | C bis F |
| 8 | Violin | Hilfslinien unterhalb | a bis d' |
| 9 | Violin | Hilfslinien oberhalb | g'' bis c''' |
| 10 | beide | alles gemischt | C bis c''' |

Die Tastatur zeigt jeweils den Ausschnitt vom c unterhalb des tiefsten bis zum h oberhalb des höchsten Tons des Levels. Ein kleiner Punkt markiert c'.

## Lokal starten

```bash
npm install
```

```bash
npm run dev
```

Ohne `DATABASE_URL` speichert die App lokal in einer eingebetteten Postgres-Datenbank (PGlite) unter `.data/pglite`. Ohne `APP_PASSWORD` ist die App ungeschützt.

## Auf Vercel veröffentlichen

1. Repository in Vercel importieren (Framework: Next.js, keine weiteren Einstellungen nötig).
2. In Vercel unter *Storage* eine Neon-Datenbank verbinden oder bei Neon ein Projekt anlegen und die Verbindungszeichenfolge kopieren.
3. Umgebungsvariablen setzen:
   - `DATABASE_URL` – Neon-Verbindungszeichenfolge
   - `APP_PASSWORD` – das App-Passwort
   - optional `AUTH_SECRET` – beliebige lange Zeichenfolge; zusätzliches Geheimnis für das Anmelde-Cookie
4. Deployen. Die Tabellen legt die App beim ersten Aufruf selbst an.

Ein neues Passwort meldet alle Geräte ab.

## Auf dem iPhone installieren

Seite in Safari öffnen, anmelden, *Teilen → Zum Home-Bildschirm*. Die App startet dann ohne Browserleiste mit eigenem Symbol.

**Querformat:** Eine Web-App kann die Ausrichtung auf dem iPhone nicht sperren – Safari ignoriert `orientation` im Manifest, und die Screen-Orientation-Sperre ist dort nicht verfügbar. Die Übung zeigt deshalb im Hochformat einen Hinweis, das Gerät zu drehen. Startseite, Statistik und Einstellungen funktionieren in beiden Ausrichtungen.

**Ton:** Audio startet auf dem iPhone erst nach der ersten Berührung. Ab iOS 17 spielt die App auch bei aktivem Stummschalter des Geräts (`navigator.audioSession`).

## Tests

```bash
npm test
```

```bash
npm run e2e
```

`npm test` prüft Notennamen, Positionen, Level, adaptive Auswahl, Serie und die Datenbanklogik. `npm run e2e` baut die App und spielt mit Playwright komplette Abläufe durch (Login, Runden, Freischalten, Zeitmodus, Statistik, Einstellungen, Hochformat-Hinweis, Manifest).

## Aufbau

- `src/lib/notes.ts`, `levels.ts` – Noten (MIDI, deutsche Namen mit H), Level, Tastaturausschnitt
- `src/lib/adaptive.ts` – gewichtete Auswahl, Wiederholung falscher Noten
- `src/lib/input.ts` – austauschbare Eingabequellen; `connectMidi()` ist für Version 2 vorbereitet (Web MIDI in Chrome/Edge auf dem Mac)
- `src/lib/audio.ts` – Web Audio mit Klavier-Samples
- `src/lib/server/` – Datenbank (Neon oder PGlite) und Abfragen
- `src/proxy.ts`, `src/lib/auth.ts` – Passwortschutz
- `src/components/` – Notensystem (SVG), Tastatur, Übung, Startanimation

## Nachweise

- Notenschlüssel und Notenköpfe: Bravura © Steinberg Media Technologies, SIL Open Font License 1.1 (als SVG-Pfade in `src/lib/glyphs.ts`, erzeugt mit `scripts/extract-glyphs.mjs`)
- Klavier-Samples: Salamander Grand Piano (Alexander Holm, CC BY 3.0) über das npm-Paket `tonejs-instrument-piano-mp3`, gekürzt auf 2,6 s
