import "server-only";
import { integrationFailure, type MessageGenerationPort, type WebsiteAuditPort } from "@/domain/integrations/contracts";

// Portas legadas de planejamento, sem execução. Auditorias e mensagens reais são
// selecionadas somente pelos serviços protegidos em server/audits e server/messages.
export const pendingWebsiteAuditAdapter: WebsiteAuditPort = { async audit() { return integrationFailure("not_implemented"); } };
export const pendingMessageAdapter: MessageGenerationPort = { async generate() { return integrationFailure("not_implemented"); } };
