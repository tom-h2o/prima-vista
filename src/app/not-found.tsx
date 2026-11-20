import Link from "next/link";

export default function NotFound() {
  return (
    <main className="login">
      <div className="glass card">
        <h2>Seite nicht gefunden</h2>
        <p>Diese Adresse gibt es in Prima Vista nicht.</p>
        <div className="actions">
          <Link href="/" className="glass-button glass-button--primary">
            Zur Übersicht
          </Link>
        </div>
      </div>
    </main>
  );
}
