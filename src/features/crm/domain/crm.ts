import { z } from "zod";
import { integrationErrorCodes } from "@/domain/integrations/contracts";

export const crmErrorCodes = [...integrationErrorCodes, "conflict"] as const;
export type CrmErrorCode = typeof crmErrorCodes[number];
export type CrmResult<T> = { ok: true; data: T } | { ok: false; error: { code: CrmErrorCode; message: string } };

export const stages = ["new", "analysis", "contacted", "qualified", "proposal", "negotiation", "won", "lost"] as const;
export const stageSchema = z.enum(stages);
export const stageLabels: Record<typeof stages[number], string> = { new: "Novo", analysis: "Em análise", contacted: "Contato iniciado", qualified: "Qualificado", proposal: "Proposta enviada", negotiation: "Negociação", won: "Ganho", lost: "Perdido" };
export const crmMetadataSchema = z.strictObject({
  stage: stageSchema, assignedTo: z.uuid().nullable(), tags: z.array(z.string().trim().min(1).max(30)).max(12),
  doNotContact: z.boolean(), nextContactAt: z.iso.datetime({ offset: true }).nullable(),
});
const scope = { workspaceId: z.uuid() };
export const csvColumns = ["id", "name", "category", "website", "stage", "assignedTo", "nextContactAt", "doNotContact"] as const;
export const crmCommandSchema = z.discriminatedUnion("operation", [
  z.strictObject({ ...scope, operation: z.literal("list"), page: z.number().int().min(0).max(199).default(0) }),
  z.strictObject({ ...scope, operation: z.literal("details"), leadId: z.uuid() }),
  z.strictObject({ ...scope, operation: z.literal("manual"), label: z.string().trim().min(1).max(200), ...crmMetadataSchema.shape }),
  z.strictObject({ ...scope, operation: z.literal("add_source"), sourceId: z.uuid(), reference: z.string().min(1).max(512) }),
  z.strictObject({ ...scope, operation: z.literal("update"), leadId: z.uuid(), expectedUpdatedAt: z.iso.datetime({ offset: true }), ...crmMetadataSchema.shape }),
  z.strictObject({ ...scope, operation: z.literal("note"), leadId: z.uuid(), body: z.string().trim().min(1).max(4000), requestId: z.uuid() }),
  z.strictObject({ ...scope, operation: z.literal("export"), leadIds: z.array(z.uuid()).min(1).max(50), columns: z.array(z.enum(csvColumns)).min(1).max(8) }),
]);
export type CrmCommand = z.infer<typeof crmCommandSchema>;
export type CrmMetadata = z.infer<typeof crmMetadataSchema>;
export const bindingSchema = z.strictObject({ sourceId: z.uuid(), reference: z.string().max(512), provenanceId: z.uuid(), expiresAt: z.iso.datetime({ offset: true }), lineageIds: z.array(z.uuid()).max(128) });
export const rawLeadSchema = z.strictObject({
  id: z.uuid(), internalLabel: z.string().max(200), mode: z.enum(["legacy", "manual", "catalog"]),
  ...crmMetadataSchema.shape, createdAt: z.iso.datetime({ offset: true }), updatedAt: z.iso.datetime({ offset: true }), binding: bindingSchema.nullable(),
});
export type RawLead = z.infer<typeof rawLeadSchema>;
export const crmLeadSchema = rawLeadSchema.omit({ binding: true }).extend({
  name: z.string().max(200).nullable(), category: z.string().max(100).nullable(), website: z.string().max(2048).nullable(),
  sourceState: z.enum(["internal", "available", "unavailable", "unverified"]), attributions: z.array(z.string().max(500)).max(128),
});
export type CrmLead = z.infer<typeof crmLeadSchema>;
export const crmNoteSchema = z.strictObject({ id: z.uuid(), body: z.string().max(4000), createdBy: z.uuid(), createdAt: z.iso.datetime({ offset: true }) });
export const crmHistorySchema = z.strictObject({ id: z.uuid(), from: stageSchema.nullable(), to: stageSchema, changedBy: z.uuid().nullable(), createdAt: z.iso.datetime({ offset: true }) });
export const crmResponseSchema = z.strictObject({
  leads: z.array(crmLeadSchema).max(50), members: z.array(z.strictObject({ id: z.uuid(), name: z.string().max(100) })).max(500),
  hasMore: z.boolean(), leadId: z.uuid().nullable(), duplicate: z.boolean(),
  notes: z.array(crmNoteSchema).max(50), history: z.array(crmHistorySchema).max(50),
  csv: z.string().max(500000).nullable(), omittedCells: z.number().int().nonnegative(), exportedCount: z.number().int().min(0).max(50),
});
export type CrmResponse = z.infer<typeof crmResponseSchema>;
export const emptyCrmResponse: CrmResponse = { leads: [], members: [], hasMore: false, leadId: null, duplicate: false, notes: [], history: [], csv: null, omittedCells: 0, exportedCount: 0 };

export function csvCell(value: string) {
  // Aspas isoladas não neutralizam fórmulas: prefixar conteúdo perigoso após espaços/controles.
  const normalized = value.replace(/\u0000/g, "");
  const dangerous = /^[\s\p{Cc}\p{Cf}]*[=+\-@＝＋－＠]/u.test(normalized) || /^[\t\r\n]/.test(normalized);
  return `"${(dangerous ? "'" + normalized : normalized).replace(/"/g, '""')}"`;
}
