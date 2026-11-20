"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { Practice } from "@/components/Practice";
import type { Mode } from "@/lib/types";

/** Gesperrte Level sind nicht direkt per Adresse erreichbar. */
export function PracticeGate({ levelId, mode }: { levelId: number; mode: Mode }) {
  const { state } = useApp();
  const router = useRouter();
  const locked = state !== null && levelId > state.unlockedLevel;
  useEffect(() => {
    if (locked) router.replace("/");
  }, [locked, router]);
  if (!state || locked) return null;
  return <Practice levelId={levelId} mode={mode} />;
}
