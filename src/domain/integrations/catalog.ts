import { companySchema, detailsRequestSchema, integrationFailure, searchRequestSchema, type BusinessDetailsPort, type BusinessSearchPort, type CompanyRecord, type IntegrationResult, type SearchPage, type CatalogLocation } from "./contracts";
import { matchesCategory, normalizeSearchText } from "./categories";
import { authorizeData, providerDataPolicies, type PolicyContext } from "./policy";
import { providerSchema, type DataField, type Provider } from "./data";

const textFields = ["name", "category", "website", "address", "city"] as const;
const fieldNames = { name: "name", category: "category", website: "website_url", address: "address", city: "city", rating: "rating", reviewCount: "review_count" } as const;
function displayProjection(company: CompanyRecord, context: PolicyContext): CompanyRecord | null {
  const credits = new Set(company.attributions);
  function hasField(id: string, expected: DataField) {
    const decision = authorizeData(id, "display", "prospecting", context);
    if (context.provenance.get(id)?.field !== expected || !decision.allowed) return false;
    decision.attributions.forEach((credit) => credits.add(credit));
    return true;
  }
  if (!hasField(company.reference.provenanceId, "external_id")) return null;
  for (const field of [...textFields, "rating", "reviewCount"] as const) {
    const value = company[field];
    if (value.state === "known" && !hasField(value.data.provenanceId, fieldNames[field])) return null;
  }
  if (company.coordinates && !hasField(company.coordinates.provenanceId, "coordinates")) return null;
  if (credits.size > 30) return null; // Não truncar atribuições obrigatórias para caber no DTO.
  return { ...company, attributions: [...credits] };
}
export function canDisplayCompany(company: CompanyRecord, context: PolicyContext) {
  return displayProjection(company, context) !== null;
}
const normalize = normalizeSearchText;
const value = (company: CompanyRecord, field: typeof textFields[number]) => company[field].state === "known" ? company[field].data.value : "";

// Catálogo fornecido pelo chamador confiável. Nenhum fetch, scraping, geocoding ou fixture implícita.
export function createCatalogPorts(options: { sourceId: string; provider: Provider; context: PolicyContext; companies: readonly CompanyRecord[]; locations?: readonly CatalogLocation[] }): BusinessSearchPort & BusinessDetailsPort {
  function records(): IntegrationResult<CompanyRecord[]> {
    if (!providerSchema.safeParse(options.provider).success) return integrationFailure("permission_denied");
    if (providerDataPolicies[options.provider].productUse === "blocked") return integrationFailure("permission_denied");
    if ((options.provider === "demo") !== (options.context.mode === "demo")) return integrationFailure("permission_denied");
    const parsed = companySchema.array().max(1000).safeParse(options.companies);
    if (!parsed.success) return integrationFailure("permission_denied");
    const projected = parsed.data.map((company) => displayProjection(company, options.context));
    if (projected.some((company) => company === null)) return integrationFailure("permission_denied");
    return { ok: true, data: projected.filter((company) => company !== null) };
  }
  return {
    async search(input, signal) {
      if (signal?.aborted) return integrationFailure("cancelled");
      const parsed = searchRequestSchema.safeParse(input);
      if (!parsed.success || parsed.data.sourceId !== options.sourceId) return integrationFailure("invalid_input");
      if (options.context.mode === "production" && !options.context.flags.catalogSearch) return integrationFailure("feature_disabled");
      const location = options.locations?.find((entry) => entry.id === parsed.data.locationId);
      if (options.locations && !location) return integrationFailure("invalid_input");
      if (location && (options.context.provenance.get(location.city.provenanceId)?.field !== "city" || !authorizeData(location.city.provenanceId, "display", "prospecting", options.context).allowed)) return integrationFailure("permission_denied");
      if (parsed.data.radiusKm !== "city" && !location?.center) return integrationFailure("not_implemented");
      if (parsed.data.radiusKm !== "city" && location?.center && (options.context.provenance.get(location.center.provenanceId)?.field !== "coordinates" || !authorizeData(location.center.provenanceId, "display", "prospecting", options.context).allowed)) return integrationFailure("permission_denied");
      const found = records(); if (!found.ok) return found;
      const request = parsed.data;
      if (request.cursor && !/^offset:[0-9]{1,4}$/.test(request.cursor)) return integrationFailure("invalid_input");
      const offset = request.cursor ? Number(request.cursor.slice(7)) : 0;
      // Deduplicação pela referência nativa da fonte. Google/place_id continua bloqueado.
      const unique = [...new Map(found.data.map((company) => [company.reference.value, company])).values()];
      const filtered = unique.filter((company) => {
        const geographic = request.radiusKm === "city"
          ? location ? normalize(value(company, "city")) === normalize(location.city.value) : normalize(value(company, "city")).includes(normalize(request.location))
          : !!company.coordinates && !!location?.center && distanceKm(company.coordinates, location.center) <= request.radiusKm;
        const term = request.mode === "free" || (request.mode === "category" && location
          ? matchesCategory(value(company, "category"), request.term)
          : normalize(request.mode === "category" ? value(company, "category") : [value(company, "name"), value(company, "category")].join(" ")).includes(normalize(request.term)));
        return geographic && term;
      });
      if (offset > filtered.length) return integrationFailure("invalid_input");
      const next = offset + request.pageSize;
      const page: SearchPage = { items: filtered.slice(offset, next), nextCursor: next < filtered.length ? `offset:${next}` : null, total: { state: "known", value: filtered.length, precision: "exact" }, geographicMatch: request.radiusKm === "city" ? "approximate" : "exact" };
      return { ok: true, data: page };
    },
    async details(input, signal) {
      if (signal?.aborted) return integrationFailure("cancelled");
      const parsed = detailsRequestSchema.safeParse(input);
      if (!parsed.success || parsed.data.sourceId !== options.sourceId) return integrationFailure("invalid_input");
      if (options.context.mode === "production" && !options.context.flags.catalogDetails) return integrationFailure("feature_disabled");
      const found = records(); if (!found.ok) return found;
      const record = found.data.find((record) => record.reference.value === parsed.data.reference);
      return record ? { ok: true, data: record } : integrationFailure("not_found");
    },
  };
}

// Distância sobre esfera, em km; não calcula limites municipais nem trajetos viários.
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const term = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, term))));
}
