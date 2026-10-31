import type { ResourceDefinition } from "@/domain/configuration";
import { supabaseDefinition } from "@/server/providers/supabase/configuration";
import { placesDefinition } from "@/server/providers/google-places/configuration";
import { mapsDefinition } from "@/server/providers/google-maps/configuration";
import { pagespeedDefinition } from "@/server/providers/google-pagespeed/configuration";
import { openaiDefinition } from "@/server/providers/openai/configuration";
import { httpUrl } from "./rules";
import { applicationOrigin } from "@/domain/auth";

export const resourceDefinitions = [
  {
    id: "app", label: "Aplicação", purpose: "Endereço público da plataforma.",
    fields: [{ name: "NEXT_PUBLIC_APP_URL", schema: httpUrl().refine((value) => applicationOrigin(value) !== null), defaultValue: "http://localhost:3000" }],
  },
  supabaseDefinition, placesDefinition, mapsDefinition, pagespeedDefinition, openaiDefinition,
] as const satisfies readonly ResourceDefinition[];
