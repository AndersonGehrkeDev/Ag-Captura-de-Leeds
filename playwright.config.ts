import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    hasTouch: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [{
    command: "node tests/support/auth-provider.mjs",
    url: "http://127.0.0.1:54331/__health",
    reuseExistingServer: false,
    timeout: 60_000,
  }, {
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54331",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_e2e_only",
      AUTH_ALLOW_SIGNUP: "false",
      SUPABASE_SECRET_KEY: "",
      GOOGLE_PLACES_API_KEY: "",
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "",
      NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: "",
      GOOGLE_PAGESPEED_API_KEY: "",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "",
    },
  }, {
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3101",
    url: "http://127.0.0.1:3101/login",
    reuseExistingServer: false,
    timeout: 60_000,
    env: { NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3101", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", AUTH_ALLOW_SIGNUP: "false", SUPABASE_SECRET_KEY: "" },
  }, {
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3102",
    url: "http://127.0.0.1:3102/cadastro",
    reuseExistingServer: false,
    timeout: 60_000,
    env: { NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3102", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54331", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_e2e_only", AUTH_ALLOW_SIGNUP: "true", SUPABASE_SECRET_KEY: "" },
  }, {
    command: "node tests/support/prepare-search-catalog.mjs && node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3103",
    url: "http://127.0.0.1:3103/login", reuseExistingServer: false, timeout: 60_000,
    env: { NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3103", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54331", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_e2e_only", AUTH_ALLOW_SIGNUP: "false", SUPABASE_SECRET_KEY: "", OWNED_CATALOG_FILE: ".local-data/search-test.catalog.local.json", FEATURE_CATALOG_SEARCH: "true", FEATURE_CATALOG_DETAILS: "true", GOOGLE_PLACES_API_KEY: "" },
  }],
});
