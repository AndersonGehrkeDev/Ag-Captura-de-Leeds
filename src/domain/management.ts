import { z } from "zod";
import { stages } from "@/features/crm/domain/crm";

export const campaignStatuses = { draft: "Rascunho", active: "Em organização", paused: "Pausada", completed: "Concluída", archived: "Arquivada" } as const;
export const contactStatuses = { planned: "Planejado", contacted: "Contato registrado", responded: "Resposta registrada", removed: "Removido" } as const;
export const resourceLabels = { company_search: "Buscas (contador)", website_audit: "Auditorias", ai_generation: "Gerações de IA", export: "Exportações (contador)" } as const;
const scope = { workspaceId: z.uuid() };
export const managementCommand = z.discriminatedUnion("operation", [
  z.strictObject({ ...scope, operation: z.literal("task_create"), title: z.string().trim().min(1).max(200), dueAt: z.iso.datetime({ offset: true }).nullable() }),
  z.strictObject({ ...scope, operation: z.literal("task_complete"), id: z.uuid(), complete: z.boolean() }),
  z.strictObject({ ...scope, operation: z.literal("template_save"), id: z.uuid().nullable(), expectedUpdatedAt: z.iso.datetime({ offset: true }).nullable(), name: z.string().trim().min(1).max(100), body: z.string().trim().min(1).max(10000), tone: z.enum(["professional", "consultative", "direct"]) }),
  z.strictObject({ ...scope, operation: z.literal("template_delete"), id: z.uuid(), expectedUpdatedAt: z.string().min(1).max(50) }),
  z.strictObject({ ...scope, operation: z.literal("template_copy"), id: z.uuid() }),
  z.strictObject({ ...scope, operation: z.literal("campaign_save"), id: z.uuid().nullable(), expectedUpdatedAt: z.iso.datetime({ offset: true }).nullable(), name: z.string().trim().min(1).max(150), description: z.string().trim().max(2000), templateId: z.uuid().nullable(), status: z.enum(["draft", "active", "paused", "completed", "archived"]) }),
  z.strictObject({ ...scope, operation: z.literal("campaign_add"), campaignId: z.uuid(), leadId: z.uuid() }),
  z.strictObject({ ...scope, operation: z.literal("campaign_contact"), campaignId: z.uuid(), id: z.uuid(), status: z.enum(["planned", "contacted", "responded", "removed"]), manualConfirmation: z.literal(true) }),
  z.strictObject({ ...scope, operation: z.literal("workspace_rename"), name: z.string().trim().min(2).max(120) }),
]);
export type ManagementCommand = z.infer<typeof managementCommand>;
export type OperationResult = { ok: boolean; message: string; copy?: string };
export type Consumption = { resource: keyof typeof resourceLabels; period_start: string; period_end: string; unit_limit: number; used_units: number; reserved_units: number };
export type ConsumptionReport = { rows: Consumption[]; available: boolean };
export type WorkspaceOverview = { stages: { stage: typeof stages[number]; count: number | null }[]; tasks: number | null; campaigns: number | null; doNotContact: number | null };
export type WorkspaceTask = { id: string; title: string; due_at: string | null; completed_at: string | null; created_by: string; assigned_to: string | null };
export type MessageTemplate = { id: string; name: string; body: string; tone: "professional" | "consultative" | "direct"; updated_at: string };
export type Campaign = { id: string; name: string; description: string | null; template_id: string | null; status: keyof typeof campaignStatuses; updated_at: string };
export type CampaignContact = { id: string; lead_id: string; status: keyof typeof contactStatuses; updated_at: string; doNotContact: boolean | null; label: string };
