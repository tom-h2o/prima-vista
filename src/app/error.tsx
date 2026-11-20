"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="login">
      <div className="glass card">
        <h2>Da ist etwas schiefgelaufen</h2>
        <p>Bitte versuch es noch einmal. Dein bisheriger Fortschritt ist gespeichert.</p>
        <div className="actions">
          <button type="button" className="glass-button" onClick={() => (window.location.href = "/")}>
            Zur Übersicht
          </button>
          <button type="button" className="glass-button glass-button--primary" onClick={reset}>
            Erneut versuchen
          </button>
        </div>
      </div>
    </main>
  );
}
