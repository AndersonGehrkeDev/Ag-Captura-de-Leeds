import "server-only";
import { createHash } from "node:crypto";
import { businessCategories } from "@/domain/integrations/categories";
import { integrationFailure, type IntegrationResult } from "@/domain/integrations/contracts";
import { searchApiRequestSchema, type LoadedSearchPage, type SearchApiData, type SearchOptions } from "@/domain/integrations/search-api";
import { authorizeData, type PolicyContext } from "@/domain/integrations/policy";
import { verifyIntegrationWorkspace } from "./access";
import { getIntegrationFlags } from "./configuration";
import { createIntegrationGateway } from "./gateway";
import { CatalogConfigurationError, readOwnedRegistry } from "@/server/providers/owned/registry";
import { openDataEnabled } from "@/server/providers/open-data/configuration";
import { executeOpenSearch } from "@/server/providers/open-data/search";

type Registry = NonNullable<Awaited<ReturnType<typeof readOwnedRegistry>>>;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32);
// Nenhuma conexão comercial. Budget por ação: até 3 páginas de 20, catálogo <=1000.
export function createSearchService(options: {
  authorize?: typeof verifyIntegrationWorkspace; read?: (workspaceId: string, signal: AbortSignal) => Promise<Registry | null>;
  flags?: typeof getIntegrationFlags; now?: () => Date;
} = {}) {
  const authorize = options.authorize ?? verifyIntegrationWorkspace;
  const flags = options.flags ?? getIntegrationFlags;
  return async function execute(input: unknown, signal: AbortSignal): Promise<IntegrationResult<SearchApiData>> {
    const parsed = searchApiRequestSchema.safeParse(input);
    if (!parsed.success) return integrationFailure("invalid_input");
    const command = parsed.data;
    try {
      if (!await authorize(command.workspaceId)) return integrationFailure("access_denied");
      if (signal.aborted) return integrationFailure(signal.reason?.name === "TimeoutError" ? "timeout" : "cancelled");
      if (!flags().catalogSearch) return integrationFailure("feature_disabled");
      if (openDataEnabled(command.workspaceId) && !process.env.OWNED_CATALOG_FILE && (command.operation === "options" || command.operation === "search")) {
        return executeOpenSearch(command, signal, { authorize, flags: flags() });
      }
      const registry = await (options.read ?? readOwnedRegistry)(command.workspaceId, signal);
      if (!registry) return integrationFailure("not_configured");
      if (registry.snapshot.workspaceId !== command.workspaceId) return integrationFailure("access_denied");
      const context: PolicyContext = { workspaceId: command.workspaceId, mode: "production", now: (options.now ?? (() => new Date()))(), flags: flags(), provenance: registry.snapshot.provenance, licenses: registry.snapshot.licenses };
      const display = (id: string, field?: "city" | "coordinates") => (!field || context.provenance.get(id)?.field === field) && authorizeData(id, "display", "prospecting", context).allowed;
      // Fontes/centros só aparecem se a política permitir, nunca inferidos da entrada do usuário.
      const available: SearchOptions = { sources: registry.sources.filter((source) =>
        context.provenance.get(source.provenanceId)?.provider === source.provider && display(source.provenanceId)
      ).map((source) => ({ id: source.id, label: source.label, locations: source.locations.filter((location) => display(location.city.provenanceId, "city")).map((location) => {
        const permission = authorizeData(location.city.provenanceId, "display", "prospecting", context);
        const centerPermission = location.center ? authorizeData(location.center.provenanceId, "display", "prospecting", context) : null;
        return { id: location.id, label: location.city.value, radiusAvailable: !!location.center && display(location.center.provenanceId, "coordinates"), attributions: [...new Set([...(permission.allowed ? permission.attributions : []), ...(centerPermission?.allowed ? centerPermission.attributions : [])])] };
      }) })).filter((source) => source.locations.length > 0) };
      if (command.operation === "options") return { ok: true, data: available };
      const selected = available.sources.find((source) => source.id === command.request.sourceId);
      if (!selected) return integrationFailure("permission_denied");
      const gateway = createIntegrationGateway({ readAuthorizedWorkspace: async () => registry.snapshot }, { authorize, flags, now: options.now });
      if (command.operation === "details") return await gateway.details(command.workspaceId, command.request, signal);
      if (command.operation === "maps_link") {
        const details = await gateway.details(command.workspaceId, command.request, signal);
        if (!details.ok) return details;
        const coordinates = details.data.coordinates;
        if (!coordinates) return integrationFailure("not_found");
        // Apenas navegação explícita com dados próprios/licenciados autorizados para transmissão.
        // Não consulta Maps/Places, não usa place_id e não altera a política de conteúdo Google.
        if (!authorizeData(coordinates.provenanceId, "export", "prospecting", context).allowed) return integrationFailure("permission_denied");
        const url = new URL("https://www.google.com/maps/search/");
        url.searchParams.set("api", "1"); url.searchParams.set("query", `${coordinates.latitude},${coordinates.longitude}`);
        if (signal.aborted || !await authorize(command.workspaceId)) return integrationFailure("access_denied");
        return { ok: true, data: { url: url.href } };
      }
      const request = command.request;
      if (!request.locationId || request.pageSize !== 20 || !selected.locations.some((location) => location.id === request.locationId) || (request.mode === "category" && !businessCategories.some((category) => category.id === request.term))) return integrationFailure("invalid_input");
      const location = registry.sources.find((source) => source.id === selected.id)!.locations.find((location) => location.id === request.locationId)!;
      if (request.radiusKm !== "city" && !selected.locations.find((entry) => entry.id === request.locationId)?.radiusAvailable) return integrationFailure("not_configured");
      const { cursor, ...query } = request;
      // Cursor vinculado aos filtros, workspace e revisão. Não é credencial nem token Google.
      const signature = hash([command.workspaceId, query, registry.revision]);
      let offset = 0;
      if (cursor) {
        const match = /^catalog:([a-f0-9]{32}):(20|40)$/.exec(cursor);
        if (!match || match[1] !== signature) return integrationFailure("invalid_input");
        offset = Number(match[2]);
      }
      const result = await gateway.search(command.workspaceId, { ...request, location: location.city.value, cursor: offset ? `offset:${offset}` : null }, signal);
      if (!result.ok) return result;
      const reached = !!result.data.nextCursor && offset >= 40;
      const excludedWithoutCoordinates = request.radiusKm === "city" ? 0 : registry.snapshot.catalogs.get(selected.id)?.filter((record) => !record.coordinates).length ?? 0;
      const page: LoadedSearchPage = {
        ...result.data, nextCursor: result.data.nextCursor && !reached ? `catalog:${signature}:${offset + 20}` : null,
        state: reached ? "limit_reached" : result.data.nextCursor || excludedWithoutCoordinates > 0 ? "partial" : result.data.items.length ? "complete" : "empty",
        excludedWithoutCoordinates,
        scopeAttributions: selected.locations.find((entry) => entry.id === request.locationId)?.attributions ?? [],
        scope: request.radiusKm === "city"
          ? "Correspondência da cidade declarada na fonte; sem verificação de divisa municipal. Resultados disponíveis no catálogo, sem censo de empresas."
          : `Restrição por distância de até ${request.radiusKm} km do centro cadastrado (${location.center?.latitude}, ${location.center?.longitude}); não é limite municipal nem trajeto viário.`,
      };
      if (signal.aborted) return integrationFailure("cancelled");
      // Reconsulta identidade/associação antes de entregar conteúdo, além da autorização de execução.
      if (!await authorize(command.workspaceId)) return integrationFailure("access_denied");
      return { ok: true, data: page };
    } catch (error) {
      return integrationFailure(signal.aborted ? signal.reason?.name === "TimeoutError" ? "timeout" : "cancelled" : error instanceof CatalogConfigurationError ? "not_configured" : "provider_unavailable");
    }
  };
}
