import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getAuthConfiguration } from "@/server/auth/configuration";

// Exclusivo do caso de uso administrativo de convite. Não exporte um cliente privilegiado.
export async function sendAuthInvitation(email: string): Promise<"requested" | "unavailable" | "failed"> {
  const { publicConfig, origin } = getAuthConfiguration();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secret || !publicConfig || !origin) return "unavailable";
  let valid = secret.startsWith("sb_secret_");
  if (!valid) {
    try { valid = JSON.parse(Buffer.from(secret.split(".")[1] ?? "", "base64url").toString()).role === "service_role"; } catch { valid = false; }
  }
  if (!valid) return "unavailable";
  const admin = createClient(publicConfig.url, secret, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/auth/callback?next=/redefinir-senha` });
  return error ? "failed" : "requested";
}
