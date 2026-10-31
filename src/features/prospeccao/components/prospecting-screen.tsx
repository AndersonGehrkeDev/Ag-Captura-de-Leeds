"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import { Building2, Check, ChevronRight, Globe, Info, List, Map, MapPin, Plus, ShieldAlert, Sparkles, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { defaultFilters, demonstrationMessage, filterCompanies, type ProspectCompany } from "../domain/company";
import { SearchFilters } from "./search-filters";
import { CompanyResults } from "./company-results";
import { CompanyDetail, CompanyMessage, type DetailProps } from "./company-detail";

const DemoMap = dynamic(() => import("@/features/mapas/components/demo-map"), { ssr: false, loading: () => <div className="map-placeholder" role="status">Carregando ilustração local...</div> });

export function ProspectingScreen({ companies, demo = false, initialQuery = "" }: { companies: readonly ProspectCompany[]; demo?: boolean; initialQuery?: string }) {
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [filters, setFilters] = useState(defaultFilters);
  const [opportunities, setOpportunities] = useState(false);
  const [view, setView] = useState("map");
  const [selectedId, setSelectedId] = useState<string | null>(companies[0]?.id ?? null);
  const [leads, setLeads] = useState<ReadonlySet<string>>(new Set(companies.filter((company) => company.initialLead).map((company) => company.id)));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tones, setTones] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const returnFocus = useRef<HTMLElement | null>(null);
  const filtered = filterCompanies(companies, filters, initialQuery, opportunities);
  const selected = selectedId === null ? null : filtered.find((company) => company.id === selectedId) ?? filtered[0] ?? null;
  const categories = [...new Set(companies.map((company) => company.category))];

  function selectCompany(company: ProspectCompany) {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedId(company.id);
    if (!window.matchMedia("(min-width: 1280px)").matches) setDrawerOpen(true);
  }
  function addLead(company: ProspectCompany) {
    if (leads.has(company.id)) { setNotice(`${company.name} já está nos leads desta demonstração.`); return; }
    setLeads((previous) => new Set([...previous, company.id]));
    setNotice(`${company.name} adicionado aos leads de exemplo. Nenhum registro foi salvo no CRM real.`);
  }
  const detail: DetailProps | null = selected ? {
    company: selected, isLead: leads.has(selected.id), onAdd: () => addLead(selected),
    message: messages[selected.id] ?? demonstrationMessage(selected, tones[selected.id] ?? "Profissional"),
    onMessage: (value) => setMessages((previous) => ({ ...previous, [selected.id]: value })),
    note: notes[selected.id] ?? "", onNote: (value) => setNotes((previous) => ({ ...previous, [selected.id]: value })),
    tone: tones[selected.id] ?? "Profissional", onTone: (value) => { setTones((previous) => ({ ...previous, [selected.id]: value })); setMessages((previous) => ({ ...previous, [selected.id]: demonstrationMessage(selected, value) })); },
    onNotice: setNotice,
  } : null;
  const metrics = [
    { label: "Empresas encontradas", value: filtered.length, icon: Building2, kind: "all" },
    { label: "Sem site", value: filtered.filter((company) => company.status === "missing").length, icon: ShieldAlert, kind: "missing" },
    { label: "Com site para melhorar", value: filtered.filter((company) => company.status === "improve").length, icon: Globe, kind: "improve" },
    { label: "Adicionadas aos leads", value: leads.size, icon: Users, kind: "leads" },
  ];
  return <div className={`prospecting-grid view-${view}`}>
    <div className="prospecting-main">
      <section className="prospecting-heading"><div className="prospecting-title"><h1 id="prospecting-title" tabIndex={-1}>Prospecção de Empresas</h1><p>Encontre empresas e descubra oportunidades para<br className="wide-break" /> melhorar sua presença digital.</p></div><div className="metrics-grid">{metrics.map(({ label, value, icon: Icon, kind }) => <div className={`metric-card metric-${kind}`} key={label}><span className="metric-icon"><Icon size={20} aria-hidden="true" /></span><div><strong>{demo ? value : "—"}</strong><span>{label}</span></div></div>)}</div></section>
      <div className={`demo-strip ${demo ? 'active-demo' : ''}`}><span><Info size={14} aria-hidden="true" /><strong>{demo ? "Modo demonstração" : "Nenhuma fonte conectada"}</strong><span>{demo ? "Empresas, notas e números fictícios. Alterações apenas nesta tela." : "Sem resultados reais. A busca depende de uma fonte autorizada para prospecção."}</span></span><Link href={demo ? "/prospeccao" : "/prospeccao/demonstracao"}>{demo ? "Sair da demonstração" : "Explorar demonstração"}<ChevronRight size={13} aria-hidden="true" /></Link></div>
      <div className="discovery-grid"><SearchFilters filters={draftFilters} categories={categories} demo={demo} onChange={setDraftFilters} onSearch={() => { setFilters(draftFilters); setNotice("Filtros aplicados aos exemplos locais. A abrangência não calcula distâncias reais."); }} />
        <Tabs value={view} onValueChange={setView} className="ag-panel map-panel"><div className="map-toolbar"><TabsList aria-label="Visualização dos resultados"><TabsTrigger value="map"><Map size={15} aria-hidden="true" />Mapa</TabsTrigger><TabsTrigger value="list"><List size={15} aria-hidden="true" />Lista</TabsTrigger></TabsList><label className="opportunities-toggle"><input type="checkbox" checked={opportunities} onChange={(event) => setOpportunities(event.target.checked)} />Mostrar apenas oportunidades</label></div>
          <TabsContent value="map" className="map-tab-content">{demo && filtered.length ? <DemoMap companies={filtered} selectedId={selected?.id ?? null} onSelect={selectCompany} /> : <div className="map-placeholder"><MapPin size={34} aria-hidden="true" /><h2>{demo ? "Nenhum exemplo para estes filtros" : "Seu próximo cliente pode estar aqui"}</h2><p>{demo ? "Tente São Paulo e outro segmento para explorar os exemplos." : "Mapas reais dependem de fonte e uso autorizados para esta plataforma."}</p>{!demo && <Link className="demo-link" href="/prospeccao/demonstracao">Explorar mapa demonstrativo</Link>}</div>}</TabsContent>
          <TabsContent value="list"><CompanyResults demo={demo} companies={filtered} selectedId={selected?.id ?? null} leads={leads} onSelect={selectCompany} onAdd={addLead} onNotice={setNotice} compact /></TabsContent>
        </Tabs>
      </div>
      {view === "map" && <div className="bottom-results"><CompanyResults demo={demo} companies={filtered} selectedId={selected?.id ?? null} leads={leads} onSelect={selectCompany} onAdd={addLead} onNotice={setNotice} /></div>}
      {demo && selected && <Button variant="outline" className="mobile-selected" onClick={() => selectCompany(selected)}><span><strong>{selected.name}</strong><small>Empresa fictícia selecionada</small></span>Ver detalhes <Plus size={16} aria-hidden="true" /></Button>}
    </div>
    <aside className="company-sidebar" aria-label="Empresa selecionada">{detail ? <><div className="detail-container"><button className="detail-close" aria-label="Fechar detalhes da empresa" onClick={() => setSelectedId(null)}><X size={17} aria-hidden="true" /></button><CompanyDetail {...detail} /></div><CompanyMessage key={detail.company.id} {...detail} /></> : <div className="ag-panel empty-detail"><Building2 size={28} aria-hidden="true" /><h2>Conheça cada oportunidade</h2><p>Selecione uma empresa para ver detalhes, anotações e mensagens.</p><span><Sparkles size={14} />{demo ? "Exemplos sintéticos" : "Aguardando integração"}</span></div>}</aside>
    <Sheet open={drawerOpen && Boolean(detail)} onOpenChange={setDrawerOpen}><SheetContent className="company-drawer" closeLabel="Fechar detalhes" onCloseAutoFocus={(event) => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus(); else document.getElementById("prospecting-title")?.focus(); }}><SheetHeader><SheetTitle>Detalhes da empresa</SheetTitle><SheetDescription>Demonstração fictícia. Alterações apenas nesta tela.</SheetDescription></SheetHeader>{detail && <div className="drawer-body"><CompanyDetail {...detail} /><CompanyMessage key={detail.company.id} {...detail} /></div>}</SheetContent></Sheet>
    {notice && <div className="app-notice" role="status"><Check size={17} aria-hidden="true" /><span>{notice}</span><button aria-label="Fechar aviso" onClick={() => setNotice("")}><X size={17} aria-hidden="true" /></button></div>}
  </div>;
}
