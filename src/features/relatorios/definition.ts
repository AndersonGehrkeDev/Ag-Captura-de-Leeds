import type { FeatureDefinition } from "../types";
export const relatorios = {
  id: "relatorios", label: "Relatórios",
  description: "Distribuição atual do funil, ganhos/perdas e contadores reais do workspace.",
  resources: ["supabase"],
} as const satisfies FeatureDefinition;
