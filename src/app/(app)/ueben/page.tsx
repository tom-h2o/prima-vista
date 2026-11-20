import { redirect } from "next/navigation";
import { MAX_LEVEL } from "@/lib/levels";
import { PracticeGate } from "./PracticeGate";

export default async function UebenPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const level = Number(sp.level);
  const mode = sp.modus === "zeit" ? "timed" : "count";
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) redirect("/");
  return <PracticeGate key={`${level}-${mode}`} levelId={level} mode={mode} />;
}
