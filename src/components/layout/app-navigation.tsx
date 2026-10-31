"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, Crown, Home, Map, Menu, MessageSquareText, Megaphone, Settings2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { demoPlan } from "@/demo/prospect-companies";
import { cn } from "@/lib/utils";
import type { ConsumptionReport } from "@/domain/management";
import { ConsumptionSummary } from "@/components/workspace/consumption";

const links = [
  { href: "/base", label: "Dashboard", icon: Home },
  { href: "/prospeccao", label: "Prospecção de Empresas", icon: Building2 },
  { href: "/leads", label: "Meus Leads", icon: Users },
  { href: "/mapa", label: "Mapa de Oportunidades", icon: Map },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone },
  { href: "/modelos", label: "Modelos de Mensagens", icon: MessageSquareText },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações", icon: Settings2 },
];

function Brand() {
  return <div className="ag-brand" aria-label="AG Soluções Digitais — identificação textual provisória"><span>AG</span><strong>SOLUÇÕES<br />DIGITAIS</strong></div>;
}

export function AppNavigation({ consumption }: { consumption?: ConsumptionReport }) {
  const pathname = usePathname();
  const demo = pathname.includes("/demonstracao");
  function navigation(mobile: boolean) {
    return <nav aria-label={mobile ? "Navegação móvel" : "Navegação principal"} className="side-links">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/prospeccao" ? pathname.startsWith(href) : pathname === href;
        const content = <><Icon aria-hidden="true" size={19} /><span>{label}</span></>;
        const link = <Link href={href} aria-current={active ? "page" : undefined} className={cn("side-link", active && "active")}>{content}</Link>;
        return mobile ? <SheetClose key={href} asChild>{link}</SheetClose> : <div key={href}>{link}</div>;
      })}
    </nav>;
  }
  function plan() {
    return <div className="sidebar-bottom">
      <section className="plan-card" aria-label="Plano e consumo"><div><span>{demo ? "Plano demonstrativo" : "Limites do workspace"}</span><Crown size={13} aria-hidden="true" /></div>{demo ? <><strong>{demoPlan.label}</strong><p>Pesquisas ilustrativas: {demoPlan.used}/{demoPlan.limit}</p><div className="plan-track"><span style={{ width: `${demoPlan.used / demoPlan.limit * 100}%` }} /></div><small>Exemplo visual · sem cobrança</small></> : <><ConsumptionSummary report={consumption} compact /><Link className="management-link" href="/relatorios">Ver consumo</Link><small>Cobrança fora do escopo</small></>}</section>
      <section className="promo-card"><h2>Mais empresas.<br /><span>Mais clientes.</span></h2><p>Encontre, analise e conquiste empresas que precisam de um site profissional.</p><div className="promo-laptop" aria-hidden="true"><div className="laptop-screen"><div className="mini-sidebar"><i /><i /><i /><i /></div><div className="mini-screen"><span>AG</span><i /><i /><i /></div></div><div className="laptop-base" /></div><small>AG Soluções Digitais</small></section>
    </div>;
  }
  return <>
    <div className="mobile-navigation safe-inline"><Brand /><Sheet><SheetTrigger asChild><Button variant="outline" size="icon" aria-label="Abrir menu"><Menu aria-hidden="true" /></Button></SheetTrigger><SheetContent side="left" className="navigation-drawer"><SheetHeader><SheetTitle>Menu da plataforma</SheetTitle><SheetDescription>Prospecção e acompanhamento comercial.</SheetDescription></SheetHeader><div className="px-4 pb-4">{navigation(true)}{plan()}</div></SheetContent></Sheet></div>
    <aside className="ag-sidebar"><div className="sidebar-brand"><Brand /></div>{navigation(false)}{plan()}</aside>
  </>;
}
