import { NextResponse } from "next/server";
import { saveSettings } from "@/lib/server/repo";

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Ungültig" }, { status: 400 });
  return NextResponse.json(await saveSettings(body));
}
