import { z } from "zod";

export const providerSchema = z.enum(["first_party", "licensed", "google_places", "google_maps", "pagespeed", "openai", "demo", "supabase", "github", "vercel", "unknown"]);
export const actionSchema = z.enum(["display", "persist", "export", "ai"]);
export const purposeSchema = z.enum(["prospecting", "crm", "website_audit", "message_draft"]);
export const fieldSchema = z.enum(["external_id", "name", "category", "website_url", "address", "city", "coordinates", "rating", "review_count", "photo", "review", "audit_metric", "audit_recommendation", "message_draft", "note", "stage", "task", "service_description"]);
export type Provider = z.infer<typeof providerSchema>;
export type DataAction = z.infer<typeof actionSchema>;
export type Purpose = z.infer<typeof purposeSchema>;
export type DataField = z.infer<typeof fieldSchema>;
const reference = z.string().trim().min(1).max(200);
const date = z.iso.datetime({ offset: true });

// Registros resolvidos no servidor por ID. O cliente não pode declarar a própria licença/origem.
export const provenanceSchema = z.strictObject({
  id: z.uuid(), workspaceId: z.uuid(), provider: providerSchema, reference,
  field: fieldSchema, method: z.enum(["authored", "api", "import", "manual_copy", "derived"]),
  parentIds: z.array(z.uuid()).max(16), licenseId: z.uuid().nullable(), observedAt: date,
});
export type ProvenanceRecord = Readonly<z.infer<typeof provenanceSchema>>;
export const licenseSchema = z.strictObject({
  id: z.uuid(), workspaceId: z.uuid(), provider: z.enum(["first_party", "licensed", "pagespeed", "openai"]),
  sourceReference: reference, evidenceReference: reference,
  approvedBy: z.uuid(), approvedAt: date, validUntil: date, revokedAt: date.nullable(),
  purposes: z.array(purposeSchema).min(1).max(4), fields: z.array(fieldSchema).min(1).max(20),
  actions: z.array(actionSchema).min(1).max(4), retentionDays: z.number().int().min(1).max(3650).nullable(),
  attribution: z.string().trim().min(1).max(500).nullable(),
});
export type SourceLicense = Readonly<z.infer<typeof licenseSchema>>;

export const textDatumSchema = z.strictObject({ provenanceId: z.uuid(), value: z.string().trim().min(1).max(10000) });
export const numberDatumSchema = z.strictObject({ provenanceId: z.uuid(), value: z.number().finite() });
export type TextDatum = Readonly<z.infer<typeof textDatumSchema>>;
export type NumberDatum = Readonly<z.infer<typeof numberDatumSchema>>;
export type GovernedDatum = TextDatum | NumberDatum;

export function manualCopy(record: ProvenanceRecord, id: string): ProvenanceRecord {
  // Digitação/cópia muda o método de aquisição; mantém provedor, campo e ancestralidade.
  return provenanceSchema.parse({ ...record, id, method: "manual_copy", parentIds: [record.id] });
}

export function derivedRecord(input: {
  id: string; workspaceId: string; provider: "first_party" | "openai"; reference: string;
  field: DataField; parentIds: readonly string[]; licenseId: string; observedAt: string;
}): ProvenanceRecord {
  if (!input.parentIds.length) throw new Error("Conteúdo derivado exige proveniência de entrada.");
  return provenanceSchema.parse({ ...input, method: "derived" });
}
