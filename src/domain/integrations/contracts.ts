import { z } from "zod";
import { numberDatumSchema, textDatumSchema, type GovernedDatum, type TextDatum } from "./data";

export const contractVersion = 2;
export const knownTextSchema = z.discriminatedUnion("state", [
  z.strictObject({ state: z.literal("known"), data: textDatumSchema }),
  z.strictObject({ state: z.enum(["not_provided", "not_checked", "lookup_failed"]) }),
]);
const knownNumberSchema = z.discriminatedUnion("state", [
  z.strictObject({ state: z.literal("known"), data: numberDatumSchema }),
  z.strictObject({ state: z.enum(["not_provided", "not_checked", "lookup_failed"]) }),
]);
export const coordinatesSchema = z.strictObject({ provenanceId: z.uuid(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
export const catalogLocationSchema = z.strictObject({ id: z.uuid(), city: textDatumSchema.extend({ value: z.string().trim().min(2).max(120) }), center: coordinatesSchema.nullable() });
export type CatalogLocation = z.infer<typeof catalogLocationSchema>;
export const companySchema = z.strictObject({
  reference: textDatumSchema, name: knownTextSchema, category: knownTextSchema,
  website: knownTextSchema, address: knownTextSchema, city: knownTextSchema,
  rating: knownNumberSchema, reviewCount: knownNumberSchema,
  coordinates: coordinatesSchema.nullable(),
  attributions: z.array(z.string().min(1).max(500)).max(30),
}).superRefine((company, ctx) => {
  if (company.reference.value.length > 512) ctx.addIssue({ code: "custom", path: ["reference"], message: "Referência excede o limite do produto." });
  for (const [field, max] of [["name", 200], ["category", 100], ["website", 2048], ["address", 500], ["city", 120]] as const) {
    const value = company[field];
    if (value.state === "known" && value.data.value.length > max) ctx.addIssue({ code: "custom", path: [field], message: "Campo excede o limite do contrato." });
  }
  if (company.rating.state === "known" && (company.rating.data.value < 0 || company.rating.data.value > 5)) ctx.addIssue({ code: "custom", path: ["rating"], message: "Avaliação inválida." });
  if (company.reviewCount.state === "known" && (!Number.isSafeInteger(company.reviewCount.data.value) || company.reviewCount.data.value < 0)) ctx.addIssue({ code: "custom", path: ["reviewCount"], message: "Contagem inválida." });
});
export type CompanyRecord = z.infer<typeof companySchema>;
export const searchRequestSchema = z.strictObject({
  sourceId: z.uuid(), mode: z.enum(["free", "category", "keyword"]),
  locationId: z.uuid().optional(),
  location: z.string().trim().min(2).max(120), term: z.string().trim().max(100),
  radiusKm: z.union([z.literal("city"), z.literal(10), z.literal(25), z.literal(50)]),
  pageSize: z.number().int().min(1).max(20), cursor: z.string().min(1).max(1024).nullable(),
}).superRefine((request, ctx) => {
  if (request.mode !== "free" && !request.term) ctx.addIssue({ code: "custom", path: ["term"], message: "Informe o nicho ou a palavra-chave." });
});
export const detailsRequestSchema = z.strictObject({ sourceId: z.uuid(), reference: z.string().min(1).max(512) });
export const searchPageSchema = z.strictObject({
  items: z.array(companySchema).max(20), nextCursor: z.string().max(1024).nullable(),
  total: z.discriminatedUnion("state", [z.strictObject({ state: z.literal("unknown") }), z.strictObject({ state: z.literal("known"), value: z.number().int().nonnegative(), precision: z.enum(["exact", "estimate"]) })]),
  geographicMatch: z.enum(["exact", "approximate", "not_evaluated"]),
});
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type DetailsRequest = z.infer<typeof detailsRequestSchema>;
export type SearchPage = z.infer<typeof searchPageSchema>;

// Só IDs de registros autorizados chegam da UI. URL e fatos são resolvidos no servidor.
export const auditRequestSchema = z.strictObject({ websiteProvenanceId: z.uuid(), strategy: z.enum(["mobile", "desktop"]) });
export const messageRequestSchema = z.strictObject({
  factProvenanceIds: z.array(z.uuid()).min(1).max(12), serviceProvenanceIds: z.array(z.uuid()).min(1).max(8),
  tone: z.enum(["professional", "consultative", "direct"]),
});
export const ownPersistenceRequestSchema = z.strictObject({
  leadId: z.uuid().nullable(), fields: z.array(z.strictObject({
    field: z.enum(["name", "category", "website_url", "address", "city", "note", "stage", "task"]), provenanceId: z.uuid(),
  })).min(1).max(8),
}).refine((request) => new Set(request.fields.map((field) => field.field)).size === request.fields.length, "Campos duplicados.");
export const auditReportSchema = z.strictObject({
  auditedAt: z.iso.datetime({ offset: true }), strategy: z.enum(["mobile", "desktop"]),
  metrics: z.array(z.strictObject({ name: z.enum(["performance_score", "lcp_ms", "cls", "inp_ms"]), origin: z.enum(["lab", "field"]), data: knownNumberSchema })).max(8),
  limitations: z.array(z.string().max(300)).min(1).max(10),
});
export const messageDraftSchema = z.strictObject({
  body: textDatumSchema, generatedAt: z.iso.datetime({ offset: true }), model: z.string().min(1).max(100),
  reviewRequired: z.literal(true), sent: z.literal(false), limitations: z.array(z.string().max(300)).max(10),
});
export type AuditRequest = z.infer<typeof auditRequestSchema>;
export type MessageRequest = z.infer<typeof messageRequestSchema>;
export type OwnPersistenceRequest = z.infer<typeof ownPersistenceRequestSchema>;
export type AuditReport = z.infer<typeof auditReportSchema>;
export type MessageDraft = z.infer<typeof messageDraftSchema>;

export const integrationErrorCodes = ["invalid_input", "access_denied", "feature_disabled", "permission_denied", "not_configured", "not_implemented", "provider_unavailable", "rate_limited", "not_found", "cancelled", "timeout", "limit_reached"] as const;
export type IntegrationErrorCode = typeof integrationErrorCodes[number];
export type IntegrationResult<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: { readonly code: IntegrationErrorCode; readonly message: string } };
const messages: Record<IntegrationErrorCode, string> = {
  cancelled: "Consulta cancelada. Você pode iniciar outra busca.", timeout: "A consulta excedeu o tempo disponível. Tente novamente.", limit_reached: "Limite desta busca atingido. Refine os filtros para uma nova consulta.",
  invalid_input: "Revise os parâmetros informados.", access_denied: "Acesso ao workspace não autorizado.", feature_disabled: "Capacidade desativada na configuração do servidor.",
  permission_denied: "A política da fonte não permite esta operação. Use dados próprios ou uma fonte licenciada.", not_configured: "O recurso precisa de configuração no servidor.",
  not_implemented: "Adaptador real ainda não conectado. Nenhuma consulta foi realizada.", provider_unavailable: "Não foi possível consultar a fonte neste momento.", rate_limited: "Limite de consultas atingido. Aguarde antes de tentar novamente.", not_found: "Registro autorizado não encontrado.",
};
export function integrationFailure<T = never>(code: IntegrationErrorCode): IntegrationResult<T> { return { ok: false, error: { code, message: messages[code] } }; }

export interface BusinessSearchPort { search(request: SearchRequest, signal?: AbortSignal): Promise<IntegrationResult<SearchPage>> }
export interface BusinessDetailsPort { details(request: DetailsRequest, signal?: AbortSignal): Promise<IntegrationResult<CompanyRecord>> }
export interface WebsiteAuditPort { audit(request: { website: TextDatum; strategy: AuditRequest["strategy"] }, signal?: AbortSignal): Promise<IntegrationResult<AuditReport>> }
export interface MessageGenerationPort { generate(request: { facts: readonly GovernedDatum[]; services: readonly TextDatum[]; tone: MessageRequest["tone"]; locale: "pt-BR"; maxOutputTokens: 600; store: false; background: false }, signal?: AbortSignal): Promise<IntegrationResult<MessageDraft>> }
export interface OwnDataPersistencePort { save(request: { leadId: string | null; fields: readonly { field: OwnPersistenceRequest["fields"][number]["field"]; data: GovernedDatum; deleteAt: string }[]; policyVersion: string }): Promise<IntegrationResult<{ id: string }>> }

// Sem `raw`, `payload`, dicionários abertos, HTML de avaliações ou URLs com chaves.
