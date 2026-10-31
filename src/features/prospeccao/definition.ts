import type { FeatureDefinition } from "../types";
export const prospeccao = {
  id: "prospeccao", label: "Prospecção",
  description: "Encontre empresas por região, categoria e palavras-chave.",
  resources: ["places"],
} as const satisfies FeatureDefinition;
