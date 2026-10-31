import { z } from "zod";

const destinations = new Set(["/prospeccao", "/base", "/configuracoes", "/perfil", "/workspaces", "/workspace/membros", "/redefinir-senha", "/leads", "/mapa", "/campanhas", "/modelos", "/relatorios"]);
export function safeRedirect(value: unknown, fallback = "/prospeccao") {
  return typeof value === "string" && destinations.has(value) ? value : fallback;
}
export function applicationOrigin(value: string | undefined) {
  try {
    const url = new URL(value || "http://localhost:3000");
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) return null;
    return url.origin;
  } catch { return null; }
}
export const emailSchema = z.email().trim().toLowerCase().max(254);
export const passwordSchema = z.string().min(12, "Use pelo menos 12 caracteres.").max(128, "Use no máximo 128 caracteres.").regex(/[a-z]/, "Inclua uma letra minúscula.").regex(/[A-Z]/, "Inclua uma letra maiúscula.").regex(/[0-9]/, "Inclua um número.");
export const uuidSchema = z.uuid();
export const otpTypeSchema = z.enum(["signup", "recovery", "invite", "email"]);
export type AuthFormState = { message: string; success?: boolean };
export const initialAuthState: AuthFormState = { message: "" };
