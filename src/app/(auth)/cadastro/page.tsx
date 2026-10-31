import Link from "next/link";
import { AuthCard } from "@/features/auth/auth-card";
import { AuthForm } from "@/features/auth/auth-form";
import { getAuthConfiguration } from "@/server/auth/configuration";
export default function Signup() {
  const { available, allowSignup } = getAuthConfiguration();
  return <AuthCard title={allowSignup ? "Crie sua conta" : "Acesso por convite"} description={allowSignup ? "Cadastre seu e-mail e confirme o acesso quando solicitado." : "A plataforma está disponível para a equipe e pessoas convidadas."}>
    {allowSignup ? <><p className="auth-notice">Uma conta não concede acesso automático a workspaces. {available ? "" : "Configure o Supabase Auth para habilitar este formulário."}</p><AuthForm mode="signup" disabled={!available} /></> : <p className="auth-notice">Solicite um convite ao administrador do seu workspace. Abra o e-mail recebido, confirme sua identidade e defina uma senha. Convites de workspace expiram em 72 horas.</p>}
    <Link className="auth-link" href="/login">Voltar para entrar</Link>
  </AuthCard>;
}
