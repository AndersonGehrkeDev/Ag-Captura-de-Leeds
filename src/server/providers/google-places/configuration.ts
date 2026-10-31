import type { ResourceDefinition } from "@/domain/configuration";
import { credential } from "@/server/configuration/rules";

export const placesDefinition = {
  id: "places",
  label: "Google Places (New)",
  purpose: "Uso em prospecção bloqueado: a compatibilidade do produto e da conta com os termos precisa ser estabelecida.",
  fields: [{ name: "GOOGLE_PLACES_API_KEY", schema: credential }],
} as const satisfies ResourceDefinition;
