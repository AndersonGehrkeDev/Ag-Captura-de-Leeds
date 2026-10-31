import type { ResourceDefinition } from "@/domain/configuration";
import { credential, identifier } from "@/server/configuration/rules";

export const mapsDefinition = {
  id: "maps",
  label: "Google Maps",
  purpose: "Mapa real bloqueado para o caso de uso atual. Configurar a chave não concede permissão de uso.",
  fields: [
    { name: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", schema: credential },
    { name: "NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID", schema: identifier },
  ],
} as const satisfies ResourceDefinition;
