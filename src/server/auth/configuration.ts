import "server-only";
import { applicationOrigin } from "@/domain/auth";
import { parsePublicSupabaseConfig } from "@/lib/supabase/public-config";

export function getAuthConfiguration() {
  const publicConfig = parsePublicSupabaseConfig(process.env);
  const origin = applicationOrigin(process.env.NEXT_PUBLIC_APP_URL);
  return { publicConfig, origin, available: !!publicConfig && !!origin, allowSignup: process.env.AUTH_ALLOW_SIGNUP === "true" };
}
