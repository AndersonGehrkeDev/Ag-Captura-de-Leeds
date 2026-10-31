import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function AuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main id="conteudo" tabIndex={-1} className="auth-page safe-shell">
    <div className="auth-story"><Link href="/login" className="ag-brand" aria-label="AG Soluções Digitais — identificação textual provisória"><span>AG</span><strong>SOLUÇÕES<br />DIGITAIS</strong></Link><div><p className="auth-eyebrow">PROSPECÇÃO INTELIGENTE</p><h2>Mais conexões.<br /><span>Novas oportunidades.</span></h2><p>Encontre empresas, avalie sua presença digital e acompanhe cada oportunidade em um só lugar.</p></div><p className="auth-security"><ShieldCheck aria-hidden="true" size={18} />Seu espaço de trabalho, com acesso protegido.</p></div>
    <section className="auth-card"><span className="auth-eyebrow">AG PROSPECÇÃO</span><h1>{title}</h1><p className="auth-description">{description}</p>{children}<p className="auth-footer">AG Soluções Digitais · Acompanhamento comercial</p></section>
  </main>;
}
