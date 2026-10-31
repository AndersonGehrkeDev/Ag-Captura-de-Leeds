import type { FeatureDefinition } from "../types";
export const ia = {
  id: "ia", label: "Mensagens com IA",
  description: "Prepare rascunhos comerciais para revisão, sem envio automático.",
  resources: ["openai"],
} as const satisfies FeatureDefinition;
