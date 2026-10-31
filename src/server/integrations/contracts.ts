import "server-only";
import type { CatalogLocation, CompanyRecord } from "@/domain/integrations/contracts";
import type { GovernedDatum, Provider, ProvenanceRecord, SourceLicense } from "@/domain/integrations/data";

export interface WorkspaceIntegrationSnapshot {
  readonly workspaceId: string;
  readonly sources: readonly { readonly id: string; readonly provider: Provider; readonly workspaceId: string; readonly provenanceId: string; readonly crmReferencePolicyId?: string }[];
  readonly provenance: ReadonlyMap<string, ProvenanceRecord>;
  readonly licenses: ReadonlyMap<string, SourceLicense>;
  readonly values: ReadonlyMap<string, GovernedDatum>;
  readonly messageTemplates?: readonly { readonly templateId: string; readonly body: import("@/domain/integrations/data").TextDatum }[];
  readonly catalogs: ReadonlyMap<string, readonly CompanyRecord[]>;
  readonly locations?: ReadonlyMap<string, readonly CatalogLocation[]>;
}
export interface IntegrationRegistryRepository {
  // Somente evidências aprovadas no servidor/por operador confiável. Nunca claims enviados pelo usuário.
  readAuthorizedWorkspace(workspaceId: string, userId: string): Promise<WorkspaceIntegrationSnapshot>;
}
