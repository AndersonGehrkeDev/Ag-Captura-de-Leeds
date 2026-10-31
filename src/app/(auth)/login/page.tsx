import Link from "next/link";
import { AuthCard } from "@/features/auth/auth-card";
import { AuthForm } from "@/features/auth/auth-form";
import { getAuthConfiguration } from "@/server/auth/configuration";
import { safeRedirect } from "@/domain/auth";

const notices: Record<string, string> = { sessao: "Entre para continuar. Sua sessão pode ter expirado.", senha: "Senha atualizada. Entre com sua nova senha.", saiu: "Você saiu da conta.", link: "Link inválido ou expirado. Solicite um novo e-mail." };
export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { available, allowSignup } = getAuthConfiguration();
  const notice = typeof params.aviso === "string" ? notices[params.aviso] : null;
  return <AuthCard title="Bem-vindo de volta" description="Entre para acompanhar suas oportunidades e continuar de onde parou.">
    {!available ? <p className="auth-notice" role="status"><strong>Autenticação não configurada.</strong><br />Configure NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no ambiente do servidor. Nenhuma sessão demonstrativa será criada.</p> : notice && <p className="auth-notice" role="status">{notice}</p>}
    <AuthForm mode="login" disabled={!available} next={safeRedirect(params.next)} />
    <Link className="auth-link" href="/cadastro">{allowSignup ? "Criar uma conta" : "Acesso por convite"}</Link><Link className="auth-link" href="/prospeccao/demonstracao">Explorar demonstração · dados fictícios</Link>
  </AuthCard>;
}
