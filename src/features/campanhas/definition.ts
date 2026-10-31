import type { FeatureDefinition } from "../types";
export const campanhas = {
  id: "campanhas", label: "Campanhas",
  description: "Organize leads e registre contatos manualmente, sem disparos automáticos.",
  resources: ["supabase"],
} as const satisfies FeatureDefinition;
