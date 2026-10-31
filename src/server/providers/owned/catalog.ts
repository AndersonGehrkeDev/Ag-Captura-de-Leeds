import "server-only";
import { createCatalogPorts } from "@/domain/integrations/catalog";
import type { CatalogLocation, CompanyRecord } from "@/domain/integrations/contracts";
import type { PolicyContext } from "@/domain/integrations/policy";

export function createOwnedCatalogAdapter(sourceId: string, provider: "first_party" | "licensed", context: PolicyContext, companies: readonly CompanyRecord[], locations?: readonly CatalogLocation[]) {
  return createCatalogPorts({ sourceId, provider, context, companies, locations });
}
