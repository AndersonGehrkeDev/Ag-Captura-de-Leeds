import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { authorizeData, type PolicyContext } from "@/domain/integrations/policy";
import { createCatalogPorts } from "@/domain/integrations/catalog";
import { integrationFailure, type IntegrationResult } from "@/domain/integrations/contracts";
import type { SearchApiData, SearchApiRequest } from "@/domain/integrations/search-api";
import type { IntegrationFlags } from "@/domain/integrations/flags";
import { municipalities } from "./municipalities";
import { buildOpenManifest } from "./registry";
import { openDataRepository } from "./repository";
import { OpenDataError, overpassQuery, searchOverpass } from "./overpass";
import { ibgeCredit, openCacheSchema, openDataId, osmCredit, osmSourceId, overtureCredit, overtureRelease, overtureSourceId, type OpenCache } from "./model";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function executeOpenSearch(command: SearchApiRequest & { operation: "options" | "search" }, signal: AbortSignal,
  context: { authorize: (workspaceId: string) => Promise<string | null>; flags: IntegrationFlags; repository?: typeof openDataRepository; provider?: typeof searchOverpass }): Promise<IntegrationResult<SearchApiData>> {
  const repository = context.repository ?? openDataRepository;
  try {
    const origin = process.env.OPEN_DATA_PROVIDER === "overture" ? "overture" : "osm";
    const overture = origin === "overture"; const sourceId = overture ? overtureSourceId : osmSourceId;
    const reviewerId = z.uuid().parse(process.env.OPEN_DATA_REVIEWER_ID);
    function governed(cache: Pick<OpenCache, "records">, emptyCity?: string) {
      const manifest = buildOpenManifest(cache.records, command.workspaceId, reviewerId, origin, emptyCity); const workspace = manifest.workspaces[0]!; const source = workspace.sources[0]!;
      const policy: PolicyContext = { workspaceId: command.workspaceId, mode: "production", now: new Date(), flags: context.flags,
        provenance: new Map(workspace.provenance.map((r) => [r.id, r])), licenses: new Map(workspace.licenses.map((l) => [l.id, l])) };
      return { source, policy };
    }
    const initial = governed({ records: [] });
    if (!authorizeData(initial.source.provenanceId, "display", "prospecting", initial.policy).allowed) return integrationFailure("permission_denied");
    const cities = await municipalities(signal);
    if (command.operation === "options") {
      if (!await context.authorize(command.workspaceId)) return integrationFailure("access_denied");
      return { ok: true, data: { sources: [{ id: sourceId, label: overture ? "Overture Maps — Brasil (dados abertos)" : "OpenStreetMap — Brasil (dados abertos)", locations: cities.map((city) => ({ id: city.id, label: city.label, radiusAvailable: false, attributions: [] })) }] } };
    }
    const request = command.request; const city = cities.find((entry) => entry.id === request.locationId);
    if (!context.flags.ownPersistence) return integrationFailure("feature_disabled");
    if (!authorizeData(initial.source.provenanceId, "persist", "prospecting", initial.policy).allowed) return integrationFailure("permission_denied");
    if (!city || request.sourceId !== sourceId || request.pageSize !== 20 || request.radiusKm !== "city") return integrationFailure("invalid_input");
    const query = overpassQuery(city.code, request); // Valida antes de reservar ou transmitir.
    const key = hash([origin, overture ? overtureRelease : "live", command.workspaceId, city.code, query]);
    const raw = await repository(command.workspaceId, "cache", { key });
    let cache = raw === null ? null : openCacheSchema.parse(raw);
    if (!cache) {
      if (request.cursor) return integrationFailure("invalid_input"); // Não repetir consulta externa por cursor vencido.
      const reservation = z.discriminatedUnion("allowed", [z.object({ allowed: z.literal(false) }), z.object({ allowed: z.literal(true), token: z.uuid() })]).parse(await repository(command.workspaceId, "reserve"));
      if (!reservation.allowed) throw new OpenDataError("rate_limited", "Aguarde alguns segundos entre buscas. A fonte gratuita aceita uma consulta por vez e até 100 novas consultas por dia nesta instalação; consultas em cache não consomem esse limite.");
      try {
        const provider = context.provider ?? (overture ? (await import("./overture")).searchOverture : searchOverpass);
        cache = await provider(city.code, city.label, request, signal);
        signal.throwIfAborted();
        if (!await context.authorize(command.workspaceId)) return integrationFailure("access_denied");
        const storing = governed(cache, city.label);
        // Cache também é persistência: validar cada campo e todos os ancestrais antes de gravar.
        for (const company of storing.source.companies) {
          const ids = [company.reference.provenanceId, ...[company.name, company.category, company.website, company.address, company.city].flatMap((field) => field.state === "known" ? [field.data.provenanceId] : []), ...(company.coordinates ? [company.coordinates.provenanceId] : [])];
          if (ids.some((id) => !authorizeData(id, "persist", "prospecting", storing.policy).allowed || !authorizeData(id, "display", "prospecting", storing.policy).allowed)) return integrationFailure("permission_denied");
        }
        await repository(command.workspaceId, "save", { key, token: reservation.token, body: cache });
      } finally { await repository(command.workspaceId, "release", { token: reservation.token }).catch(() => {}); }
    }
    signal.throwIfAborted();
    if (cache.records.some((record) => record.origin !== origin)) return integrationFailure("permission_denied");
    const { source, policy } = governed(cache, city.label);
    if (!authorizeData(source.provenanceId, "display", "prospecting", policy).allowed) return integrationFailure("permission_denied");
    const signature = hash([key, cache.observedAt]); let offset = 0;
    if (request.cursor) {
      const match = /^osm:([a-f0-9]{64}):(20|40)$/.exec(request.cursor);
      if (!match || match[1] !== signature) return integrationFailure("invalid_input"); offset = Number(match[2]);
    }
    if (offset > cache.records.length) return integrationFailure("invalid_input");
    const port = createCatalogPorts({ sourceId: source.id, provider: "licensed", context: policy, companies: source.companies, locations: source.locations });
    const page = await port.search({ ...request, mode: "free", term: "", location: city.label, locationId: openDataId(`cached-city:${city.label}`), cursor: offset ? `offset:${offset}` : null }, signal);
    if (!page.ok) return page;
    if (!await context.authorize(command.workspaceId)) return integrationFailure("access_denied");
    return { ok: true, data: { ...page.data, nextCursor: page.data.nextCursor ? `osm:${signature}:${offset + 20}` : null, total: { state: "unknown" },
      state: cache.limited && !page.data.nextCursor ? "limit_reached" : cache.limited || page.data.nextCursor ? "partial" : page.data.items.length ? "complete" : "empty", excludedWithoutCoordinates: 0,
      scope: overture ? `Cidade declarada na Overture e caixa envolvente da malha IBGE ${city.code}; não é teste exato da divisa nem censo. Release ${overtureRelease}, até 60 registros por consulta. Consulta: ${cache.observedAt}. Cache por até 24 horas.` : `Área municipal cadastrada no OSM pelo código IBGE ${city.code}; sem garantia de divisa oficial ou cobertura completa. Até 60 registros por consulta, sem varredura. Consulta: ${cache.observedAt}. Cache por até 24 horas.`,
      scopeAttributions: [overture ? overtureCredit : osmCredit, ibgeCredit] } };
  } catch (error) {
    if (!signal.aborted) {
      // Somente categorias fechadas/SQLSTATE, nunca erro bruto, URL, argumento RPC ou conteúdo externo.
      const supplied = error && typeof error === "object" && "diagnostic" in error && typeof error.diagnostic === "string" ? error.diagnostic : "";
      const safeDiagnostic = /^(?:(?:geography|temporary_directory|engine_create|engine_connect|engine_setup|data_query|data_projection)_(?:projection|duckdb_extension|duckdb_memory|duckdb_tls|duckdb_http403|duckdb_http404|duckdb_network|duckdb_schema|duckdb_runtime)|ibge_http_[345]\d\d|db_[A-Z0-9]{5,12})$/.test(supplied) ? supplied : null;
      const diagnostic = safeDiagnostic ?? (error instanceof OpenDataError ? error.code : error instanceof Error && error.name === "ZodError" ? "manifest_schema" : error instanceof Error && /module|binding|shared object/i.test(error.message) ? "adapter_load" : error instanceof SyntaxError ? "response_json" : "unexpected");
      console.warn(`ag_open_data_failure:${diagnostic}`);
    }
    const failure = integrationFailure(error instanceof OpenDataError ? error.code : signal.aborted ? signal.reason?.name === "TimeoutError" ? "timeout" : "cancelled" : "provider_unavailable");
    return error instanceof OpenDataError && error.publicMessage && !failure.ok ? { ok: false, error: { ...failure.error, message: error.publicMessage } } : failure;
  }
}
