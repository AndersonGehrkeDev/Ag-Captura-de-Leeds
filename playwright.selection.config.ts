import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const servers = base.webServer;
if (!Array.isArray(servers) || !servers[0] || !servers.at(-1)) throw new Error("Configuração de testes indisponível.");
// Reutiliza Auth e catálogo de teste; compila somente rotas visitadas, sem build/suíte consolidada.
export default defineConfig({
  ...base,
  testDir: "./tests/selection", workers: 1,
  use: { ...base.use, baseURL: "http://127.0.0.1:3103" },
  webServer: [servers[0], {
    ...servers.at(-1)!,
    command: "node tests/support/prepare-search-catalog.mjs && node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3103",
  }],
});
