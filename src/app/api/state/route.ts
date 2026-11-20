import { NextResponse } from "next/server";
import { getState, isValidDate } from "@/lib/server/repo";
import { localDateString } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const today = new URL(request.url).searchParams.get("today");
  return NextResponse.json(await getState(isValidDate(today) ? today : localDateString()));
}
