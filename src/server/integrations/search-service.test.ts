import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
vi.mock("server-only", () => ({}));
import { createSyntheticSearchManifest, searchLocationId, searchSourceId, searchTestWorkspace } from "../../../tests/fixtures/search-catalog.mjs";
import { catalogManifestSchema } from "@/domain/integrations/catalog-manifest";
import { CatalogConfigurationError, readOwnedRegistry } from "@/server/providers/owned/registry";
import { createSearchService } from "./search-service";
import { createSearchLimiter } from "./search-limits";
import { distanceKm } from "@/domain/integrations/catalog";
import { disabledIntegrationFlags } from "@/domain/integrations/flags";

let folder: string; let path: string;
const input = { operation: "search" as const, workspaceId: searchTestWorkspace, request: { sourceId: searchSourceId, locationId: searchLocationId, location: "Cidade Sintética [TESTE]", mode: "free" as const, term: "", radiusKm: "city" as const, pageSize: 20, cursor: null as string | null } };
const signal = () => new AbortController().signal;
const activeFlags = { ...disabledIntegrationFlags, catalogSearch: true, catalogDetails: true };
async function setup() {
  const registry = (await readOwnedRegistry(searchTestWorkspace, signal(), path))!;
  const authorize = vi.fn(async () => "10000000-0000-4000-8000-000000000001" as string | null);
  const read = vi.fn(async () => registry);
  const execute = createSearchService({ read, authorize, flags: () => activeFlags, now: () => new Date("2026-10-28T12:00:00Z") });
  return { registry, authorize, read, execute };
}
beforeAll(async () => { folder = await mkdtemp(join(tmpdir(), "ag-search-test-")); path = join(folder, "test.catalog.local.json"); await writeFile(path, JSON.stringify(createSyntheticSearchManifest())); });
afterAll(async () => { await unlink(path); await rmdir(folder); });

describe("busca autorizada em fonte própria/licenciada", () => {
  it("lê registro real do arquivo de operador sem dados no bundle; preserva escopo e atribuições", async () => {
    const f = await setup(); const options = await f.execute({ operation: "options", workspaceId: searchTestWorkspace }, signal());
    expect(options).toMatchObject({ ok: true, data: { sources: [{ label: "Catálogo SINTÉTICO de teste", locations: [{ radiusAvailable: true, attributions: [expect.stringContaining("SINTÉTICOS")] }] }] } });
    expect(JSON.stringify(options)).not.toContain("SYNTHETIC_NOT_A_REAL_LICENSE");
    const read = await readOwnedRegistry("00000000-0000-4000-8000-000000000002", signal(), path); expect(read).toBeNull();
  });
  it.each([["free", "", 75], ["category", "pizza", 25], ["keyword", "clínica odontológica", 25], ["keyword", "oficina mecânica", 25], ["keyword", "inexistente", 0]] as const)("modo %s termo %s: não exige nicho, encontra termos acentuados e deduplica", async (mode, term, count) => {
    const f = await setup(); const result = await f.execute({ ...input, request: { ...input.request, mode, term } }, signal());
    expect(result).toMatchObject({ ok: true, data: { total: { value: count, precision: "exact" }, geographicMatch: "approximate", state: count ? "partial" : "empty" } });
    if (result.ok && "items" in result.data) {
      expect(result.data.items).toHaveLength(Math.min(count, 20));
      expect(result.data.items.every((item) => item.rating.state === "not_provided")).toBe(true);
    }
  });
  it("limita 3 páginas/60 resultados, vincula cursor aos filtros e à revisão sem paginação de Nearby inventada", async () => {
    const f = await setup(); const first = await f.execute(input, signal());
    if (!first.ok || !("nextCursor" in first.data)) throw new Error("fixture");
    const cursor = first.data.nextCursor;
    const second = await f.execute({ ...input, request: { ...input.request, cursor } }, signal());
    if (!second.ok || !("nextCursor" in second.data)) throw new Error("fixture");
    const last = await f.execute({ ...input, request: { ...input.request, cursor: second.data.nextCursor } }, signal());
    expect(last).toMatchObject({ ok: true, data: { state: "limit_reached", nextCursor: null, total: { value: 75 } } });
    expect(await f.execute({ ...input, request: { ...input.request, mode: "keyword", term: "pizza", cursor } }, signal())).toMatchObject({ ok: false, error: { code: "invalid_input" } });
    expect(await f.execute({ ...input, request: { ...input.request, cursor: cursor?.replace(":20", ":60") } }, signal())).toMatchObject({ ok: false });
    f.registry.revision = "changed";
    expect(await f.execute({ ...input, request: { ...input.request, cursor } }, signal())).toMatchObject({ ok: false, error: { code: "invalid_input" } });
  });
  it("raio usa coordenadas aprovadas e declara ausência, sem converter raio em município", async () => {
    const f = await setup(); const result = await f.execute({ ...input, request: { ...input.request, radiusKm: 10 } }, signal());
    expect(result).toMatchObject({ ok: true, data: { geographicMatch: "exact", excludedWithoutCoordinates: 1, scope: expect.stringContaining("não é limite municipal") } });
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111.195, 2);
    expect(distanceKm({ latitude: 0, longitude: 179.99 }, { latitude: 0, longitude: -179.99 })).toBeLessThan(3);
    expect(await f.execute({ ...input, request: { ...input.request, locationId: undefined, radiusKm: 25 } }, signal())).toMatchObject({ ok: false, error: { code: "invalid_input" } });
  });
  it("nicho inválido, paginação ilimitada e campos arbitrários são recusados no servidor", async () => {
    const f = await setup();
    for (const request of [{ ...input.request, mode: "category", term: "all" }, { ...input.request, pageSize: 21 }, { ...input.request, provider: "first_party" }, { ...input.request, term: "a".repeat(101) }]) expect(await f.execute({ ...input, request }, signal())).toMatchObject({ ok: false, error: { code: "invalid_input" } });
  });
  it("não transforma fonte ausente/falha em zero nem ativa demonstração", async () => {
    const f = await setup(); f.read.mockResolvedValueOnce(null as never);
    expect(await f.execute(input, signal())).toMatchObject({ ok: false, error: { code: "not_configured" } });
    f.read.mockRejectedValueOnce(new Error("PRIVATE_PROVIDER_BODY"));
    expect(await f.execute(input, signal())).toEqual({ ok: false, error: { code: "provider_unavailable", message: "Não foi possível consultar a fonte neste momento." } });
    expect(await readOwnedRegistry(searchTestWorkspace, signal(), "")).toBeNull();
    expect(await readOwnedRegistry(searchTestWorkspace, signal(), "\\\\remote\\share")).toBeNull();
  });
  it("bloqueia origem Google inclusive após cópia e não faz fetch", async () => {
    const f = await setup(); const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network forbidden"));
    const company = f.registry.snapshot.catalogs.get(searchSourceId)![0]!;
    if (company.name.state !== "known") throw new Error("fixture");
    const id = company.name.data.provenanceId; const records = f.registry.snapshot.provenance as Map<string, NonNullable<ReturnType<typeof f.registry.snapshot.provenance.get>>>;
    const original = records.get(id)!;
    records.set(id, { ...original, provider: "google_places", method: "manual_copy", parentIds: [original.id] });
    expect(await f.execute(input, signal())).toMatchObject({ ok: false, error: { code: "permission_denied" } });
    expect(fetch).not.toHaveBeenCalled(); fetch.mockRestore();
  });
  it("revalida associação no fim, recusa workspace alheio e flags fechadas", async () => {
    const f = await setup(); f.authorize.mockResolvedValueOnce(null);
    expect(await f.execute(input, signal())).toMatchObject({ ok: false, error: { code: "access_denied" } }); expect(f.read).not.toHaveBeenCalled();
    f.authorize.mockResolvedValueOnce("user").mockResolvedValueOnce("user").mockResolvedValueOnce(null);
    expect(await f.execute(input, signal())).toMatchObject({ ok: false, error: { code: "access_denied" } });
    expect(await f.execute({ ...input, workspaceId: "00000000-0000-4000-8000-000000000002" }, signal())).toMatchObject({ ok: false, error: { code: "access_denied" } });
    expect(await createSearchService({ authorize: f.authorize, flags: () => disabledIntegrationFlags })(input, signal())).toMatchObject({ ok: false, error: { code: "feature_disabled" } });
  });
  it("detalhes são consultados sob demanda; licença revogada não revela conteúdo", async () => {
    const f = await setup(); const request = { sourceId: searchSourceId, reference: "OWN_SYNTHETIC_0" };
    expect(await f.execute({ operation: "details", workspaceId: searchTestWorkspace, request }, signal())).toMatchObject({ ok: true, data: { reference: { value: "OWN_SYNTHETIC_0" } } });
    const licenses = f.registry.snapshot.licenses as Map<string, NonNullable<ReturnType<typeof f.registry.snapshot.licenses.get>>>;
    const license = [...licenses.values()][0]!; licenses.set(license.id, { ...license, revokedAt: "2026-10-28T00:00:00Z" });
    expect(await f.execute({ operation: "details", workspaceId: searchTestWorkspace, request }, signal())).toMatchObject({ ok: false, error: { code: "permission_denied" } });
  });
  it("aceita fonte licenciada com evidência escopada, sem promovê-la a primeira parte", async () => {
    const f = await setup();
    const provenance = new Map([...f.registry.snapshot.provenance].map(([id, record]) => [id, { ...record, provider: "licensed" as const }]));
    const licenses = new Map([...f.registry.snapshot.licenses].map(([id, license]) => [id, { ...license, provider: "licensed" as const }]));
    const sources = f.registry.sources.map((source) => ({ ...source, provider: "licensed" as const }));
    f.read.mockResolvedValue({ ...f.registry, sources, snapshot: { ...f.registry.snapshot, provenance, licenses, sources: f.registry.snapshot.sources.map((source) => ({ ...source, provider: "licensed" })) } });
    expect(await f.execute({ ...input, request: { ...input.request, mode: "category", term: "dental" } }, signal())).toMatchObject({ ok: true, data: { total: { value: 25 } } });
    expect([...licenses.values()][0]?.provider).toBe("licensed");
  });
  it("arquivo ausente/inválido é configuração pendente e não recebe repetição transitória", async () => {
    const f = await setup(); f.read.mockRejectedValueOnce(new CatalogConfigurationError());
    expect(await f.execute(input, signal())).toMatchObject({ ok: false, error: { code: "not_configured" } });
    await expect(readOwnedRegistry(searchTestWorkspace, signal(), join(folder, "absent.json"))).rejects.toBeInstanceOf(CatalogConfigurationError);
  });
  it("cancela sem ler fonte, distingue timeout e recusa manifesto sem escopo", async () => {
    const f = await setup(); const controller = new AbortController(); controller.abort();
    expect(await f.execute(input, controller.signal)).toMatchObject({ ok: false, error: { code: "cancelled" } }); expect(f.read).not.toHaveBeenCalled();
    f.read.mockImplementationOnce(async () => { throw new Error("private"); });
    const timeout = new AbortController(); timeout.abort(new DOMException("expired", "TimeoutError"));
    expect(await f.execute(input, timeout.signal)).toMatchObject({ ok: false });
    const manifest = catalogManifestSchema.parse(createSyntheticSearchManifest());
    manifest.workspaces[0]!.provenance[0]!.workspaceId = "00000000-0000-4000-8000-000000000002";
    expect(catalogManifestSchema.safeParse(manifest).success).toBe(false);
  });
  it("limita concorrência, libera em término e aplica 60 ações/min por usuário/workspace/processo", () => {
    let time = 0; const acquire = createSearchLimiter(() => time);
    const first = acquire("user:workspace")!; const second = acquire("user:workspace")!;
    expect(acquire("user:workspace")).toBeNull(); first(); first(); second();
    for (let i = 0; i < 58; i++) acquire("user:workspace")!();
    expect(acquire("user:workspace")).toBeNull(); expect(acquire("other:workspace")).toBeTypeOf("function");
    time = 60_001; expect(acquire("user:workspace")).toBeTypeOf("function");
  });
});
