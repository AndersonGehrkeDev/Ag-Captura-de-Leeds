import type { FeatureDefinition } from "../types";
export const mapas = {
  id: "mapas", label: "Mapas",
  description: "Explore a localização das empresas e oportunidades.",
  resources: ["maps", "places"],
} as const satisfies FeatureDefinition;
