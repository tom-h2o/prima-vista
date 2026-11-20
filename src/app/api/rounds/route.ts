import { NextResponse } from "next/server";
import { saveRound, validateRound } from "@/lib/server/repo";

export async function POST(request: Request) {
  const round = validateRound(await request.json().catch(() => null));
  if (!round) return NextResponse.json({ error: "Ungültige Runde" }, { status: 400 });
  return NextResponse.json(await saveRound(round));
}
