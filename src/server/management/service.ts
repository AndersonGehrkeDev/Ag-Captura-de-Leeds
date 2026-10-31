import "server-only";
import { authorizeData, type PolicyContext } from "@/domain/integrations/policy";
import { getIntegrationFlags } from "@/server/integrations/configuration";
import { readOwnedRegistry } from "@/server/providers/owned/registry";
import { managementCommand, type OperationResult } from "@/domain/management";
import { applyManagement, managementContext, ManagementError } from "./repository";

export async function executeManagement(input: unknown, signal: AbortSignal): Promise<OperationResult> {
  const parsed = managementCommand.safeParse(input); if (!parsed.success) return { ok: false, message: "Revise os campos informados." };
  const command = parsed.data;
  try {
    const context = await managementContext(command.workspaceId); signal.throwIfAborted();
    if (command.operation === "template_copy") {
      const { data: template, error } = await context.client.from("message_templates").select("body").eq("workspace_id", command.workspaceId).eq("id", command.id).is("archived_at", null).maybeSingle();
      const registry = await readOwnedRegistry(command.workspaceId, signal);
      const binding = registry?.snapshot.messageTemplates?.find((row) => row.templateId === command.id && row.body.value === template?.body);
      if (error || !template || !registry || !binding || !["service_description", "message_draft"].includes(registry.snapshot.provenance.get(binding.body.provenanceId)?.field ?? "")) throw new ManagementError("Cópia exige evidência de origem vigente vinculada ao corpo salvo. Criação ou digitação manual não concedem direitos sobre dados externos.");
      const policy: PolicyContext = { workspaceId: command.workspaceId, mode: "production", now: new Date(), flags: getIntegrationFlags(), licenses: registry.snapshot.licenses, provenance: registry.snapshot.provenance };
      const display = authorizeData(binding.body.provenanceId, "display", "message_draft", policy); const copy = authorizeData(binding.body.provenanceId, "export", "message_draft", policy);
      if (!display.allowed || !copy.allowed) throw new ManagementError("A origem deste modelo não permite cópia. Revise as evidências e FEATURE_DATA_EXPORT no servidor.");
      const credits = [...new Set([...display.attributions, ...copy.attributions])];
      return { ok: true, message: "Cópia autorizada. Revise e envie manualmente.", copy: template.body + (credits.length ? `\n\nCréditos: ${credits.join(" | ")}` : "") };
    }
    if (!["task_create", "task_complete"].includes(command.operation) && context.role === "member") throw new ManagementError("Somente administradores e proprietário podem realizar esta alteração.");
    if ((command.operation === "campaign_save" || command.operation === "template_save") && command.id && (!command.expectedUpdatedAt || Number.isNaN(Date.parse(command.expectedUpdatedAt)))) throw new ManagementError("Atualize o registro antes de editar.");
    const result = await applyManagement(command, context);
    if (result.error) throw new ManagementError(result.error.code === "23505" ? "Já existe um registro com esse nome ou lead nesta campanha." : result.error.code === "23503" ? "O modelo está em uso. Desvincule-o das campanhas ou registros antes de excluir." : result.error.code === "23514" ? "Operação recusada. Confira os campos e a preferência Não contatar." : "Operação recusada pelo banco. Confira suas permissões e atualize a página.");
    if (!result.data?.length) throw new ManagementError("Registro mudou ou não está disponível. Atualize antes de tentar novamente.");
    return { ok: true, message: "Alteração salva. Nenhum contato ou envio automático foi realizado." };
  } catch (error) { return { ok: false, message: error instanceof ManagementError ? error.message : signal.aborted ? "Tempo de espera excedido. Atualize antes de repetir." : "Operação indisponível. Confira configuração e tente novamente." }; }
}
