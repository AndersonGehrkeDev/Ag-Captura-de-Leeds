import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createTestDatabase, applyDevelopmentSeed } from "../../../scripts/db/database.mjs";
import { integrationFixture, testUser, testWorkspace } from "../../../tests/fixtures/integration-catalog";
import { createOpenAIMessageAdapter } from "@/server/providers/openai/adapter";
import { createMessageService, openAIMessageSource } from "./service";
import { MessageError, type MessageRepository } from "./repository";

// Exclusivamente SINTÉTICO. SDK real com fetch substituído: nenhuma chamada paga/rede.
const executor = "d".repeat(64); const templateId = "b1000000-0000-4000-8000-000000000001";
let database: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  database = await createTestDatabase(); await applyDevelopmentSeed(database.db);
  await database.db.query("insert into private.message_executor_config(singleton,secret_sha256) values(true,encode(sha256(convert_to($1,'UTF8')),'hex'))", [executor]);
  await database.db.query("insert into public.message_templates(id,workspace_id,name,body,created_by) values($1,$2,'Modelo SINTÉTICO [TESTE]','Sites profissionais da AG [TESTE]',$3)", [templateId, testWorkspace, testUser]);
});
afterAll(async () => { await database.db.close(); });
async function asUser<T>(operation: () => Promise<T>) {
  await database.db.exec("begin; set local role authenticated;");
  try { await database.db.query("select set_config('request.jwt.claim.sub',$1,true)", [testUser]); const result = await operation(); await database.db.exec("commit"); return result; }
  catch (error) { await database.db.exec("rollback"); throw error; }
}
const repository: MessageRepository = {
  async templates(workspaceId) { return asUser(async () => (await database.db.query<{ id: string; body: string }>("select id,body from public.message_templates where workspace_id=$1 and archived_at is null", [workspaceId])).rows); },
  async attempt(workspaceId, action, args) {
    try { return await asUser(async () => (await database.db.query<{ result: string | null }>("select public.ag_message_attempt($1,$2,$3,$4,$5,$6) as result", [workspaceId, action, args.key ?? null, args.jobId ?? null, args.error ?? null, args.executor])).rows[0]!.result); }
    catch { throw new MessageError("rate_limited"); }
  },
};
function setup(fetch: typeof globalThis.fetch) {
  const f = integrationFixture();
  const license = { ...f.license, id: "b2000000-0000-4000-8000-000000000001", provider: "openai" as const, sourceReference: openAIMessageSource, fields: ["message_draft" as const], purposes: ["message_draft" as const], actions: ["display" as const, "export" as const], attribution: "Autorização SINTÉTICA [TESTE]" };
  const snapshot = { ...f.snapshot, licenses: new Map([...f.snapshot.licenses, [license.id, license]]), messageTemplates: [{ templateId, body: { provenanceId: f.ids.service_description, value: "Sites profissionais da AG [TESTE]" } }] };
  const opts = { repository, authorize: async () => testUser, flags: () => f.context.flags, now: () => f.context.now,
    registry: async () => ({ snapshot, sources: [], revision: "SYNTHETIC_ONLY" }), credentials: () => ({ key: "SYNTHETIC_OPENAI_KEY", model: "synthetic-model", executor }),
    provider: (input: Parameters<typeof createOpenAIMessageAdapter>[0]) => createOpenAIMessageAdapter({ ...input, fetch }),
  };
  return { ...f, service: createMessageService(opts), restart: () => createMessageService(opts) };
}
const signal = () => new AbortController().signal;
describe("mensagens comerciais: geração simulada e falha", () => {
  it("SDK Responses valida estrutura, usa só nome/serviço autorizados e reserva uma tentativa durável", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({ id: "resp_SYNTHETIC", object: "response", created_at: 0, model: "synthetic-model", status: "completed", output: [{ id: "msg_SYNTHETIC", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify({ greeting: "hello", introduction: "presentation", closing: "permission" }), annotations: [] }] }] }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const f = setup(fetch);
    const scope = { workspaceId: testWorkspace, sourceId: f.sourceId, reference: f.company.reference.value };
    const options = await f.service({ ...scope, operation: "options" }, signal());
    expect(options).toMatchObject({ ok: true, data: { options: { templates: [{ id: templateId }] }, draft: null } }); expect(fetch).not.toHaveBeenCalled();
    const command = { ...scope, operation: "generate", templateId, tone: "consultative", requestId: "b3000000-0000-4000-8000-000000000001" };
    const result = await f.service(command, signal());
    expect(result).toMatchObject({ ok: true, data: { draft: { tone: "consultative", templateId, model: "synthetic-model", reviewRequired: true, sent: false, body: { value: expect.stringContaining("Empresa Própria [TESTE]") } } } });
    if (!result.ok || !result.data.draft) throw new Error("fixture");
    expect(result.data.draft.body.value).toContain("Sites profissionais da AG [TESTE]");
    expect(result.data.draft.body.value).not.toMatch(/sem site|site ruim|garant|conversamos|Nota original/);
    expect(fetch).toHaveBeenCalledTimes(1);
    const call = fetch.mock.calls[0]!; expect(String(call[0])).toBe("https://api.openai.com/v1/responses");
    const request = JSON.parse(String(call[1]?.body));
    expect(request).toMatchObject({ model: "synthetic-model", store: false, background: false, max_output_tokens: 600, text: { format: { type: "json_schema", strict: true } } });
    expect(request).not.toHaveProperty("tools"); expect(request).not.toHaveProperty("previous_response_id");
    expect(JSON.parse(request.input)).toEqual({ tone: "consultative", companyName: f.company.name.state === "known" ? f.company.name.data.value : "", approvedServiceDescription: "Sites profissionais da AG [TESTE]" });
    expect(JSON.stringify(request)).not.toContain("https://empresa.example");
    const copied = await f.restart()({ ...scope, operation: "copy_permission", templateId, tone: "consultative", draftToken: result.data.draft.draftToken }, signal());
    expect(copied).toMatchObject({ ok: true, data: { copyAllowed: true, draft: null } });
    expect(await f.restart()(command, signal())).toMatchObject({ ok: false, error: { code: "limit_reached" } }); expect(fetch).toHaveBeenCalledTimes(1);
    const usage = await database.db.query<{ used_units: number }>("select used_units from public.usage_counters where workspace_id=$1 and resource='ai_generation'", [testWorkspace]); expect(usage.rows[0]!.used_units).toBe(1);
    const jobs = await database.db.query<{ state: string; attempts: number }>("select state,attempts from public.async_jobs where kind='ai_generation'"); expect(jobs.rows).toEqual([{ state: "completed", attempts: 1 }]);
    const saved = await database.db.query<{ count: number }>("select count(*)::int as count from public.ai_generations"); expect(saved.rows[0]!.count).toBe(0);
  });
  it("429 não vaza resposta/chave, não repete automaticamente e registra falha sem rascunho", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({ error: { message: "PRIVATE_PROVIDER_BODY_TEST", type: "rate_limit_error", code: "rate_limit_exceeded" } }), { status: 429, headers: { "Content-Type": "application/json" } }));
    const f = setup(fetch);
    const command = { workspaceId: testWorkspace, sourceId: f.sourceId, reference: f.company.reference.value, operation: "generate", templateId, tone: "direct", requestId: "b3000000-0000-4000-8000-000000000002" };
    const result = await f.service(command, signal());
    expect(result).toMatchObject({ ok: false, error: { code: "rate_limited" } }); expect(JSON.stringify(result)).not.toMatch(/PRIVATE_PROVIDER_BODY_TEST|SYNTHETIC_OPENAI_KEY/);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await f.restart()(command, signal())).toMatchObject({ ok: false, error: { code: "limit_reached" } }); expect(fetch).toHaveBeenCalledTimes(1);
    const failed = await database.db.query<{ state: string; attempts: number; error_code: string }>("select state,attempts,error_code from public.async_jobs where kind='ai_generation' and idempotency_key=$1", [`message:${command.requestId}`]);
    expect(failed.rows[0]).toEqual({ state: "failed", attempts: 1, error_code: "rate_limited" });
  });
});
