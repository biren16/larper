import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { readStagingConfig } from "./staging/config";
const config=readStagingConfig(process.env);
if (!existsSync(config.authState)) throw new Error("Authenticated STAGING_AUTH_STATE is required");
export default defineConfig({testDir:"./staging",testMatch:"admin-release-one.spec.ts",workers:1,retries:0,timeout:120000,reporter:"line",use:{...devices["Desktop Chrome"],baseURL:config.appUrl,storageState:config.authState,trace:"off",screenshot:"off",video:"off"}});
