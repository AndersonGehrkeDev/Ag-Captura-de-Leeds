import { AuthCard } from "@/features/auth/auth-card";
import { AuthForm } from "@/features/auth/auth-form";
import { requireIdentity } from "@/server/auth/session";
export default async function Reset() {
  await requireIdentity();
  return <AuthCard title="Defina sua nova senha" description="Escolha uma senha segura. Ao salvar, suas sessões serão encerradas e você poderá entrar novamente."><AuthForm mode="reset" /></AuthCard>;
}
