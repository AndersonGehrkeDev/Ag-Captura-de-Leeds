// SINTÉTICO, exclusivo de testes. Não comprova direitos de uma fonte real.
import type { CompanyRecord } from "@/domain/integrations/contracts";
import type { DataField, GovernedDatum, ProvenanceRecord, SourceLicense } from "@/domain/integrations/data";
import type { PolicyContext } from "@/domain/integrations/policy";
import type { WorkspaceIntegrationSnapshot } from "@/server/integrations/contracts";

export const testWorkspace = "00000000-0000-4000-8000-000000000001";
export const otherWorkspace = "00000000-0000-4000-8000-000000000002";
export const testUser = "10000000-0000-4000-8000-000000000001";
export function integrationFixture() {
  const sourceId = "c0000000-0000-4000-8000-000000000001";
  const license: SourceLicense = { id: "c1000000-0000-4000-8000-000000000001", workspaceId: testWorkspace, provider: "first_party", sourceReference: "synthetic-owned-source", evidenceReference: "OWNERSHIP_TEST_ONLY", approvedBy: testUser, approvedAt: "2026-10-25T00:00:00Z", validUntil: "2026-11-10T00:00:00Z", revokedAt: null,
    fields: ["external_id", "name", "category", "website_url", "address", "city", "note", "stage", "task", "service_description", "message_draft", "audit_metric"], actions: ["display", "persist", "export", "ai"], purposes: ["prospecting", "crm", "website_audit", "message_draft"], retentionDays: 7, attribution: null };
  const provenance = new Map<string, ProvenanceRecord>();
  const values = new Map<string, GovernedDatum>();
  const ids: Partial<Record<DataField, string>> = {};
  let sequence = 0;
  function text(field: DataField, value: string) {
    const id = `c2000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
    provenance.set(id, { id, workspaceId: testWorkspace, provider: "first_party", reference: license.sourceReference, field, method: "authored", parentIds: [], licenseId: license.id, observedAt: "2026-10-26T00:00:00Z" });
    const data = { provenanceId: id, value }; values.set(id, data); ids[field] = id; return data;
  }
  const anchor = text("external_id", "OWN_TEST_001");
  const company: CompanyRecord = { reference: anchor, name: { state: "known", data: text("name", "Empresa Própria [TESTE]") }, category: { state: "known", data: text("category", "Restaurante") }, website: { state: "known", data: text("website_url", "https://empresa.example") }, address: { state: "not_checked" }, city: { state: "known", data: text("city", "São Paulo") }, rating: { state: "not_checked" }, reviewCount: { state: "not_checked" }, coordinates: null, attributions: [] };
  text("service_description", "Sites profissionais da AG [TESTE]");
  text("note", "Nota original sintética");
  const context: PolicyContext = { workspaceId: testWorkspace, mode: "production", now: new Date("2026-10-27T12:00:00Z"), flags: { catalogSearch: true, catalogDetails: true, googlePlaces: true, googleMaps: true, websiteAudit: true, aiMessages: true, ownPersistence: true, exports: true }, provenance, licenses: new Map([[license.id, license]]) };
  const snapshot: WorkspaceIntegrationSnapshot = { workspaceId: testWorkspace, sources: [{ id: sourceId, workspaceId: testWorkspace, provider: "first_party", provenanceId: anchor.provenanceId }], provenance, licenses: context.licenses, values, catalogs: new Map([[sourceId, [company]]]) };
  return { sourceId, license, provenance, values, ids: ids as Record<DataField, string>, company, context, snapshot };
}
