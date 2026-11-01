import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { municipalityBounds, normalizeOverture, overtureTerm, searchOverture } from "./overture";
import { buildOpenManifest } from "./registry";
import { overtureSourceId } from "./model";

describe("Overture nacional sem API de créditos", () => {
  it("mantém origem CDLA, ausência e namespaces próprios; mapeia nichos sem SQL do cliente", () => {
    const cache = normalizeOverture([{ id: "11111111-1111-4111-8111-111111111111", name: "Empresa SINTÉTICA [TESTE]", category: "dental_clinic", subtype: "dental_clinic", website: null, address: null, latitude: -31.7, longitude: -52.3 }], "Pelotas — RS", "2026-10-31T12:00:00.000Z");
    expect(cache.records[0]).toMatchObject({ origin: "overture", reference: "overture/11111111-1111-4111-8111-111111111111", website: null });
    const manifest = buildOpenManifest(cache.records, "00000000-0000-4000-8000-000000000001", "10000000-0000-4000-8000-000000000001", "overture");
    expect(manifest.workspaces[0]!.sources[0]).toMatchObject({ id: overtureSourceId, provider: "licensed", companies: [{ rating: { state: "not_provided" } }] });
    expect(JSON.stringify(manifest)).not.toContain("OpenStreetMap");
    expect(overtureTerm({ mode: "category", term: "dental" }).category).toBe("dental|dentist");
    expect(overtureTerm({ mode: "keyword", term: "Padaria Central" })).toEqual({ category: "", name: "padaria central" });
    const duplicate = normalizeOverture(Array(2).fill({ id: "11111111-1111-4111-8111-111111111111", name: "Empresa SINTÉTICA [TESTE]", category: null, subtype: null, website: null, address: null, latitude: -31.7, longitude: -52.3 }), "Pelotas — RS", "2026-10-31T12:00:00.000Z");
    expect(duplicate.records).toHaveLength(1);
  });
  it.skipIf(process.env.AG_LIVE_OVERTURE_TEST !== "true")("consulta real controlada gratuita, somente por opt-in do operador", async () => {
    const result = await searchOverture("4314407", "Pelotas — RS", { mode: "category", term: "dental" }, AbortSignal.timeout(45000));
    expect(result.records.length).toBeGreaterThan(0); expect(result.records.length).toBeLessThanOrEqual(60);
    expect(result.records.every((record) => record.origin === "overture")).toBe(true);
    const manifest = buildOpenManifest(result.records, "00000000-0000-4000-8000-000000000001", "10000000-0000-4000-8000-000000000001", "overture");
    expect(manifest.workspaces[0]!.sources[0]!.companies).toHaveLength(result.records.length);
    console.info(JSON.stringify({ liveOverture: "passed", results: result.records.length, limited: result.limited }));
  }, 55000);
  it("resolve caixas oficiais localmente, incluindo município novo, sem geocoding externo", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("NETWORK_FORBIDDEN"));
    try {
      const pelotas = await municipalityBounds("4314407", new AbortController().signal);
      const novo = await municipalityBounds("5101837", new AbortController().signal);
      expect(pelotas[0]).toBeLessThan(pelotas[2]); expect(novo[1]).toBeLessThan(novo[3]);
      expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); }
  });
});
