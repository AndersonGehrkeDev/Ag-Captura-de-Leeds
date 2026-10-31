import { describe, expect, it } from "vitest";
import { applicationOrigin, passwordSchema, safeRedirect } from "./auth";
import { parsePublicSupabaseConfig } from "@/lib/supabase/public-config";

describe("fronteiras de autenticação", () => {
  it.each([undefined, "", "not-a-url"])("configuração ausente/inválida não lança erro: %s", (value) => expect(parsePublicSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: value, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" })).toBeNull());
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/%2f%2fevil.test", "/perfil?next=https://evil.test", "/auth/callback", "/prospeccao\n", ["/perfil"], null])("recusa destino não autorizado: %j", (value) => {
    expect(safeRedirect(value)).toBe("/prospeccao");
  });
  it.each(["/perfil", "/workspaces", "/redefinir-senha"])("preserva destino permitido: %s", (value) => expect(safeRedirect(value)).toBe(value));
  it.each(["https://user:pass@ag.test", "http://ag.test", "https://ag.test/path", "https://ag.test?key=x", "javascript:x"])("recusa origem insegura: %s", (value) => expect(applicationOrigin(value)).toBeNull());
  it("aceita desenvolvimento em loopback e produção HTTPS", () => {
    expect(applicationOrigin("http://127.0.0.1:3100")).toBe("http://127.0.0.1:3100");
    expect(applicationOrigin("https://ag.test")).toBe("https://ag.test");
  });
  it("rejeita chave privilegiada no cliente e URL de rede privada HTTP", () => {
    const env = { NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_synthetic_never_public" };
    expect(parsePublicSupabaseConfig(env)).toBeNull();
    expect(parsePublicSupabaseConfig({ ...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_example" })?.url).toBe(env.NEXT_PUBLIC_SUPABASE_URL);
    expect(parsePublicSupabaseConfig({ ...env, NEXT_PUBLIC_SUPABASE_URL: "http://192.168.0.2" })).toBeNull();
  });
  it("não confunde chave anon legada com service_role", () => {
    const jwt = (role: string) => `e30.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.synthetic-signature`;
    const env = { NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321" };
    expect(parsePublicSupabaseConfig({ ...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: jwt("anon") })).not.toBeNull();
    expect(parsePublicSupabaseConfig({ ...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: jwt("service_role") })).toBeNull();
  });
  it.each(["short", "abcdefghijklm", "ABCDEFGHIJKLM123", "Abc123", "Aa1".repeat(44)])("recusa senha nova inadequada: %s", (password) => expect(passwordSchema.safeParse(password).success).toBe(false));
  it("aceita senha compatível com a política configurada no Supabase", () => expect(passwordSchema.safeParse("SyntheticStrong42").success).toBe(true));
});
