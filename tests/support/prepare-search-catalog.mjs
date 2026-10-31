import { mkdir, writeFile } from "node:fs/promises";
import { createSyntheticSearchManifest } from "../fixtures/search-catalog.mjs";
// Somente configuração do servidor E2E, em pasta ignorada. Não ativa demonstração em produção.
await mkdir(".local-data", { recursive: true });
await writeFile(".local-data/search-test.catalog.local.json", JSON.stringify(createSyntheticSearchManifest()), "utf8");
