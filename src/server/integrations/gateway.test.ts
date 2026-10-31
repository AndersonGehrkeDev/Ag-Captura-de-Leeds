import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { integrationFixture, otherWorkspace, testUser, testWorkspace } from "../../../tests/fixtures/integration-catalog";
import { createIntegrationGateway } from "./gateway";
import { pendingMessageAdapter, pendingWebsiteAuditAdapter } from "@/server/providers/pending";

function setup() {
  const f = integrationFixture();
  const authorize = vi.fn(async () => testUser as string | null);
  const readAuthorizedWorkspace = vi.fn(async () => f.snapshot);
  const gateway = createIntegrationGateway({ readAuthorizedWorkspace }, { authorize, flags: () => f.context.flags, now: () => f.context.now });
  return { ...f, gateway, authorize, readAuthorizedWorkspace };
}
describe("fronteiras do servidor para integrações", () => {
  it("consulta associação atual em cada operação e não lê dados depois da revogação", async () => {
    const f = setup(); const input = { sourceId: f.sourceId, reference: f.company.reference.value };
    expect(await f.gateway.details(testWorkspace, input)).toMatchObject({ ok: true });
    f.authorize.mockResolvedValue(null);
    expect(await f.gateway.details(testWorkspace, input)).toMatchObject({ ok: false, error: { code: "access_denied" } });
    expect(f.authorize).toHaveBeenCalledTimes(2); expect(f.readAuthorizedWorkspace).toHaveBeenCalledTimes(1);
  });
  it("recusa registro resolvido de outro workspace e payload que tente declarar licença", async () => {
    const f = setup();
    expect(await f.gateway.details(otherWorkspace, { sourceId: f.sourceId, reference: f.company.reference.value })).toMatchObject({ ok: false, error: { code: "access_denied" } });
    expect(await f.gateway.preparePersistence(testWorkspace, { leadId: null, fields: [{ field: "name", provenanceId: f.ids.name, provider: "first_party" }] })).toMatchObject({ ok: false, error: { code: "invalid_input" } });
  });
  it("prepara persistência somente de campos próprios/licenciados e devolve proveniência/prazo", async () => {
    const f = setup();
    const plan = await f.gateway.preparePersistence(testWorkspace, { leadId: null, fields: [{ field: "name", provenanceId: f.ids.name }] });
    expect(plan).toMatchObject({ ok: true, data: { fields: [{ field: "name", data: { provenanceId: f.ids.name }, deleteAt: "2026-11-02T00:00:00.000Z" }] } });
    f.provenance.set(f.ids.name, { ...f.provenance.get(f.ids.name)!, provider: "google_places" });
    expect(await f.gateway.preparePersistence(testWorkspace, { leadId: null, fields: [{ field: "name", provenanceId: f.ids.name }] })).toMatchObject({ ok: false, error: { code: "permission_denied" } });
  });
  it("prepara mensagem mínima sem prompt livre, resposta bruta, treinamento ou envio", async () => {
    const f = setup();
    const plan = await f.gateway.prepareMessage(testWorkspace, { factProvenanceIds: [f.ids.name], serviceProvenanceIds: [f.ids.service_description], tone: "professional" });
    expect(plan).toMatchObject({ ok: true, data: { locale: "pt-BR", maxOutputTokens: 600, store: false, background: false } });
    expect(await pendingMessageAdapter.generate(plan.ok ? plan.data : { facts: [], services: [], tone: "professional", locale: "pt-BR", maxOutputTokens: 600, store: false, background: false })).toMatchObject({ ok: false, error: { code: "not_implemented" } });
  });
  it.each(["http://127.0.0.1", "http://169.254.169.254", "http://[::1]", "https://example.local", "https://name:password@empresa.example", "https://empresa.example?token=synthetic"])("não prepara auditoria de URL indevida: %s", async (value) => {
    const f = setup(); f.values.set(f.ids.website_url, { provenanceId: f.ids.website_url, value });
    expect(await f.gateway.prepareAudit(testWorkspace, { websiteProvenanceId: f.ids.website_url, strategy: "mobile" })).toMatchObject({ ok: false, error: { code: "invalid_input" } });
  });
  it("auditoria usa URL autorizada resolvida no servidor e permanece sem requisição real", async () => {
    const f = setup(); const fetch = vi.spyOn(globalThis, "fetch");
    const plan = await f.gateway.prepareAudit(testWorkspace, { websiteProvenanceId: f.ids.website_url, strategy: "mobile" });
    expect(plan).toMatchObject({ ok: true, data: { website: { value: "https://empresa.example" } } });
    if (plan.ok) expect(await pendingWebsiteAuditAdapter.audit(plan.data)).toMatchObject({ ok: false, error: { code: "not_implemented" } });
    expect(fetch).not.toHaveBeenCalled(); fetch.mockRestore();
  });
  it("falha não serializa erro original, conteúdo ou chaves", async () => {
    const f = integrationFixture();
    const gateway = createIntegrationGateway({ readAuthorizedWorkspace: async () => { throw new Error("raw provider secret synthetic"); } }, { authorize: async () => testUser });
    const failure = await gateway.details(testWorkspace, { sourceId: f.sourceId, reference: f.company.reference.value });
    expect(JSON.stringify(failure)).not.toMatch(/raw provider|secret synthetic/);
  });
  it("falha de autenticação fecha o acesso sem propagar erro bruto", async () => {
    const f = setup(); f.authorize.mockRejectedValue(new Error("synthetic raw auth response"));
    expect(await f.gateway.details(testWorkspace, { sourceId: f.sourceId, reference: f.company.reference.value })).toMatchObject({ ok: false, error: { code: "access_denied" } });
    expect(f.readAuthorizedWorkspace).not.toHaveBeenCalled();
  });
  it("fonte licenciada independente usa o mesmo contrato com evidência específica", async () => {
    const f = setup();
    for (const record of f.provenance.values()) f.provenance.set(record.id, { ...record, provider: "licensed", method: "import" });
    f.readAuthorizedWorkspace.mockResolvedValue({ ...f.snapshot, sources: f.snapshot.sources.map((source) => ({ ...source, provider: "licensed" })), licenses: new Map([[f.license.id, { ...f.license, provider: "licensed", evidenceReference: "INDEPENDENT_LICENSE_TEST_ONLY" }]]) });
    expect(await f.gateway.details(testWorkspace, { sourceId: f.sourceId, reference: f.company.reference.value })).toMatchObject({ ok: true });
  });
  it("fonte sem catálogo não fabrica resposta de zero empresas", async () => {
    const f = setup(); f.readAuthorizedWorkspace.mockResolvedValue({ ...f.snapshot, catalogs: new Map() });
    expect(await f.gateway.details(testWorkspace, { sourceId: f.sourceId, reference: f.company.reference.value })).toMatchObject({ ok: false, error: { code: "not_configured" } });
  });
  it("rejeita insumos de IA acima do limite mesmo com licença válida", async () => {
    const f = setup(); f.values.set(f.ids.note, { provenanceId: f.ids.note, value: "S".repeat(9000) });
    expect(await f.gateway.prepareMessage(testWorkspace, { factProvenanceIds: [f.ids.note], serviceProvenanceIds: [f.ids.service_description], tone: "professional" })).toMatchObject({ ok: false, error: { code: "invalid_input" } });
  });
});
