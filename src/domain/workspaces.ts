import { z } from "zod";
export const invitationsSchema = z.array(z.object({ id: z.uuid(), workspace_id: z.uuid(), workspace_name: z.string().max(120), role: z.enum(["admin", "member"]), expires_at: z.string() })).max(500);
export const roleLabels = { owner: "Proprietário", admin: "Administrador", member: "Membro" } as const;
