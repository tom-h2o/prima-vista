import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isValidToken } from "./lib/auth";

export async function proxy(request: NextRequest) {
  const ok = await isValidToken(request.cookies.get(AUTH_COOKIE)?.value);
  if (ok) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Login, Manifest, Symbole, Samples und Next-Interna bleiben frei zugänglich
  matcher: [
    "/((?!login|api/login|_next/|manifest.webmanifest|icons/|samples/|favicon|apple-touch-icon|robots.txt).*)",
  ],
};
