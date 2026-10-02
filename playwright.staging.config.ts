import { existsSync, readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { readStagingConfig, readStagingInput, readCultureStagingInput } from "./staging/config";

const staging = readStagingConfig(process.env);
if (!existsSync(staging.authState)) throw new Error("STAGING_AUTH_STATE does not exist; sign in on staging and save the browser session first");
const culture = process.env.STAGING_ROLLOUT === "seven-lanes";
(culture ? readCultureStagingInput : readStagingInput)(JSON.parse(readFileSync(staging.inputFile, "utf8")));

export default defineConfig({
  testDir: "./staging",
  testMatch: culture ? "culture.spec.ts" : "release.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  outputDir: "staging-results",
  reporter: [["line"], ["json", { outputFile: "staging-results/playwright.json" }]],
  projects: [{ name: "staging-desktop", use: { ...devices["Desktop Chrome"] } }],
  use: {
    baseURL: staging.appUrl,
    storageState: staging.authState,
    timezoneId: "UTC",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
