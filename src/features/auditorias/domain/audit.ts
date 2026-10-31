import { z } from "zod";
import { auditReportSchema } from "@/domain/integrations/contracts";

export const auditStates = ["pending", "processing", "completed", "inconclusive", "failed"] as const;
export const auditStateLabels = { pending: "Pendente", processing: "Processando", completed: "Concluída", inconclusive: "Inconclusiva", failed: "Falhou" } as const;
export const strategySchema = z.enum(["mobile", "desktop"]).default("mobile");
export const auditCommandSchema = z.discriminatedUnion("operation", [
  z.strictObject({ operation: z.literal("create"), workspaceId: z.uuid(), sourceId: z.uuid(), websiteProvenanceId: z.uuid(), strategy: strategySchema, requestId: z.uuid() }),
  z.strictObject({ operation: z.literal("run"), workspaceId: z.uuid(), jobId: z.uuid() }),
  z.strictObject({ operation: z.literal("status"), workspaceId: z.uuid(), sourceId: z.uuid(), websiteProvenanceId: z.uuid(), strategy: strategySchema }),
]);
export type AuditCommand = z.infer<typeof auditCommandSchema>;
export const auditJobSchema = z.strictObject({
  id: z.uuid(), workspaceId: z.uuid(), sourceId: z.uuid(), websiteProvenanceId: z.uuid(), strategy: z.enum(["mobile", "desktop"]),
  state: z.enum(auditStates), createdAt: z.string(), completedAt: z.string().nullable(), errorCode: z.string().nullable(),
});
export type AuditJob = z.infer<typeof auditJobSchema>;
export const siteAuditReportSchema = auditReportSchema.extend({
  measuredAt: z.iso.datetime({ offset: true }).nullable(), lighthouseVersion: z.string().max(60).nullable(),
  scores: z.strictObject({ performance: z.number().min(0).max(100).nullable(), accessibility: z.number().min(0).max(100).nullable(), bestPractices: z.number().min(0).max(100).nullable(), seo: z.number().min(0).max(100).nullable() }),
  recommendations: z.array(z.strictObject({ id: z.string().max(100), title: z.string().max(200), evidence: z.string().max(150), provenanceId: z.uuid() })).max(5),
  commercial: z.strictObject({ kind: z.enum(["review_opportunity", "no_opportunity_identified", "insufficient_evidence"]), evidenceIds: z.array(z.string().max(100)).max(5) }),
  attribution: z.array(z.string().max(500)).max(260),
});
export type SiteAuditReport = z.infer<typeof siteAuditReportSchema>;
export const auditResponseSchema = z.strictObject({ job: auditJobSchema.nullable(), report: siteAuditReportSchema.nullable() });
export type AuditResponse = z.infer<typeof auditResponseSchema>;
