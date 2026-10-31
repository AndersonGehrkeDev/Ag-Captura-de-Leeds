import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Reutiliza os casos existentes, sem matriz de cenários nem chamadas externas.
const servers = Array.isArray(base.webServer) ? base.webServer : [];
const safeEnvironment = {
  SUPABASE_SECRET_KEY: "", GOOGLE_PLACES_API_KEY: "", NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "",
  NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: "", GOOGLE_PAGESPEED_API_KEY: "", OPENAI_API_KEY: "", OPENAI_MODEL: "",
  AUDIT_EXECUTOR_SECRET: "", MESSAGE_EXECUTOR_SECRET: "", CRM_EXECUTOR_SECRET: "",
  FEATURE_WEBSITE_AUDIT: "false", FEATURE_AI_MESSAGES: "false", FEATURE_DATA_EXPORT: "false",
};

export default defineConfig({
  ...base,
  testDir: "./tests",
  workers: 1,
  retries: 0,
  outputDir: "test-results/consolidada-inicial",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/consolidada" }]],
  projects: [
    { name: "auth", testMatch: "e2e/auth.spec.ts", grep: /perfil próprio, cookie de outro workspace recusado e logout/, use: { ...base.use, viewport: { width: 1366, height: 768 } } },
    { name: "selecao", testMatch: "selection/map-selection.spec.ts", use: { ...base.use, baseURL: "http://127.0.0.1:3103" } },
  ],
  webServer: [servers[0]!, ...[servers[1]!, servers[4]!].map((server) => ({
    ...server, env: { ...server.env, ...safeEnvironment },
  }))],
});
