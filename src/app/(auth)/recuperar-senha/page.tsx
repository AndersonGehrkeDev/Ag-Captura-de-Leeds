import Link from "next/link";
import { AuthCard } from "@/features/auth/auth-card";
import { AuthForm } from "@/features/auth/auth-form";
import { getAuthConfiguration } from "@/server/auth/configuration";
export default function Recover() {
  const { available } = getAuthConfiguration();
  return <AuthCard title="Recupere seu acesso" description="Informe seu e-mail para receber as instruções de redefinição de senha.">{!available && <p className="auth-notice">Recuperação indisponível: configure o Supabase Auth e a URL da aplicação no servidor.</p>}<AuthForm mode="recovery" disabled={!available} /><Link className="auth-link" href="/login">Voltar para entrar</Link></AuthCard>;
}
