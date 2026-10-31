import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createTestDatabase, applyDevelopmentSeed } from "../../../scripts/db/database.mjs";
import { integrationFixture, testUser, testWorkspace } from "../../../tests/fixtures/integration-catalog";
import { auditJobSchema, type AuditJob } from "@/features/auditorias/domain/audit";
import { createPageSpeedAdapter } from "@/server/providers/google-pagespeed/adapter";
import { createAuditService, pageSpeedSourceReference } from "./service";
import type { AuditTaskRepository } from "./repository";

// Segredo e respostas SINTÉTICOS. Nenhuma consulta DNS, Google ou Supabase hospedado.
const executor = "e".repeat(64);
let database: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  database = await createTestDatabase(); await applyDevelopmentSeed(database.db);
  await database.db.query("insert into private.audit_executor_config(singleton,secret_sha256) values(true,encode(sha256(convert_to($1,'UTF8')),'hex'))", [executor]);
});
afterAll(async () => { await database.db.close(); });
const repository: AuditTaskRepository = {
  async task(workspaceId, action, args): Promise<AuditJob | null> {
    await database.db.exec("begin; set local role authenticated;");
    try {
      await database.db.query("select set_config('request.jwt.claim.sub',$1,true)", [testUser]);
      const result = await database.db.query<{ result: unknown }>("select public.ag_audit_task($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as result", [workspaceId, action, args.sourceId ?? null, args.websiteProvenanceId ?? null, args.strategy ?? "mobile", args.key ?? null, args.jobId ?? null, args.outcome ?? null, args.errorCode ?? null, args.executor ?? null]);
      await database.db.exec("commit");
      const value = result.rows[0]?.result; return value === null ? null : auditJobSchema.parse(value);
    } catch (error) { await database.db.exec("rollback"); throw error; }
  },
};
function setup(fetch: typeof globalThis.fetch) {
  const fixture = integrationFixture();
  const outputLicense = { ...fixture.license, id: "a1000000-0000-4000-8000-000000000001", provider: "pagespeed" as const, sourceReference: pageSpeedSourceReference, fields: ["audit_metric", "audit_recommendation"] as const, actions: ["display"] as const, purposes: ["website_audit"] as const, attribution: "Autorização SINTÉTICA de exibição PSI [TESTE]" };
  const licenses = new Map(fixture.snapshot.licenses); licenses.set(outputLicense.id, { ...outputLicense, fields: [...outputLicense.fields], actions: [...outputLicense.actions], purposes: [...outputLicense.purposes] });
  const snapshot = { ...fixture.snapshot, licenses };
  const options = { repository, authorize: async () => testUser, flags: () => fixture.context.flags, credentials: () => ({ key: "SYNTHETIC_PSI_KEY", executor }), now: () => fixture.context.now,
    registry: async () => ({ snapshot, sources: [], revision: "synthetic" }), target: async (value: string) => new URL(value),
    provider: (input: Parameters<typeof createPageSpeedAdapter>[0]) => createPageSpeedAdapter({ ...input, fetch }),
  };
  return { ...fixture, service: createAuditService(options), restart: () => createAuditService(options) };
}
const signal = () => new AbortController().signal;
describe("auditoria: resposta válida e falha com tarefa durável", () => {
  it("resposta válida mobile: notas disponíveis, recomendações, regra comercial separada e execução única", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({ lighthouseResult: {
      fetchTime: "2026-10-27T11:59:00.000Z", lighthouseVersion: "13.0.0 [TESTE]", requestedUrl: "https://empresa.example/", finalUrl: "https://empresa.example/",
      categories: { performance: { score: .72 }, accessibility: { score: 0 }, "best-practices": { score: null }, seo: { score: .91 } },
      audits: { "unused-javascript": { id: "unused-javascript", title: "Reduzir JavaScript não utilizado [TESTE]", score: .3, scoreDisplayMode: "numeric", details: { overallSavingsMs: 420 } }, "largest-contentful-paint": { score: 1, numericValue: 1800, scoreDisplayMode: "numeric" }, "cumulative-layout-shift": { score: 1, numericValue: .03, scoreDisplayMode: "numeric" } },
    } }), { status: 200 }));
    const f = setup(fetch);
    const created = await f.service({ operation: "create", workspaceId: testWorkspace, sourceId: f.sourceId, websiteProvenanceId: f.ids.website_url, requestId: "a3000000-0000-4000-8000-000000000001" }, signal());
    expect(created).toMatchObject({ ok: true, data: { job: { state: "pending", strategy: "mobile" }, report: null } });
    if (!created.ok || !created.data.job) throw new Error("fixture");
    // Outra instância do serviço recupera a tarefa pelo banco, sem fila em memória.
    const result = await f.restart()({ operation: "run", workspaceId: testWorkspace, jobId: created.data.job.id }, signal());
    expect(result).toMatchObject({ ok: true, data: { job: { state: "completed" }, report: { strategy: "mobile", measuredAt: "2026-10-27T11:59:00.000Z", scores: { performance: 72, accessibility: 0, bestPractices: null, seo: 91 }, commercial: { kind: "review_opportunity", evidenceIds: ["unused-javascript"] }, recommendations: [{ title: "Reduzir JavaScript não utilizado [TESTE]" }] } } });
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetch.mock.calls[0]![0])); expect(url.searchParams.get("strategy")).toBe("mobile"); expect(url.searchParams.get("locale")).toBe("pt-BR");
    expect(url.searchParams.has("key")).toBe(false); expect(fetch.mock.calls[0]![1]?.headers).toMatchObject({ "X-Goog-Api-Key": "SYNTHETIC_PSI_KEY" });
    expect(url.searchParams.getAll("category")).toHaveLength(4); expect(url.searchParams.get("fields")).not.toContain("screenshot");
    const status = await f.restart()({ operation: "status", workspaceId: testWorkspace, sourceId: f.sourceId, websiteProvenanceId: f.ids.website_url, strategy: "mobile" }, signal());
    expect(status).toMatchObject({ ok: true, data: { job: { state: "completed" }, report: null } });
    await f.service({ operation: "run", workspaceId: testWorkspace, jobId: created.data.job.id }, signal()); expect(fetch).toHaveBeenCalledTimes(1);
    const rows = await database.db.query<{ row: Record<string, unknown> }>("select to_jsonb(r) as row from private.audit_requests r where job_id=$1", [created.data.job.id]);
    expect(Object.keys(rows.rows[0]!.row).sort()).toEqual(["job_id", "outcome", "source_id", "strategy", "website_provenance_id"]);
  });
  it("falha 429 em desktop solicitado: estado falhou, sem nota zero, classificação ruim ou payload persistido", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('{"error":{"message":"PRIVATE_PROVIDER_BODY_TEST"}}', { status: 429 }));
    const f = setup(fetch);
    const created = await f.service({ operation: "create", workspaceId: testWorkspace, sourceId: f.sourceId, websiteProvenanceId: f.ids.website_url, strategy: "desktop", requestId: "a3000000-0000-4000-8000-000000000002" }, signal());
    if (!created.ok || !created.data.job) throw new Error("fixture");
    const result = await f.service({ operation: "run", workspaceId: testWorkspace, jobId: created.data.job.id }, signal());
    expect(result).toMatchObject({ ok: true, data: { job: { state: "failed", strategy: "desktop", errorCode: "rate_limited" }, report: null } });
    expect(fetch).toHaveBeenCalledTimes(1); expect(JSON.stringify(result)).not.toContain("PRIVATE_PROVIDER_BODY_TEST");
    const job = await database.db.query<{ state: string; attempts: number }>("select state,attempts from public.async_jobs where id=$1", [created.data.job.id]);
    expect(job.rows[0]).toMatchObject({ state: "failed", attempts: 1 });
    await f.restart()({ operation: "run", workspaceId: testWorkspace, jobId: created.data.job.id }, signal()); expect(fetch).toHaveBeenCalledTimes(1);
  });
});
