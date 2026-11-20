// App-Passwort: ein festes Passwort (Umgebungsvariable APP_PASSWORD) schützt die ganze App.
// Das Cookie enthält einen HMAC über einen festen Text, abgeleitet vom Passwort.
// Ändert man das Passwort, werden alle bestehenden Anmeldungen ungültig.

export const AUTH_COOKIE = "pv_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 365; // ein Jahr

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

async function hmac(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function expectedToken(): Promise<string> {
  const secret = (process.env.AUTH_SECRET ?? "") + (process.env.APP_PASSWORD ?? "");
  return hmac(secret, "prima-vista-session-v1");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!authEnabled()) return true;
  if (!token) return false;
  return safeEqual(token, await expectedToken());
}

export async function checkPassword(password: unknown): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected || typeof password !== "string") return false;
  // Vergleich über Hashes, damit die Laufzeit nicht von der Länge abhängt
  const [a, b] = await Promise.all([hmac("pw", password), hmac("pw", expected)]);
  return safeEqual(a, b);
}
