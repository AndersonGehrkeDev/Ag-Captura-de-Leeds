import Link from "next/link";
import { AuthCard } from "@/features/auth/auth-card";
import { AuthForm } from "@/features/auth/auth-form";
import { otpTypeSchema } from "@/domain/auth";
import { getAuthConfiguration } from "@/server/auth/configuration";
export default async function Confirm({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const type = otpTypeSchema.safeParse(params.type);
  const token = typeof params.token_hash === "string" && /^[a-zA-Z0-9_-]{20,512}$/.test(params.token_hash) ? params.token_hash : "";
  const valid = type.success && !!token;
  return <AuthCard title="Confirme seu acesso" description="Continue para validar o link recebido por e-mail. Ele só será utilizado após sua confirmação.">{valid ? <AuthForm mode="confirm" otpType={type.success ? type.data : ""} tokenHash={token} disabled={!getAuthConfiguration().available} /> : <p className="auth-notice">Link inválido. Solicite um novo e-mail ao administrador ou recupere sua senha.</p>}<Link className="auth-link" href="/login">Voltar para entrar</Link></AuthCard>;
}
