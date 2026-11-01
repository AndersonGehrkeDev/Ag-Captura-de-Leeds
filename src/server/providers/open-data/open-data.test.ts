import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { normalizeOverpass, overpassQuery, searchOverpass } from "./overpass";
import { buildOpenManifest } from "./registry";
import { openDataId, osmSourceId } from "./model";
import { authorizeData } from "@/domain/integrations/policy";
import { disabledIntegrationFlags } from "@/domain/integrations/flags";
import { executeOpenSearch } from "./search";
import { createTestDatabase, applyDevelopmentSeed } from "../../../../scripts/db/database.mjs";

const workspace = "00000000-0000-4000-8000-000000000001";
const otherWorkspace = "00000000-0000-4000-8000-000000000002";
const owner = "10000000-0000-4000-8000-000000000001";
const stamp = "2026-10-31T12:00:00.000Z";
const fixture = { elements: [{ type: "count", tags: { areas: "1" } }, { type: "node", id: 123, lat: -31.76, lon: -52.34,
  tags: { name: "Empresa SINTÉTICA [TESTE]", amenity: "dentist", website: "https://example.test", phone: "NUNCA COPIAR", email: "PRIVATE_TEST", "addr:street": "Rua sintética" } }] };
const flags = { ...disabledIntegrationFlags, catalogSearch: true, catalogDetails: true, ownPersistence: true, exports: true, aiMessages: true };
afterEach(() => vi.unstubAllEnvs());
describe("fonte aberta nacional, sem créditos", () => {
  it("constrói os três modos, limita resultado e recusa parâmetros capazes de alterar a consulta", () => {
    expect(overpassQuery("4314407", { mode: "free", term: "" })).toContain('area["ref:IBGE"="4314407"]');
    expect(overpassQuery("3550308", { mode: "category", term: "pizza" })).toContain('"cuisine"~"pizza"');
    expect(overpassQuery("1302603", { mode: "keyword", term: "clínica odontológica" })).toContain('"dentist"');
    expect(overpassQuery("4314407", { mode: "keyword", term: "Padaria" })).toContain('"name"~"Padaria"');
    expect(overpassQuery("4314407", { mode: "free", term: "" })).toContain("out body center 61;");
    expect(() => overpassQuery('4314407"];out;', { mode: "free", term: "" })).toThrow();
    expect(() => overpassQuery("4314407", { mode: "keyword", term: 'x"];out;' })).toThrow();
  });
  it("normaliza somente a allowlist e mantém ausência, erro e licença; não habilita exportação/IA", () => {
    const cache = normalizeOverpass(fixture, "Pelotas — RS", stamp);
    expect(JSON.stringify(cache)).not.toMatch(/NUNCA COPIAR|PRIVATE_TEST/);
    const manifest = buildOpenManifest(cache.records, workspace, owner).workspaces[0]!;
    const company = manifest.sources[0]!.companies[0]!;
    expect(company).toMatchObject({ rating: { state: "not_provided" }, reviewCount: { state: "not_provided" }, city: { data: { value: "Pelotas — RS" } } });
    const context = { workspaceId: workspace, mode: "production" as const, now: new Date(stamp), flags,
      provenance: new Map(manifest.provenance.map((p) => [p.id, p])), licenses: new Map(manifest.licenses.map((p) => [p.id, p])) };
    expect(authorizeData(company.reference.provenanceId, "persist", "crm", context).allowed).toBe(true);
    expect(authorizeData(company.reference.provenanceId, "export", "crm", context).allowed).toBe(false);
    expect(authorizeData(company.reference.provenanceId, "ai", "message_draft", context).allowed).toBe(false);
    expect(authorizeData(company.reference.provenanceId, "display", "crm", { ...context, workspaceId: otherWorkspace }).allowed).toBe(false);
    expect(() => normalizeOverpass({ elements: [] }, "Pelotas — RS", stamp)).toThrow();
    expect(() => normalizeOverpass({ ...fixture, remark: "runtime timeout" }, "Pelotas — RS", stamp)).toThrow();
  });
  it("honra 429 sem repetir chamadas e nunca devolve o corpo externo", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("PRIVATE_PROVIDER_BODY", { status: 429 }));
    await expect(searchOverpass("4314407", "Pelotas — RS", { mode: "free", term: "" }, new AbortController().signal, fetcher)).rejects.toMatchObject({ code: "rate_limited" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("consulta sob demanda, reaproveita cache e serve cidades de outros estados sem geocoding por tecla", async () => {
    vi.stubEnv("OPEN_DATA_REVIEWER_ID", owner);
    const cached = normalizeOverpass(fixture, "Manaus — AM", stamp);
    const repository = vi.fn().mockResolvedValue(cached); const provider = vi.fn();
    const authorize = vi.fn(async () => owner);
    const request = { sourceId: osmSourceId, locationId: openDataId("ibge:1302603"), location: "Ignorado pelo servidor", mode: "free" as const, term: "", radiusKm: "city" as const, pageSize: 20, cursor: null };
    const result = await executeOpenSearch({ operation: "search", workspaceId: workspace, request }, new AbortController().signal, { authorize, flags, repository, provider });
    expect(result).toMatchObject({ ok: true, data: { items: [{ name: { data: { value: "Empresa SINTÉTICA [TESTE]" } } }], total: { state: "unknown" }, scope: expect.stringContaining("1302603") } });
    expect(provider).not.toHaveBeenCalled(); expect(repository).toHaveBeenCalledTimes(1);
    const options = await executeOpenSearch({ operation: "options", workspaceId: workspace }, new AbortController().signal, { authorize, flags, repository, provider });
    if (!options.ok || !("sources" in options.data)) throw new Error("fixture");
    expect(options.data.sources[0]!.locations.length).toBeGreaterThan(5500);
    expect(options.data.sources[0]!.locations.some((city) => city.label === "São Paulo — SP")).toBe(true);
  });
  it("cache/limite SQL são duráveis, isolados e exigem sessão e prova do backend", async () => {
    const { db } = await createTestDatabase(); const proof = "f".repeat(64);
    try {
      await applyDevelopmentSeed(db);
      await db.query("insert into private.crm_executor_config(singleton,secret_sha256) values(true,encode(sha256(convert_to($1,'UTF8')),'hex'))", [proof]);
      async function call(ws: string, action: string, input: unknown = {}, secret = proof) {
        await db.exec("begin;set local role authenticated;");
        try { await db.query("select set_config('request.jwt.claim.sub',$1,true)", [owner]);
          const result = await db.query<{ result: unknown }>("select public.ag_open_data($1,$2,$3::jsonb,$4) result", [ws, action, JSON.stringify(input), secret]); await db.exec("commit"); return result.rows[0]!.result;
        } catch (error) { await db.exec("rollback"); throw error; }
      }
      await expect(call(otherWorkspace, "list")).rejects.toMatchObject({ code: "42501" });
      await expect(call(workspace, "reserve", {}, "bad")).rejects.toMatchObject({ code: "42501" });
      const first = await call(workspace, "reserve") as { allowed: boolean; token: string }; expect(first.allowed).toBe(true);
      expect(await call(workspace, "reserve")).toEqual({ allowed: false });
      const body = normalizeOverpass(fixture, "Pelotas — RS", new Date().toISOString());
      await call(workspace, "save", { token: first.token, key: "a".repeat(64), body });
      expect(await call(workspace, "cache", { key: "a".repeat(64) })).toEqual(body);
      expect(await call(workspace, "list")).toEqual(body.records);
      await call(workspace, "release", { token: first.token });
      await db.query("update private.open_search_gate set next_request_at='-infinity',used=100 where singleton");
      expect(await call(workspace, "reserve")).toEqual({ allowed: false });
    } finally { await db.close(); }
  });
});
