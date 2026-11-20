import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = 3200;
const localChromium = "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["iPhone 13 landscape"],
    browserName: "chromium",
    launchOptions: existsSync(localChromium) && !process.env.CI ? { executablePath: localChromium } : {},
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    env: { APP_PASSWORD: "test-passwort", PGLITE_DIR: "memory" },
  },
});
