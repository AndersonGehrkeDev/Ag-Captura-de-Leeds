// DADOS SINTÉTICOS DE TESTE. Não importar no runtime nem usar como evidência real.
export const searchTestWorkspace = "00000000-0000-4000-8000-000000000001";
export const searchSourceId = "d0000000-0000-4000-8000-000000000001";
export const searchLocationId = "d0000000-0000-4000-8000-000000000002";
export function createSyntheticSearchManifest() {
  const licenseId = "d1000000-0000-4000-8000-000000000001";
  const workspaceId = searchTestWorkspace; let count = 0; const provenance = [];
  function datum(field, value) {
    const id = `d2000000-0000-4000-8000-${String(++count).padStart(12, "0")}`;
    provenance.push({ id, workspaceId, provider: "first_party", reference: "synthetic-search-only", field, method: "authored", parentIds: [], licenseId, observedAt: "2026-10-01T00:00:00Z" });
    return { provenanceId: id, value };
  }
  const anchor = datum("external_id", "SYNTHETIC_SOURCE");
  const city = datum("city", "Cidade Sintética [TESTE]");
  const center = { provenanceId: datum("coordinates", "unused").provenanceId, latitude: -23.5, longitude: -46.6 };
  const companies = Array.from({ length: 75 }, (_, index) => {
    const category = ["Pizzaria", "Clínica odontológica", "Oficina mecânica"][index % 3];
    const reference = datum("external_id", `OWN_SYNTHETIC_${index}`);
    return { reference, name: { state: "known", data: datum("name", `${category} ${String(index + 1).padStart(2, "0")} [TESTE]`) }, category: { state: "known", data: datum("category", category) },
      city: { state: "known", data: city }, website: index % 2 ? { state: "known", data: datum("website_url", "https://company.example.test") } : { state: "not_provided" },
      address: { state: "not_checked" }, rating: { state: "not_provided" }, reviewCount: { state: "not_provided" },
      coordinates: index === 74 ? null : { provenanceId: datum("coordinates", "unused").provenanceId, latitude: -23.5 + index / 1000, longitude: -46.6 }, attributions: [],
    };
  });
  return { version: 1, workspaces: [{ workspaceId, licenses: [{ id: licenseId, workspaceId, provider: "first_party", sourceReference: "synthetic-search-only", evidenceReference: "SYNTHETIC_NOT_A_REAL_LICENSE", approvedBy: "10000000-0000-4000-8000-000000000001", approvedAt: "2026-10-01T00:00:00Z", validUntil: "2099-01-01T00:00:00Z", revokedAt: null, fields: ["external_id", "name", "category", "city", "website_url", "coordinates"], purposes: ["prospecting"], actions: ["display"], retentionDays: null, attribution: "Dados e autorização SINTÉTICOS de teste; sem consulta externa." }], provenance, sources: [{ id: searchSourceId, label: "Catálogo SINTÉTICO de teste", provider: "first_party", provenanceId: anchor.provenanceId, locations: [{ id: searchLocationId, city, center }], companies: [...companies, companies[0]] }] }] };
}
