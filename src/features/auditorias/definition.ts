import type { FeatureDefinition } from "../types";
export const auditorias = {
  id: "auditorias", label: "Auditorias",
  description: "Analise a presença digital a partir de evidências verificáveis.",
  resources: ["pagespeed"],
} as const satisfies FeatureDefinition;
