import type { FeatureDefinition } from "../types";
export const crm = {
  id: "crm", label: "CRM",
  description: "Organize leads, notas e próximos passos comerciais.",
  resources: ["supabase"],
} as const satisfies FeatureDefinition;
