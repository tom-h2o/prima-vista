import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Passwort").fill("test-passwort");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/:\d+\/$/);
  await expect(page.getByRole("region", { name: "Tagesziel" })).toBeVisible();
}

const stage = (page: Page) => page.locator(".stage .staff");

async function currentNote(page: Page): Promise<number> {
  return Number(await stage(page).getAttribute("data-midi"));
}

async function press(page: Page, midi: number) {
  await page.locator(`.keyboard [data-midi="${midi}"]`).dispatchEvent("pointerdown");
}

/** Beantwortet die aktuelle Note und wartet auf die nächste. */
async function answer(page: Page, correct: boolean) {
  const midi = await currentNote(page);
  const before = await stage(page).getAttribute("data-midi");
  await press(page, correct ? midi : midi + 2);
  return { midi, before };
}

async function waitForNext(page: Page, before: string | null) {
  await expect(stage(page)).not.toHaveAttribute("data-midi", before ?? "");
}

test("falsches Passwort wird abgelehnt", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Passwort").fill("falsch");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("alert").first()).toHaveText("Das Passwort stimmt nicht.");
  const res = await page.request.get("/api/state");
  expect(res.status()).toBe(401);
});

test("komplette Runde schaltet Level 2 frei, Fehler werden markiert und wiederholt", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("button", { name: /Level 2: .*gesperrt/ })).toBeDisabled();

  await page.getByRole("button", { name: /Level 1: Noten im System/ }).click();
  await expect(page).toHaveURL(/ueben\?level=1&modus=anzahl/);
  await page.getByRole("button", { name: /Start/ }).click();

  // erste Note falsch: richtige Taste wird markiert
  const { midi: missed, before } = await answer(page, false);
  await expect(page.locator(`.keyboard [data-midi="${missed}"]`)).toHaveClass(/key--reveal/);
  await expect(page.locator(`.keyboard [data-midi="${missed + 2}"]`)).toHaveClass(/key--wrong/);
  await expect(page.getByTestId("wrong-feedback")).toContainText("Richtig ist");
  await waitForNext(page, before);

  // die falsche Note kommt ein paar Züge später wieder
  const seen: number[] = [];
  for (let i = 1; i < 20; i++) {
    const { midi, before: b } = await answer(page, true);
    seen.push(midi);
    if (i < 19) await waitForNext(page, b);
  }
  expect(seen.slice(0, 6)).toContain(missed);
  for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);

  const results = page.getByTestId("results");
  await expect(results).toBeVisible();
  await expect(page.getByTestId("result-score")).toHaveText("19 / 20");
  await expect(results).toContainText("95 %");
  await expect(results).toContainText("Level 2 ist freigeschaltet!");

  await page.getByRole("button", { name: "Level 2", exact: true }).click();
  await expect(page).toHaveURL(/ueben\?level=2/);
  await expect(page.getByRole("heading", { name: /Level 2: Noten auf den Linien/ })).toBeVisible();
  await page.getByRole("button", { name: "Zurück" }).click();
  await expect(page.getByRole("button", { name: /Level 2: Noten auf den Linien$/ })).toBeEnabled();
});

test("Runde unter 90 % schaltet nichts frei", async ({ page }) => {
  await login(page);
  await page.goto("/ueben?level=2&modus=anzahl");
  await page.getByRole("button", { name: /Start/ }).click();
  for (let i = 0; i < 20; i++) {
    const { before } = await answer(page, i >= 3);
    if (i < 19) await waitForNext(page, before);
  }
  await expect(page.getByTestId("result-score")).toHaveText("17 / 20");
  await expect(page.getByTestId("results")).toContainText("Mit 90 % öffnet sich das nächste Level.");
  const state = await (await page.request.get("/api/state")).json();
  expect(state.unlockedLevel).toBe(2);
});

test("gesperrte Level sind nicht per Adresse erreichbar", async ({ page }) => {
  await login(page);
  await page.goto("/ueben?level=9&modus=anzahl");
  await expect(page).toHaveURL(/\/$/);
});

test("Zeitmodus zählt richtige Noten und speichert den Rekord", async ({ page }) => {
  await login(page);
  await page.clock.install();
  await page.goto("/ueben?level=1&modus=zeit");
  await page.getByRole("button", { name: /Start/ }).click();
  for (let i = 0; i < 5; i++) {
    const { before } = await answer(page, true);
    await page.clock.runFor(300);
    await waitForNext(page, before);
  }
  await expect(page.getByTestId("score")).toHaveText("✓ 5");
  await page.clock.runFor(61_000);
  await expect(page.getByTestId("results")).toContainText("Zeit um");
  await expect(page.getByTestId("result-score")).toHaveText("5");
  await expect(page.getByTestId("results")).toContainText("Neuer Rekord!");
  const state = await (await page.request.get("/api/state")).json();
  expect(state.records["1"]).toBe(5);
});

test("Statistik zeigt Trefferquote, Verlauf und Rekorde", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Statistik" }).click();
  await expect(page.getByRole("heading", { name: "Statistik" })).toBeVisible();
  await expect(page.getByTestId("total-accuracy")).toHaveText(/\d+ %/);
  await expect(page.getByText("Trefferquote pro Tag")).toBeVisible();
  await expect(page.getByText(/Level 1 · Noten im System/)).toBeVisible();
});

test("Einstellungen werden gespeichert und wirken", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Einstellungen" }).click();
  await page.getByRole("switch", { name: "Notennamen auf den Tasten" }).click();
  await page.getByRole("button", { name: "Mehr" }).click();
  await expect(page.getByTestId("goal")).toHaveText("6 Min.");
  await page.getByRole("button", { name: "Dunkel" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByTestId("goal")).toHaveText("6 Min.");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("switch", { name: "Notennamen auf den Tasten" })).toHaveAttribute("aria-checked", "true");

  await page.goto("/ueben?level=1&modus=anzahl");
  await page.getByRole("button", { name: /Start/ }).click();
  await expect(page.locator(".keyboard .key-label").first()).toBeVisible();
  await page.getByRole("button", { name: "Ton ausschalten" }).click();
  await expect(page.getByRole("button", { name: "Ton einschalten" })).toBeVisible();
});

test("Tagesziel und Serie auf der Startseite", async ({ page }) => {
  await login(page);
  // bisher geübt: mehrere Runden; Tagesziel auf 1 Minute setzen
  await page.request.put("/api/settings", { data: { dailyGoalMinutes: 1 } });
  await page.reload();
  await expect(page.getByText("Tagesziel erreicht")).toBeVisible();
  await expect(page.locator(".streak")).toHaveText(/1 Tag/);
});

test("Hochformat zeigt den Hinweis zum Drehen", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await login(page);
  await page.goto("/ueben?level=1&modus=anzahl");
  await expect(page.getByText("Bitte dreh dein Gerät ins Querformat.")).toBeVisible();
  await ctx.close();
});

test("Manifest und Symbole für den Home-Bildschirm", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
  expect((await request.get("/icons/apple-touch-icon.png")).status()).toBe(200);
  expect((await request.get("/samples/C4.mp3")).status()).toBe(200);
});

test("abgelehnte Offline-Runde blockiert die übrigen nicht", async ({ page }) => {
  await login(page);
  const before = (await (await page.request.get("/api/state?today=2026-01-15")).json()).todayMs;
  const valid = {
    mode: "count",
    level: 1,
    durationMs: 42_000,
    completed: false,
    localDate: "2026-01-15",
    answers: [{ clef: "treble", midi: 64, pressed: 64, timeMs: 900 }],
  };
  const invalid = { ...valid, level: 99 };
  await page.evaluate((q) => localStorage.setItem("pv-pending-rounds", JSON.stringify(q)), [invalid, valid]);
  await page.reload();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("pv-pending-rounds"))).toBe("[]");
  const after = (await (await page.request.get("/api/state?today=2026-01-15")).json()).todayMs;
  expect(after - before).toBe(42_000);
});

test("unbekannte Adressen zeigen eine deutsche Fehlerseite", async ({ page }) => {
  await login(page);
  await page.goto("/gibt-es-nicht");
  await expect(page.getByRole("heading", { name: "Seite nicht gefunden" })).toBeVisible();
});
