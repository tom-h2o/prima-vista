import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_MAX_AGE, authEnabled, checkPassword, expectedToken } from "@/lib/auth";

export async function POST(request: Request) {
  if (!authEnabled()) return NextResponse.json({ ok: true });
  const body = await request.json().catch(() => ({}));
  // kleine Bremse gegen schnelles Durchprobieren
  await new Promise((r) => setTimeout(r, 400));
  if (!(await checkPassword(body?.password))) {
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await expectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
  return res;
}
