import { describe, expect, it } from "vitest";
import { integrationFixture } from "../../../tests/fixtures/integration-catalog";
import { companySchema, messageDraftSchema, ownPersistenceRequestSchema, searchRequestSchema } from "./contracts";
import { createCatalogPorts } from "./catalog";
import { createDemoCatalogAdapter, demoIntegrationSourceId } from "@/demo/integrations/catalog";

describe("contratos mínimos de integração", () => {
  it("campos ausentes não viram ausência confirmada de site, nota zero ou avaliação inventada", () => {
    const f = integrationFixture(); const company = { ...f.company, website: { state: "not_provided" } };
    expect(companySchema.safeParse(company).success).toBe(true);
    expect(companySchema.safeParse({ ...company, website: { state: "missing" } }).success).toBe(false);
    expect(companySchema.safeParse({ ...company, rawResponse: { secret: "synthetic" } }).success).toBe(false);
  });
  it("limita paginação, campos extras e nichos sem termo", () => {
    const f = integrationFixture(); const request = { sourceId: f.sourceId, mode: "category", location: "São Paulo", term: "", radiusKm: "city", pageSize: 21, cursor: null };
    expect(searchRequestSchema.safeParse(request).success).toBe(false);
    expect(searchRequestSchema.safeParse({ ...request, mode: "free", pageSize: 20, apiKey: "synthetic" }).success).toBe(false);
  });
  it("não aceita rascunho enviado automaticamente ou sem revisão", () => {
    expect(messageDraftSchema.safeParse({ body: { provenanceId: integrationFixture().ids.name, value: "Rascunho" }, generatedAt: "2026-10-27T12:00:00Z", model: "synthetic", reviewRequired: false, sent: true, limitations: [] }).success).toBe(false);
  });
  it("não aceita dois valores para o mesmo campo de persistência", () => {
    const field = { field: "name", provenanceId: integrationFixture().ids.name };
    expect(ownPersistenceRequestSchema.safeParse({ leadId: null, fields: [field, field] }).success).toBe(false);
  });
  it("catálogo próprio consulta dados fornecidos, mantém atribuição licenciada e não promete raio", async () => {
    const f = integrationFixture();
    const context = { ...f.context, licenses: new Map([[f.license.id, { ...f.license, attribution: "Fonte autorizada [TESTE]" }]]) };
    const port = createCatalogPorts({ sourceId: f.sourceId, provider: "first_party", context, companies: [f.company] });
    const request = { sourceId: f.sourceId, mode: "keyword" as const, location: "São Paulo", term: "própria", radiusKm: "city" as const, pageSize: 1, cursor: null };
    const found = await port.search(request);
    expect(found).toMatchObject({ ok: true, data: { total: { value: 1, precision: "exact" }, geographicMatch: "approximate", items: [{ attributions: ["Fonte autorizada [TESTE]"] }] } });
    expect(await port.search({ ...request, radiusKm: 25 })).toMatchObject({ ok: false, error: { code: "not_implemented" } });
    expect(await port.details({ sourceId: f.sourceId, reference: "unknown" })).toMatchObject({ ok: false, error: { code: "not_found" } });
  });
  it("demonstração é explicitamente selecionada e separada do catálogo real", async () => {
    const demo = createDemoCatalogAdapter();
    const found = await demo.search({ sourceId: demoIntegrationSourceId, mode: "free", location: "São Paulo", term: "", radiusKm: "city", pageSize: 2, cursor: null });
    expect(found).toMatchObject({ ok: true, data: { items: expect.any(Array), total: { value: 8 }, nextCursor: "offset:2" } });
    if (found.ok) expect(found.data.items.every((item) => item.attributions.some((credit) => credit.includes("sintéticos")))).toBe(true);
    const f = integrationFixture();
    const blocked = createCatalogPorts({ sourceId: f.sourceId, provider: "demo", context: f.context, companies: [f.company] });
    expect(await blocked.details({ sourceId: f.sourceId, reference: f.company.reference.value })).toMatchObject({ ok: false, error: { code: "permission_denied" } });
  });
});
