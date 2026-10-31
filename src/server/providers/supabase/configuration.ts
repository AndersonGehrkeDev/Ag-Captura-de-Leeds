import type { ResourceDefinition } from "@/domain/configuration";
import { publishableKeySchema, supabaseUrlSchema } from "@/lib/supabase/public-config";

export const supabaseDefinition = {
  id: "supabase",
  label: "Supabase",
  purpose: "Autenticação e persistência do CRM com RLS.",
  fields: [
    { name: "NEXT_PUBLIC_SUPABASE_URL", schema: supabaseUrlSchema },
    { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", schema: publishableKeySchema },
  ],
} as const satisfies ResourceDefinition;
