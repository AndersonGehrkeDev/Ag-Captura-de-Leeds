import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createTestDatabase, applyDevelopmentSeed } from "../../../scripts/db/database.mjs";
import { integrationFixture, testUser, testWorkspace } from "../../../tests/fixtures/integration-catalog";
import { createCrmService } from "./service";
import type { CrmRepository } from "./repository";

const executor = "c".repeat(64); // Exclusivamente sintético; sem banco hospedado ou APIs externas.
const policyId = "d1000000-0000-4000-8000-000000000001";
let database: Awaited<ReturnType<typeof createTestDatabase>>;
let leadId: string;
const f = integrationFixture();
beforeAll(async () => {
  database = await createTestDatabase(); await applyDevelopmentSeed(database.db);
  await database.db.query("insert into private.crm_executor_config(singleton,secret_sha256) values(true,encode(sha256(convert_to($1,'UTF8')),'hex'))", [executor]);
  await database.db.query("insert into public.data_usage_policies(id,workspace_id,source,purpose,version,persistence,allowed_fields,rules_url,reviewed_at,valid_until,reviewed_by) values($1,$2,'first_party','prospecting',1,'identifier_only',array['external_id'],'https://example.test/politica-SINTETICA','2026-10-25T00:00:00Z','2026-11-10T00:00:00Z',$3)", [policyId, testWorkspace, testUser]);
});
afterAll(async () => { await database.db.close(); });
const repository: CrmRepository = { async execute(workspaceId, action, input, proof) {
  await database.db.exec("begin; set local role authenticated;");
  try {
    await database.db.query("select set_config('request.jwt.claim.sub',$1,true)", [testUser]);
    const result = await database.db.query<{ result: unknown }>("select public.ag_crm($1,$2,$3::jsonb,$4) as result", [workspaceId, action, JSON.stringify(input), proof]);
    await database.db.exec("commit"); return result.rows[0]!.result;
  } catch (error) { await database.db.exec("rollback"); throw error; }
} };
const snapshot = { ...f.snapshot, sources: f.snapshot.sources.map((source) => ({ ...source, crmReferencePolicyId: policyId })) };
function service() { return createCrmService({ repository, authorize: async () => testUser, flags: () => f.context.flags, executor: () => executor, now: () => f.context.now, registry: async () => ({ snapshot, sources: [], revision: "SYNTHETIC_CRM_ONLY" }) }); }
const signal = () => new AbortController().signal;
describe("CRM: adicionar, mover e persistir anotação", () => {
  it("adiciona referência autorizada e cadastro manual sem duplicar por workspace", async () => {
    const command = { operation: "add_source", workspaceId: testWorkspace, sourceId: f.sourceId, reference: f.company.reference.value };
    const added = await service()(command, signal()); expect(added).toMatchObject({ ok: true, data: { duplicate: false, leadId: expect.any(String) } });
    if (!added.ok || !added.data.leadId) throw new Error("fixture"); leadId = added.data.leadId;
    const duplicate = await service()(command, signal()); expect(duplicate).toMatchObject({ ok: true, data: { leadId, duplicate: true } });
    const rows = await database.db.query<{ name: string; category: string | null; website_url: string | null }>("select name,category,website_url from public.leads where id=$1", [leadId]);
    expect(rows.rows[0]!.name).not.toContain("Empresa Própria"); expect(rows.rows[0]!.category).toBeNull(); expect(rows.rows[0]!.website_url).toBeNull();
    const references = await database.db.query<{ total: number }>("select count(*)::int as total from private.crm_source_bindings where lead_id=$1", [leadId]); expect(references.rows[0]!.total).toBe(1);
    const manual = { operation: "manual", workspaceId: testWorkspace, label: "Carteira interna [TESTE]", stage: "new", assignedTo: null, tags: [], doNotContact: false, nextContactAt: null };
    const first = await service()(manual, signal()); expect(first).toMatchObject({ ok: true, data: { duplicate: false } });
    const again = await service()({ ...manual, label: "  CARTEIRA   INTERNA [teste] " }, signal());
    expect(again).toMatchObject({ ok: true, data: { leadId: first.ok ? first.data.leadId : "", duplicate: true } });
  });
  it("move para Em análise com persistência, responsável, etiquetas e histórico automático", async () => {
    const read = await service()({ operation: "details", workspaceId: testWorkspace, leadId }, signal()); if (!read.ok || !read.data.leads[0]) throw new Error("fixture");
    const moved = await service()({ operation: "update", workspaceId: testWorkspace, leadId, expectedUpdatedAt: read.data.leads[0].updatedAt, stage: "analysis", assignedTo: testUser, tags: ["Prioridade"], doNotContact: false, nextContactAt: "2026-11-05T14:00:00.000Z" }, signal());
    expect(moved).toMatchObject({ ok: true, data: { leadId } });
    const persisted = await service()({ operation: "details", workspaceId: testWorkspace, leadId }, signal());
    expect(persisted).toMatchObject({ ok: true, data: { leads: [{ id: leadId, stage: "analysis", assignedTo: testUser, tags: ["Prioridade"] }], history: expect.arrayContaining([{ id: expect.any(String), from: "new", to: "analysis", changedBy: testUser, createdAt: expect.any(String) }]) } });
  });
  it("salva anotação original e a recupera por outra instância do serviço", async () => {
    const command = { operation: "note", workspaceId: testWorkspace, leadId, body: "Planejar uma conversa comercial após revisão humana [TESTE].", requestId: "d2000000-0000-4000-8000-000000000001" };
    expect(await service()(command, signal())).toMatchObject({ ok: true, data: { leadId } });
    const persisted = await service()({ operation: "details", workspaceId: testWorkspace, leadId }, signal());
    expect(persisted).toMatchObject({ ok: true, data: { notes: [{ id: command.requestId, body: command.body, createdBy: testUser }] } });
    const note = await database.db.query<{ body: string; created_by: string; crm_authored: boolean }>("select body,created_by,crm_authored from public.lead_notes where id=$1", [command.requestId]);
    expect(note.rows[0]).toEqual({ body: command.body, created_by: testUser, crm_authored: true });
  });
});
