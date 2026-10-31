"use client";
import { AuthCard } from "@/features/auth/auth-card";
import { Button } from "@/components/ui/button";
export default function ApplicationError({ reset }: { reset: () => void }) {
  return <AuthCard title="Não foi possível continuar" description="Verifique a conexão e tente novamente. Se o problema continuar, peça ao administrador para conferir as configurações de acesso."><Button onClick={reset}>Tentar novamente</Button></AuthCard>;
}
