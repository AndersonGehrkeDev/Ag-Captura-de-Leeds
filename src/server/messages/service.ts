import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { commercialDraftSchema, commercialMessageCommandSchema, messageFailure as integrationFailure, type CommercialMessageResponse } from "@/features/ia/domain/message";
import type { IntegrationResult } from "@/domain/integrations/contracts";
import { authorizeData, type PolicyContext } from "@/domain/integrations/policy";
import type { ProvenanceRecord } from "@/domain/integrations/data";
import { createIntegrationGateway } from "@/server/integrations/gateway";
import { verifyIntegrationWorkspace } from "@/server/integrations/access";
import { getIntegrationFlags } from "@/server/integrations/configuration";
import { readOwnedRegistry } from "@/server/providers/owned/registry";
import { createOpenAIMessageAdapter } from "@/server/providers/openai/adapter";
import { credential } from "@/server/configuration/rules";
import { MessageError, messageRepository, type MessageRepository } from "./repository";

export const openAIMessageSource = "openai-responses-v1";
const grantSchema = z.strictObject({ userId: z.uuid(), workspaceId: z.uuid(), hash: z.string().regex(/^[a-f0-9]{64}$/), expiresAt: z.number().int() });
const signature = (value: string, secret: string) => createHmac("sha256", secret).update(value).digest("base64url");
export function createMessageService(options: {
  authorize?: typeof verifyIntegrationWorkspace; registry?: typeof readOwnedRegistry; repository?: MessageRepository;
  provider?: typeof createOpenAIMessageAdapter; flags?: typeof getIntegrationFlags; now?: () => Date;
  credentials?: () => { key: string; model: string; executor: string };
} = {}) {
  const repository = options.repository ?? messageRepository;
  const authorize = options.authorize ?? verifyIntegrationWorkspace;
  const flags = options.flags ?? getIntegrationFlags;
  const now = options.now ?? (() => new Date());
  const credentials = options.credentials ?? (() => ({ key: process.env.OPENAI_API_KEY ?? "", model: process.env.OPENAI_MODEL ?? "", executor: process.env.MESSAGE_EXECUTOR_SECRET ?? "" }));
  async function resolve(workspaceId: string, sourceId: string, reference: string, signal: AbortSignal, templateId?: string) {
    const userId = await authorize(workspaceId); if (!userId) throw new MessageError("access_denied");
    if (!flags().aiMessages) throw new MessageError("feature_disabled");
    const keys = credentials(); if (!credential.safeParse(keys.key).success || !/^[a-zA-Z0-9_.:-]{1,100}$/.test(keys.model) || !/^[a-f0-9]{64}$/i.test(keys.executor)) throw new MessageError("not_configured");
    const registry = await (options.registry ?? readOwnedRegistry)(workspaceId, signal);
    if (!registry || registry.snapshot.workspaceId !== workspaceId) throw new MessageError("not_configured");
    const snapshot = registry.snapshot;
    const source = snapshot.sources.find((entry) => entry.id === sourceId && entry.workspaceId === workspaceId && ["first_party", "licensed"].includes(entry.provider));
    const company = snapshot.catalogs.get(sourceId)?.find((entry) => entry.reference.value === reference);
    const context: PolicyContext = { workspaceId, mode: "production", now: now(), flags: flags(), provenance: snapshot.provenance, licenses: snapshot.licenses };
    if (!source || !company || company.name.state !== "known" || snapshot.provenance.get(company.name.data.provenanceId)?.field !== "name" ||
      snapshot.provenance.get(source.provenanceId)?.provider !== source.provider || !authorizeData(source.provenanceId, "display", "prospecting", context).allowed) throw new MessageError("permission_denied");
    const name = company.name.data;
    if (name.value.length > 200 || /[\r\n<>\x00-\x1f]/.test(name.value)) throw new MessageError("invalid_input");
    const storedTemplates = await repository.templates(workspaceId);
    const available: { id: string; label: string; service: string }[] = [];
    let chosen: { input: Parameters<ReturnType<typeof createOpenAIMessageAdapter>["generate"]>[0]; outputId: string; credits: string[]; hash: string } | null = null;
    for (const binding of snapshot.messageTemplates ?? []) {
      const row = storedTemplates.find((entry) => entry.id === binding.templateId);
      if (!row || row.body !== binding.body.value || row.body.length > 500 || /[\r\n<>\x00-\x1f]/.test(row.body) || /garant|100\s*%|seu site|não (tem|possui)|conforme (conversamos|combinado)|contato anterior/i.test(row.body)) continue;
      if (snapshot.provenance.get(binding.body.provenanceId)?.field !== "service_description") continue;
      const values = new Map(snapshot.values); values.set(name.provenanceId, name); values.set(binding.body.provenanceId, binding.body);
      // Reutiliza a preparação/validação de fatos, serviços, tamanho e permissão de IA existentes.
      const prepared = await createIntegrationGateway({ readAuthorizedWorkspace: async () => ({ ...snapshot, values }) }, { authorize: async () => userId, flags, now }).prepareMessage(workspaceId, {
        factProvenanceIds: [name.provenanceId], serviceProvenanceIds: [binding.body.provenanceId], tone: "professional",
      });
      if (!prepared.ok) continue;
      let permitted: { outputId: string; credits: string[]; licenseId: string } | null = null;
      for (const license of context.licenses.values()) {
        if (license.provider !== "openai" || license.sourceReference !== openAIMessageSource) continue;
        const record: ProvenanceRecord = { id: randomUUID(), workspaceId, provider: "openai", reference: openAIMessageSource, field: "message_draft", method: "derived", parentIds: [name.provenanceId, binding.body.provenanceId], licenseId: license.id, observedAt: context.now.toISOString() };
        const provenance = new Map(snapshot.provenance); provenance.set(record.id, record);
        const display = authorizeData(record.id, "display", "message_draft", { ...context, provenance });
        const copy = authorizeData(record.id, "export", "message_draft", { ...context, provenance });
        if (display.allowed && copy.allowed) { permitted = { outputId: record.id, credits: [...new Set([...display.attributions, ...copy.attributions])], licenseId: license.id }; break; }
      }
      if (!permitted) continue;
      available.push({ id: row.id, label: `Modelo autorizado ${available.length + 1}`, service: row.body });
      if (templateId === row.id) chosen = { input: prepared.data, ...permitted, hash: createHash("sha256").update(JSON.stringify([registry.revision, workspaceId, sourceId, reference, row.id, name, binding.body, permitted.licenseId])).digest("hex") };
    }
    if (templateId && !chosen) throw new MessageError("permission_denied");
    return { userId, keys, available, chosen };
  }
  return async function execute(input: unknown, signal: AbortSignal): Promise<IntegrationResult<CommercialMessageResponse>> {
    const parsed = commercialMessageCommandSchema.safeParse(input); if (!parsed.success) return integrationFailure("invalid_input");
    const command = parsed.data; let jobId: string | null = null;
    try {
      const resolved = await resolve(command.workspaceId, command.sourceId, command.reference, signal, command.operation === "options" ? undefined : command.templateId);
      signal.throwIfAborted();
      if (command.operation === "options") return { ok: true, data: { options: { templates: resolved.available }, draft: null, copyAllowed: false } };
      const chosen = resolved.chosen; if (!chosen) throw new MessageError("permission_denied");
      if (command.operation === "copy_permission") {
        const parts = command.draftToken.split("."); const payload = parts[0] ?? ""; const mac = parts[1] ?? "";
        const expected = signature(payload, resolved.keys.executor);
        if (parts.length !== 2 || !/^[a-zA-Z0-9_-]{43}$/.test(mac) || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) throw new MessageError("permission_denied");
        const grant = grantSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
        if (grant.userId !== resolved.userId || grant.workspaceId !== command.workspaceId || grant.hash !== chosen.hash || grant.expiresAt <= now().getTime()) throw new MessageError("permission_denied");
        return { ok: true, data: { options: null, draft: null, copyAllowed: true } };
      }
      jobId = await repository.attempt(command.workspaceId, "start", { key: `message:${command.requestId}`, executor: resolved.keys.executor });
      if (!jobId) throw new MessageError("limit_reached");
      const beforeCall = await resolve(command.workspaceId, command.sourceId, command.reference, signal, command.templateId);
      if (beforeCall.chosen?.hash !== chosen.hash || beforeCall.userId !== resolved.userId) throw new MessageError("permission_denied");
      signal.throwIfAborted();
      const result = await (options.provider ?? createOpenAIMessageAdapter)({ key: resolved.keys.key, model: resolved.keys.model, outputId: chosen.outputId, now }).generate({ ...chosen.input, tone: command.tone }, signal);
      if (!result.ok) {
        await repository.attempt(command.workspaceId, "finish", { jobId, error: result.error.code === "rate_limited" ? "rate_limited" : "provider_unavailable", executor: resolved.keys.executor }); jobId = null;
        return integrationFailure(result.error.code);
      }
      const fresh = await resolve(command.workspaceId, command.sourceId, command.reference, signal, command.templateId);
      if (!fresh.chosen || fresh.chosen.hash !== chosen.hash || fresh.userId !== resolved.userId) throw new MessageError("permission_denied");
      signal.throwIfAborted();
      const payload = Buffer.from(JSON.stringify({ userId: fresh.userId, workspaceId: command.workspaceId, hash: chosen.hash, expiresAt: now().getTime() + 15 * 60_000 })).toString("base64url");
      const draft = commercialDraftSchema.parse({ ...result.data, body: { ...result.data.body, provenanceId: fresh.chosen.outputId }, templateId: command.templateId, tone: command.tone, attribution: fresh.chosen.credits, draftToken: `${payload}.${signature(payload, fresh.keys.executor)}` });
      await repository.attempt(command.workspaceId, "finish", { jobId, executor: resolved.keys.executor }); jobId = null;
      return { ok: true, data: { options: null, draft, copyAllowed: false } };
    } catch (error) {
      if (jobId) { try { await repository.attempt(command.workspaceId, "finish", { jobId, error: "internal_error", executor: credentials().executor }); } catch { /* Recuperação de lease na próxima ação; sem trabalho após resposta. */ } }
      return integrationFailure(error instanceof MessageError ? error.code : signal.aborted ? "timeout" : "provider_unavailable");
    }
  };
}
