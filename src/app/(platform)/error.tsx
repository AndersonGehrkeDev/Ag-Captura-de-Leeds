"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function PlatformError({ reset }: { reset: () => void }) {
  return <section className="account-page"><h1>Não foi possível carregar seu ambiente</h1><p role="alert">Verifique a conexão e tente novamente. Se o problema continuar, peça ao administrador para conferir as migrações e o acesso ao banco.</p><Button onClick={reset}>Tentar novamente</Button><div className="account-links"><Link href="/login">Voltar para entrar</Link></div></section>;
}
