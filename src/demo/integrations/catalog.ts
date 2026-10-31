import { demoCompanies } from "@/demo/prospect-companies";
import { createCatalogPorts } from "@/domain/integrations/catalog";
import type { CompanyRecord } from "@/domain/integrations/contracts";
import type { DataField, ProvenanceRecord } from "@/domain/integrations/data";
import { disabledIntegrationFlags } from "@/domain/integrations/flags";

export const demoIntegrationSourceId = "d0000000-0000-4000-8000-000000000001";
const workspaceId = "d0000000-0000-4000-8000-000000000002";
export function createDemoCatalogAdapter() {
  const provenance = new Map<string, ProvenanceRecord>();
  let sequence = 0;
  const text = (field: DataField, value: string) => {
    const id = `d1000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
    provenance.set(id, { id, workspaceId, provider: "demo", reference: "ag-synthetic-catalog", field, method: "authored", parentIds: [], licenseId: null, observedAt: "2026-10-27T00:00:00Z" });
    return { provenanceId: id, value };
  };
  const companies: CompanyRecord[] = demoCompanies.map((company) => ({
    reference: text("external_id", company.id), name: { state: "known", data: text("name", company.name) },
    category: { state: "known", data: text("category", company.category) },
    website: company.website ? { state: "known", data: text("website_url", company.website) } : { state: "not_provided" },
    address: { state: "known", data: text("address", company.address) }, city: { state: "known", data: text("city", "São Paulo, SP") },
    rating: { state: "not_checked" }, reviewCount: { state: "not_checked" }, coordinates: null,
    attributions: ["Demonstração AG — empresas e endereços sintéticos; nenhuma consulta externa."],
  }));
  return createCatalogPorts({ sourceId: demoIntegrationSourceId, provider: "demo", companies, context: {
    workspaceId, mode: "demo", now: new Date(), flags: disabledIntegrationFlags, provenance, licenses: new Map(),
  } });
}
