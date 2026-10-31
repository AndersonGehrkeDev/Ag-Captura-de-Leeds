import { z } from "zod";
import { integrationFailure, messageDraftSchema, type IntegrationErrorCode, type IntegrationResult } from "@/domain/integrations/contracts";

export function messageFailure(code: IntegrationErrorCode): IntegrationResult<never> {
  const descriptions: Partial<Record<IntegrationErrorCode, string>> = {
    provider_unavailable: "Não foi possível gerar um rascunho válido. Nenhuma mensagem foi enviada.",
    timeout: "O tempo de espera terminou. A tentativa pode ter sido consumida; não repetimos a chamada automaticamente.",
    limit_reached: "Esta tentativa já foi iniciada. Uma nova geração exige outra ação e disponibilidade de cota.",
    rate_limited: "Limite de uso atingido ou outra geração está em andamento. Aguarde e verifique a cota do workspace.",
    access_denied: "Sessão expirada ou acesso ao workspace não autorizado.",
    not_configured: "A geração precisa de OpenAI, modelo, executor, cota e fonte autorizada configurados no servidor.",
    permission_denied: "Fonte ou modelo sem permissão vigente para geração, exibição e cópia.",
  };
  const failure = integrationFailure(code); const description = descriptions[code];
  return !failure.ok && description ? { ok: false, error: { ...failure.error, message: description } } : failure;
}

export const toneSchema = z.enum(["professional", "consultative", "direct"]);
export const toneLabels = { professional: "Profissional", consultative: "Consultivo", direct: "Direto" } as const;
const scope = { workspaceId: z.uuid(), sourceId: z.uuid(), reference: z.string().min(1).max(512) };
export const commercialMessageCommandSchema = z.discriminatedUnion("operation", [
  z.strictObject({ ...scope, operation: z.literal("options") }),
  z.strictObject({ ...scope, operation: z.literal("generate"), templateId: z.uuid(), tone: toneSchema, requestId: z.uuid() }),
  z.strictObject({ ...scope, operation: z.literal("copy_permission"), templateId: z.uuid(), tone: toneSchema, draftToken: z.string().min(1).max(2000) }),
]);
export type CommercialMessageCommand = z.infer<typeof commercialMessageCommandSchema>;
// A IA escolhe a composição; não pode criar frases factuais livres sobre a empresa.
export const compositionSchema = z.strictObject({
  greeting: z.enum(["hello", "good_day"]), introduction: z.enum(["presentation", "invitation"]), closing: z.enum(["permission", "conversation"]),
});
export const commercialDraftSchema = messageDraftSchema.extend({
  body: z.strictObject({ provenanceId: z.uuid(), value: z.string().min(1).max(2000) }),
  templateId: z.uuid(), tone: toneSchema, draftToken: z.string().min(1).max(2000),
  attribution: z.array(z.string().max(500)).max(30),
});
export const messageOptionsSchema = z.strictObject({ templates: z.array(z.strictObject({ id: z.uuid(), label: z.string().max(100), service: z.string().max(500) })).max(100) });
export const commercialMessageResponseSchema = z.strictObject({ options: messageOptionsSchema.nullable(), draft: commercialDraftSchema.nullable(), copyAllowed: z.boolean() });
export type CommercialMessageResponse = z.infer<typeof commercialMessageResponseSchema>;
export type CommercialDraft = z.infer<typeof commercialDraftSchema>;

export function composeCommercialMessage(choice: z.infer<typeof compositionSchema>, tone: z.infer<typeof toneSchema>, name: string, service: string) {
  const introductions = {
    professional: { presentation: "Sou da equipe da AG Soluções Digitais.", invitation: "Represento a AG Soluções Digitais e gostaria de apresentar nossos serviços." },
    consultative: { presentation: "Faço parte da AG Soluções Digitais e gostaria de conhecer seus objetivos digitais.", invitation: "Aqui é da AG Soluções Digitais. Podemos conversar sobre seus planos para a presença digital?" },
    direct: { presentation: "Aqui é da AG Soluções Digitais.", invitation: "Gostaria de apresentar os serviços da AG Soluções Digitais." },
  };
  const closings = {
    professional: { permission: "Posso enviar mais informações para sua avaliação?", conversation: "Se houver interesse, podemos conversar sobre o escopo e suas necessidades." },
    consultative: { permission: "Faz sentido conhecer essa opção para avaliar se atende aos seus objetivos?", conversation: "Se fizer sentido, podemos conversar para entender suas prioridades, sem compromisso." },
    direct: { permission: "Posso enviar os detalhes?", conversation: "Há interesse em conversar sobre isso?" },
  };
  return `${choice.greeting === "hello" ? "Olá" : "Bom dia"}, equipe de ${name}!\n\n${introductions[tone][choice.introduction]}\n\nServiços que oferecemos: ${service}\n\n${closings[tone][choice.closing]}`;
}
