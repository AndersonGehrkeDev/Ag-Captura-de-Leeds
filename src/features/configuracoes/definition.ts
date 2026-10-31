import type { FeatureDefinition } from "../types";
export const configuracoes = {
  id: "configuracoes", label: "Configurações",
  description: "Consulte requisitos de ambiente por recurso, sem exibir credenciais.",
  resources: [],
} as const satisfies FeatureDefinition;
