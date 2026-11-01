import "server-only";
import { z } from "zod";
import { catalogManifestSchema, type CatalogManifest } from "@/domain/integrations/catalog-manifest";
import type { DataField, ProvenanceRecord } from "@/domain/integrations/data";
import type { CompanyRecord } from "@/domain/integrations/contracts";
import { openDataEnabled } from "./configuration";
import { openDataRepository } from "./repository";
import { openDataId, openRecordSchema, osmCredit, osmPolicyId, osmSourceId, overtureCredit, overturePolicyId, overtureSourceId, type OpenRecord } from "./model";

export function buildOpenManifest(records: readonly OpenRecord[], workspaceId: string, reviewerId: string, origin: "osm" | "overture" = records[0]?.origin ?? "osm"): CatalogManifest {
  const overture = origin === "overture"; const credit = overture ? overtureCredit : osmCredit;
  const reference = overture ? "overture:places:cdla" : "openstreetmap:businesses"; const licenseId = openDataId(`${workspaceId}:${origin}:license`); const ibgeLicenseId = openDataId(`${workspaceId}:ibge-license`); const provenance: ProvenanceRecord[] = [];
  const approvedAt = "2026-10-31T00:00:00Z";
  function record(key: string, field: DataField, observedAt: string, parentIds: string[] = [], ibge = false) {
    const id = openDataId(`${workspaceId}:${key}:${field}`);
    provenance.push({ id, workspaceId, provider: "licensed", reference: ibge ? "ibge:municipalities" : reference, field, method: parentIds.length ? "derived" : "import", parentIds, licenseId: ibge ? ibgeLicenseId : licenseId, observedAt }); return id;
  }
  const sourceProvenance = record("source", "external_id", approvedAt);
  const cityFacts = new Map<string, string>();
  function cityFact(city: string) { if (!cityFacts.has(city)) cityFacts.set(city, record(`ibge:${city}`, "city", approvedAt, [], true)); return cityFacts.get(city)!; }
  const companies: CompanyRecord[] = records.map((r) => {
    function text(field: DataField, value: string | null): CompanyRecord["name"] { return value ? { state: "known", data: { provenanceId: record(r.reference, field, r.observedAt, field === "city" ? [cityFact(r.city), sourceProvenance] : []), value } } : { state: "not_provided" }; }
    return { reference: { provenanceId: record(r.reference, "external_id", r.observedAt), value: r.reference }, name: text("name", r.name), category: text("category", r.category),
      website: text("website_url", r.website), address: text("address", r.address), city: text("city", r.city), rating: { state: "not_provided" }, reviewCount: { state: "not_provided" },
      coordinates: { provenanceId: record(r.reference, "coordinates", r.observedAt), latitude: r.latitude, longitude: r.longitude },
      attributions: [credit, `Consulta: ${r.observedAt} · Dados abertos, sujeitos a ausência e desatualização.`] };
  });
  const cities = [...new Set(records.map((r) => r.city))].slice(0, 200);
  // Sem cidades consultadas, a localização técnica mantém o manifest válido, mas não é oferecida pela busca nacional.
  const locations = (cities.length ? cities : ["Brasil"]).map((city) => ({ id: openDataId(`cached-city:${city}`), city: { provenanceId: cityFact(city), value: city }, center: null }));
  return catalogManifestSchema.parse({ version: 1, workspaces: [{ workspaceId, provenance, licenses: [{ id: licenseId, workspaceId, provider: "licensed", sourceReference: reference,
    evidenceReference: overture ? "https://docs.overturemaps.org/attribution/#places" : "https://www.openstreetmap.org/copyright", approvedBy: reviewerId, approvedAt, validUntil: "2027-10-31T23:59:59Z", revokedAt: null,
    purposes: ["prospecting", "crm"], fields: ["external_id", "name", "category", "website_url", "address", "city", "coordinates"],
    actions: ["display", "persist"], retentionDays: 365, attribution: credit }, {
      id: ibgeLicenseId, workspaceId, provider: "licensed", sourceReference: "ibge:municipalities", evidenceReference: "https://www.gov.br/conecta/catalogo/apis/registro-referencia-municipios",
      approvedBy: reviewerId, approvedAt, validUntil: "2027-10-31T23:59:59Z", revokedAt: null, purposes: ["prospecting"], fields: ["city"], actions: ["display"], retentionDays: null,
      attribution: "Municípios: IBGE / API de Localidades · https://servicodados.ibge.gov.br/api/docs/localidades",
    }],
    sources: [{ id: overture ? overtureSourceId : osmSourceId, label: overture ? "Overture Maps — Brasil (dados abertos)" : "OpenStreetMap — Brasil (dados abertos)", provider: "licensed", crmReferencePolicyId: overture ? overturePolicyId : osmPolicyId,
      provenanceId: sourceProvenance, locations, companies }] }] });
}
export async function readOpenManifest(workspaceId: string, signal: AbortSignal) {
  if (!openDataEnabled(workspaceId)) return null;
  const reviewerId = z.uuid().parse(process.env.OPEN_DATA_REVIEWER_ID); signal.throwIfAborted();
  const origin = process.env.OPEN_DATA_PROVIDER === "overture" ? "overture" : "osm";
  const records = openRecordSchema.array().max(1000).parse(await openDataRepository(workspaceId, "list")).filter((record) => record.origin === origin); signal.throwIfAborted();
  return buildOpenManifest(records, workspaceId, reviewerId, origin);
}
