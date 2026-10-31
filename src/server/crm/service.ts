import "server-only";
import { z } from "zod";
import { authorizeData, type PolicyContext } from "@/domain/integrations/policy";
import { crmCommandSchema, crmResponseSchema, rawLeadSchema, crmNoteSchema, crmHistorySchema, emptyCrmResponse, stageLabels, csvCell, type CrmErrorCode, type CrmLead, type CrmResponse, type CrmResult, type RawLead } from "@/features/crm/domain/crm";
import type { WorkspaceIntegrationSnapshot } from "@/server/integrations/contracts";
import { verifyIntegrationWorkspace } from "@/server/integrations/access";
import { getIntegrationFlags } from "@/server/integrations/configuration";
import { readOwnedRegistry } from "@/server/providers/owned/registry";
import { CrmError, crmRepository, type CrmRepository } from "./repository";

const rawPage = z.strictObject({ leads: z.array(rawLeadSchema).max(51), members: crmResponseSchema.shape.members, notes: z.array(crmNoteSchema).max(50), history: z.array(crmHistorySchema).max(50) });
const saved = z.strictObject({ leadId: z.uuid(), duplicate: z.boolean() });
export function crmFailure(code: CrmErrorCode): CrmResult<never> {
  const message = code === "access_denied" ? "Sessão expirada ou acesso ao workspace/lead não autorizado." : code === "conflict" ? "O registro mudou. Atualize os dados antes de salvar novamente." : code === "not_configured" ? "CRM precisa de Supabase, migração 009 e CRM_EXECUTOR_SECRET/hash configurados no servidor." : code === "feature_disabled" ? "Gravação ou exportação desativada na configuração do servidor." : code === "permission_denied" ? "A fonte não permite esta operação no CRM. Nenhum conteúdo restrito foi copiado." : code === "invalid_input" ? "Revise os campos informados e a origem dos dados." : "Não foi possível concluir a operação do CRM. Tente novamente.";
  return { ok: false, error: { code, message } };
}
function lineage(id: string, snapshot: WorkspaceIntegrationSnapshot): string[] {
  const ids = new Set<string>();
  function visit(key: string) { if (ids.has(key)) return; if (ids.size >= 128) throw new CrmError("permission_denied"); const record = snapshot.provenance.get(key); if (!record) throw new CrmError("permission_denied"); ids.add(key); record.parentIds.forEach(visit); }
  visit(id); return [...ids].sort();
}
export function createCrmService(options: {
  authorize?: typeof verifyIntegrationWorkspace; repository?: CrmRepository; registry?: typeof readOwnedRegistry;
  flags?: typeof getIntegrationFlags; executor?: () => string; now?: () => Date;
} = {}) {
  const authorize = options.authorize ?? verifyIntegrationWorkspace; const repository = options.repository ?? crmRepository;
  const flags = options.flags ?? getIntegrationFlags; const executor = options.executor ?? (() => process.env.CRM_EXECUTOR_SECRET ?? "");
  return async function execute(input: unknown, signal: AbortSignal): Promise<CrmResult<CrmResponse>> {
    const parsed = crmCommandSchema.safeParse(input); if (!parsed.success) return crmFailure("invalid_input");
    const command = parsed.data;
    try {
      const userId = await authorize(command.workspaceId); if (!userId) return crmFailure("access_denied");
      const proof = executor(); if (!/^[a-f0-9]{64}$/i.test(proof)) return crmFailure("not_configured");
      if (["manual", "add_source", "update", "note"].includes(command.operation) && !flags().ownPersistence) return crmFailure("feature_disabled");
      if (command.operation === "export" && !flags().exports) return crmFailure("feature_disabled");
      const call = (action: string, args: Parameters<CrmRepository["execute"]>[2]) => { signal.throwIfAborted(); return repository.execute(command.workspaceId, action, args, proof); };
      let registry: Awaited<ReturnType<typeof readOwnedRegistry>> | undefined; let registryRead = false;
      async function sourceData(sourceId: string, reference: string) {
        if (!registryRead) { registryRead = true; registry = await (options.registry ?? readOwnedRegistry)(command.workspaceId, signal); }
        if (!registry || registry.snapshot.workspaceId !== command.workspaceId) throw new CrmError("not_configured");
        const snapshot = registry.snapshot;
        const source = snapshot.sources.find((entry) => entry.id === sourceId && entry.workspaceId === command.workspaceId && ["first_party", "licensed"].includes(entry.provider));
        const company = snapshot.catalogs.get(sourceId)?.find((entry) => entry.reference.value === reference);
        if (!source || !company) throw new CrmError("permission_denied");
        const context: PolicyContext = { workspaceId: command.workspaceId, mode: "production", now: (options.now ?? (() => new Date()))(), flags: flags(), provenance: snapshot.provenance, licenses: snapshot.licenses };
        const record = snapshot.provenance.get(company.reference.provenanceId);
        if (record?.field !== "external_id" || record.provider !== source.provider || snapshot.provenance.get(source.provenanceId)?.provider !== source.provider || !authorizeData(source.provenanceId, "display", "prospecting", context).allowed || !authorizeData(company.reference.provenanceId, "display", "crm", context).allowed) throw new CrmError("permission_denied");
        const persist = authorizeData(company.reference.provenanceId, "persist", "crm", context);
        if (!persist.allowed || !persist.deleteAt) throw new CrmError("permission_denied");
        return { source, company, context, snapshot, persist, lineageIds: lineage(company.reference.provenanceId, snapshot) };
      }
      async function view(row: RawLead) {
        // Referência nativa/árvore de licença não fazem parte da projeção pública.
        const { binding: ignored, ...metadata } = row; void ignored;
        const safe: CrmLead = { ...metadata, name: null, category: null, website: null, sourceState: row.mode === "manual" ? "internal" : row.mode === "legacy" ? "unverified" : "unavailable", attributions: [] };
        let governed: Awaited<ReturnType<typeof sourceData>> | null = null;
        if (row.binding && new Date(row.binding.expiresAt) > (options.now ?? (() => new Date()))()) {
          try {
            governed = await sourceData(row.binding.sourceId, row.binding.reference);
            if (governed.company.reference.provenanceId !== row.binding.provenanceId || governed.lineageIds.join() !== [...row.binding.lineageIds].sort().join()) throw new CrmError("permission_denied");
            const credits = new Set<string>();
            for (const field of ["name", "category", "website"] as const) {
              const data = governed.company[field];
              if (data.state !== "known") continue;
              if (governed.context.provenance.get(data.data.provenanceId)?.field !== (field === "website" ? "website_url" : field)) continue;
              const decision = authorizeData(data.data.provenanceId, "display", "crm", governed.context);
              if (decision.allowed) { safe[field] = data.data.value; decision.attributions.forEach((credit) => credits.add(credit)); governed.company.attributions.forEach((credit) => credits.add(credit)); }
            }
            if (credits.size > 128) throw new CrmError("permission_denied");
            safe.sourceState = [safe.name, safe.category, safe.website].some((value) => value !== null) ? "available" : "unavailable"; safe.attributions = [...credits];
          } catch { governed = null; safe.name = null; safe.category = null; safe.website = null; safe.attributions = []; safe.sourceState = "unavailable"; }
        }
        return { lead: safe, governed, referenceExpiresAt: row.binding?.expiresAt ?? null };
      }
      if (command.operation === "manual" || command.operation === "update" || command.operation === "note") {
        const { operation, workspaceId: ignored, ...args } = command; void ignored;
        const result = saved.parse(await call(operation, command.operation === "manual" ? { ...args, label: command.label.normalize("NFKC") } : args));
        return { ok: true, data: { ...emptyCrmResponse, ...result } };
      }
      if (command.operation === "add_source") {
        const resolved = await sourceData(command.sourceId, command.reference);
        if (!resolved.source.crmReferencePolicyId) throw new CrmError("not_configured");
        // Somente ID autorizado e metadados de origem; nome/site/telefone/avaliação não são persistidos.
        if (!await authorize(command.workspaceId)) throw new CrmError("access_denied");
        const latest = await (options.registry ?? readOwnedRegistry)(command.workspaceId, signal);
        if (!latest || latest.revision !== registry?.revision) throw new CrmError("permission_denied");
        const result = saved.parse(await call("import", {
          sourceId: command.sourceId, reference: command.reference, provenanceId: resolved.company.reference.provenanceId,
          policyId: resolved.source.crmReferencePolicyId, provider: resolved.source.provider === "licensed" ? "authorized_import" : "first_party",
          expiresAt: resolved.persist.deleteAt, lineageIds: resolved.lineageIds,
          observedAt: resolved.snapshot.provenance.get(resolved.company.reference.provenanceId)!.observedAt,
        }));
        return { ok: true, data: { ...emptyCrmResponse, ...result } };
      }
      const data = rawPage.parse(await call(command.operation, command.operation === "list" ? { page: command.page } : command.operation === "details" ? { leadId: command.leadId } : { leadIds: [...new Set(command.leadIds)] }));
      const rows = []; for (const row of data.leads.slice(0, 50)) rows.push(await view(row));
      signal.throwIfAborted();
      if (command.operation === "export") {
        if (!await authorize(command.workspaceId)) throw new CrmError("access_denied");
        if (registry) { const fresh = await (options.registry ?? readOwnedRegistry)(command.workspaceId, signal); if (fresh?.revision !== registry.revision) throw new CrmError("permission_denied"); }
        signal.throwIfAborted();
        const columns = [...new Set(command.columns)]; const titles = { id: "ID do lead", name: "Nome autorizado da fonte", category: "Categoria autorizada", website: "Site autorizado", stage: "Etapa", assignedTo: "Responsável (ID)", nextContactAt: "Próximo contato (ISO)", doNotContact: "Não contatar" };
        const table: string[][] = [[...columns.map((column) => titles[column]), "Créditos exigidos pela fonte"]]; let omittedCells = 0;
        for (const { lead, governed, referenceExpiresAt } of rows) {
          // Vigência pode vencer sem mudar os bytes/revisão do manifesto. Reavaliar
          // após o último await, incluindo o prazo próprio da referência retida.
          const current = governed ? { ...governed.context, now: (options.now ?? (() => new Date()))() } : null;
          const retained = current && referenceExpiresAt && new Date(referenceExpiresAt) > current.now && governed
            && authorizeData(governed.company.reference.provenanceId, "persist", "crm", current).allowed;
          const credits = new Set<string>();
          const values = columns.map((column) => {
            if (["name", "category", "website"].includes(column)) {
              const data = governed?.company[column as "name" | "category" | "website"];
              if (retained && current && data?.state === "known" && governed && current.provenance.get(data.data.provenanceId)?.field === (column === "website" ? "website_url" : column)) {
                const permission = authorizeData(data.data.provenanceId, "export", "crm", current);
                const display = authorizeData(data.data.provenanceId, "display", "crm", current);
                if (permission.allowed && display.allowed) { permission.attributions.forEach((credit) => credits.add(credit)); governed.company.attributions.forEach((credit) => credits.add(credit)); return data.data.value; }
              }
              omittedCells++; return "";
            }
            return column === "stage" ? stageLabels[lead.stage] : column === "doNotContact" ? lead.doNotContact ? "Sim" : "Não" : String(lead[column as "id" | "assignedTo" | "nextContactAt"] ?? "");
          });
          table.push([...values, [...credits].join(" | ")]);
        }
        const csv = "\uFEFF" + table.map((row) => row.map(csvCell).join(";")).join("\r\n") + "\r\n";
        if (Buffer.byteLength(csv, "utf8") > 400000) throw new CrmError("limit_reached");
        return { ok: true, data: { ...emptyCrmResponse, csv, omittedCells, exportedCount: rows.length } };
      }
      return { ok: true, data: crmResponseSchema.parse({ ...emptyCrmResponse, ...data, leads: rows.map((row) => row.lead), hasMore: data.leads.length > 50, leadId: command.operation === "details" ? command.leadId : null }) };
    } catch (error) { return crmFailure(error instanceof CrmError ? error.code : signal.aborted ? "timeout" : "provider_unavailable"); }
  };
}
