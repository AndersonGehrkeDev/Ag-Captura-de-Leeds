"use client";

import { Bell, ChevronDown, Search, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthForm } from "@/features/auth/auth-form";

export function AppHeader({ viewer }: { viewer?: { name: string; workspace: string } }) {
  const pathname = usePathname();
  const demo = pathname.includes("/demonstracao");
  return <header className="app-header safe-inline">
    <form action={demo ? "/prospeccao/demonstracao" : "/prospeccao"} className="global-search" role="search"><Search aria-hidden="true" size={19} /><label htmlFor="global-search" className="sr-only">Busca global</label><input id="global-search" type="search" name="busca" maxLength={100} placeholder="Buscar empresas, leads ou cidades..." /><button type="submit" aria-label="Pesquisar na plataforma"><Search size={16} /></button></form>
    {demo && <div className="header-demo-status"><strong>Modo demonstração</strong><span>Dados fictícios</span><Link href="/prospeccao">Sair da demonstração</Link></div>}
    <div className="header-actions"><details className="header-dropdown notifications"><summary aria-label="Notificações"><Bell size={19} aria-hidden="true" /></summary><div className="header-popover"><strong>Notificações</strong><p>{demo ? "Você está em um ambiente de demonstração. Não há notificações reais." : "Nenhuma central de notificações está integrada. Consulte as tarefas no Dashboard."}</p></div></details><details className="header-dropdown profile-dropdown"><summary><span className="profile-avatar">AG</span><span className="profile-name"><strong>{demo ? "Perfil de demonstração" : viewer?.name}</strong><small>{demo ? "AG Soluções Digitais" : viewer?.workspace}</small></span><ChevronDown size={14} aria-hidden="true" /></summary><div className="header-popover"><strong>{demo ? "Conta demonstrativa" : "Minha conta"}</strong>{demo ? <p>Dados fictícios. Nenhuma conta real está conectada.</p> : <><Link href="/perfil">Meu perfil</Link><Link href="/workspaces">Trocar workspace</Link><Link href="/workspace/membros">Membros e convites</Link><AuthForm mode="logout" /></>}<Link href={demo ? "/login" : "/configuracoes"}><Settings2 size={15} aria-hidden="true" />{demo ? "Entrar na plataforma" : "Configurações"}</Link></div></details></div>
  </header>;
}
