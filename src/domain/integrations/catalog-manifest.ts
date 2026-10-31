import { z } from "zod";
import { catalogLocationSchema, companySchema } from "./contracts";
import { licenseSchema, provenanceSchema, textDatumSchema } from "./data";

// Configuração exclusiva de operador. Este schema nunca é aceito por um endpoint público.
export const catalogManifestSchema = z.strictObject({
  version: z.literal(1),
  workspaces: z.array(z.strictObject({
    workspaceId: z.uuid(), licenses: z.array(licenseSchema).max(1000), provenance: z.array(provenanceSchema).max(20000),
    messageTemplates: z.array(z.strictObject({ templateId: z.uuid(), body: textDatumSchema })).max(100).optional(),
    sources: z.array(z.strictObject({
      id: z.uuid(), label: z.string().trim().min(1).max(100), provider: z.enum(["first_party", "licensed"]), crmReferencePolicyId: z.uuid().optional(),
      provenanceId: z.uuid(), locations: z.array(catalogLocationSchema).min(1).max(200), companies: z.array(companySchema).max(1000),
    })).max(10),
  })).max(20),
}).superRefine((manifest, context) => {
  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  if (!unique(manifest.workspaces.map((workspace) => workspace.workspaceId))) context.addIssue({ code: "custom", message: "Workspaces duplicados." });
  for (const workspace of manifest.workspaces) {
    if (!unique((workspace.messageTemplates ?? []).map((entry) => entry.templateId))) context.addIssue({ code: "custom", message: "Modelos duplicados." });
    if (!unique(workspace.sources.map((source) => source.id)) || !unique(workspace.provenance.map((record) => record.id)) || !unique(workspace.licenses.map((license) => license.id))) context.addIssue({ code: "custom", message: "Identificadores duplicados." });
    if ([...workspace.licenses, ...workspace.provenance].some((record) => record.workspaceId !== workspace.workspaceId)) context.addIssue({ code: "custom", message: "Evidência de outro workspace." });
    for (const source of workspace.sources) if (!unique(source.locations.map((location) => location.id))) context.addIssue({ code: "custom", message: "Regiões duplicadas." });
  }
});
export type CatalogManifest = z.infer<typeof catalogManifestSchema>;
