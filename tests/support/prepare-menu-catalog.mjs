import { mkdir, writeFile } from "node:fs/promises";
import { createSyntheticSearchManifest } from "../fixtures/search-catalog.mjs";
// SINTÉTICO, apenas configuração do servidor desta verificação local. Não é licença real.
const manifest = createSyntheticSearchManifest(); const workspace = manifest.workspaces[0];
const licenseId = "e2000000-0000-4000-8000-000000000001"; const provenanceId = "e3000000-0000-4000-8000-000000000001";
workspace.licenses.push({ id: licenseId, workspaceId: workspace.workspaceId, provider: "first_party", sourceReference: "menu-SYNTHETIC-only", evidenceReference: "SYNTHETIC_COPY_REVIEW_TEST", approvedBy: "10000000-0000-4000-8000-000000000001", approvedAt: "2026-10-25T00:00:00Z", validUntil: "2030-01-01T00:00:00Z", revokedAt: null, fields: ["service_description"], purposes: ["message_draft"], actions: ["display", "export"], retentionDays: null, attribution: "Crédito SINTÉTICO [TESTE-MENU]" });
workspace.provenance.push({ id: provenanceId, workspaceId: workspace.workspaceId, provider: "first_party", reference: "menu-SYNTHETIC-only", field: "service_description", method: "authored", parentIds: [], licenseId, observedAt: "2026-10-25T00:00:00Z" });
workspace.messageTemplates = [{ templateId: "e1000000-0000-4000-8000-000000000001", body: { provenanceId, value: "Criação de sites profissionais [TESTE-MENU]" } }];
await mkdir(".local-data", { recursive: true }); await writeFile(".local-data/menu-test.catalog.local.json", JSON.stringify(manifest), "utf8");
