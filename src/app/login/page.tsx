"use client";

import { useState } from "react";
import { ClefMark } from "@/components/Splash";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      setError(res.status === 401 ? "Das Passwort stimmt nicht." : "Anmeldung gerade nicht möglich.");
    } catch {
      setError("Keine Verbindung.");
    }
    setBusy(false);
  };

  return (
    <main className="login">
      <form className="glass" onSubmit={submit}>
        <ClefMark className="brand-clef" />
        <h1>Prima Vista</h1>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Passwort"
          aria-label="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <div className="error" role="alert">
          {error}
        </div>
        <button type="submit" className="glass-button glass-button--primary" disabled={busy || !password}>
          {busy ? "Prüfe …" : "Anmelden"}
        </button>
      </form>
    </main>
  );
}
