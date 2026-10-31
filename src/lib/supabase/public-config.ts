import { z } from "zod";

export const supabaseUrlSchema = z.string().url().refine((value) => {
  try {
    const url = new URL(value);
    return !url.username && !url.password && !url.search && !url.hash && url.pathname === "/" &&
      (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)));
  } catch { return false; }
}, "Use HTTPS ou HTTP em loopback para desenvolvimento.");

export const publishableKeySchema = z.string().trim().min(20).refine((key) => {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  // Compatibilidade com projetos que ainda usam a chave anon JWT; nunca aceite service_role.
  try {
    const payload = JSON.parse(atob((key.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/")));
    return payload.role === "anon";
  } catch { return false; }
}, "Use uma chave publicável ou anon, nunca uma chave privilegiada.");

export type PublicSupabaseConfig = { url: string; key: string };
export function parsePublicSupabaseConfig(env: Readonly<Record<string, string | undefined>>): PublicSupabaseConfig | null {
  const url = supabaseUrlSchema.safeParse(env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const key = publishableKeySchema.safeParse(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim());
  return url.success && key.success ? { url: url.data, key: key.data } : null;
}
