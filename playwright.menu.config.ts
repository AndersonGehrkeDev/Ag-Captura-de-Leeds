import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
if (!Array.isArray(base.webServer) || !base.webServer[0]) throw new Error("Servidor de teste indisponível.");
export default defineConfig({ ...base, testDir: "./tests/menu", workers: 1, retries: 0, timeout: 180000,
  use: { ...base.use, baseURL: "http://127.0.0.1:3104", viewport: { width: 1366, height: 768 }, permissions: ["clipboard-read", "clipboard-write"], actionTimeout: 20000 },
  webServer: [{ ...base.webServer[0], env: { MENU_FIXTURE: "true" } }, {
    command: "node tests/support/prepare-menu-catalog.mjs && node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3104", url: "http://127.0.0.1:3104/login", timeout: 120000, reuseExistingServer: false,
    env: { NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3104", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54331", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_e2e_only", AUTH_ALLOW_SIGNUP: "false", SUPABASE_SECRET_KEY: "", OWNED_CATALOG_FILE: ".local-data/menu-test.catalog.local.json", CRM_EXECUTOR_SECRET: "b".repeat(64), FEATURE_OWN_DATA_PERSISTENCE: "true", FEATURE_CATALOG_SEARCH: "true", FEATURE_CATALOG_DETAILS: "true", FEATURE_DATA_EXPORT: "true", FEATURE_AI_MESSAGES: "false", FEATURE_WEBSITE_AUDIT: "false", OPENAI_API_KEY: "", OPENAI_MODEL: "", GOOGLE_PLACES_API_KEY: "", GOOGLE_PAGESPEED_API_KEY: "", NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "" },
  }],
});
