"use client";

import { Compass, Filter, Info, MapPin, Search, Store, Tags, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProspectFilters, SearchMode } from "../domain/company";

interface Props {
  filters: ProspectFilters;
  categories: readonly string[];
  demo: boolean;
  onChange: (filters: ProspectFilters) => void;
  onSearch: () => void;
}

export function SearchFilters({ filters, categories, demo, onChange, onSearch }: Props) {
  const [expanded, setExpanded] = useState(false);
  function submit(event: FormEvent) { event.preventDefault(); onSearch(); }
  return <section className={`ag-panel search-panel ${expanded ? "is-open" : ""}`} aria-labelledby="search-title">
    <div className="panel-heading"><h2 id="search-title">Pesquisar Empresas</h2><Button className="filter-toggle" variant="outline" size="icon" aria-label="Expandir filtros" aria-expanded={expanded} aria-controls="search-fields" onClick={() => setExpanded(!expanded)}><Filter aria-hidden="true" /></Button></div>
    <form id="search-fields" className="filter-body" onSubmit={submit}>
      <Tabs value={filters.mode} onValueChange={(mode) => onChange({ ...filters, mode: mode as SearchMode })}>
        <TabsList aria-label="Tipo de busca" className="search-tabs"><TabsTrigger value="free"><Store size={14} aria-hidden="true" />Busca livre</TabsTrigger><TabsTrigger value="category"><Compass size={14} aria-hidden="true" />Por nicho</TabsTrigger><TabsTrigger value="keyword"><Tags size={14} aria-hidden="true" />Palavra-chave</TabsTrigger></TabsList>
        <TabsContent value="free"><div className="search-hint"><Info aria-hidden="true" size={20} /><div><strong>Busca livre</strong><p>{demo ? "Exemplos locais, sem cálculo de distância." : "Empresas de diferentes segmentos na região."}</p></div></div></TabsContent>
        <TabsContent value="category"><label className="field-label">Nicho de atuação<select className="ag-input" value={filters.category} onChange={(event) => onChange({ ...filters, category: event.target.value })}><option value="all">Todos os segmentos</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label></TabsContent>
        <TabsContent value="keyword"><label className="field-label">Palavra-chave<input className="ag-input" maxLength={100} placeholder="Ex.: restaurante" value={filters.term} onChange={(event) => onChange({ ...filters, term: event.target.value })} /></label></TabsContent>
      </Tabs>
      <label className="field-label">Cidade ou região<span className="location-input"><MapPin aria-hidden="true" size={16} /><input value={filters.location} maxLength={100} placeholder="Digite uma cidade" onChange={(event) => onChange({ ...filters, location: event.target.value })} /><button type="button" aria-label="Limpar localização" onClick={() => onChange({ ...filters, location: "" })}><X size={15} aria-hidden="true" /></button></span></label>
      <fieldset><legend className="field-label">Abrangência</legend><div className="radius-options">{([['city', 'Cidade'], ['10', '10 km'], ['25', '25 km'], ['50', '50 km']] as const).map(([value, label]) => <label key={value} className={filters.radius === value ? "is-selected" : ""}><input className="sr-only" type="radio" name="radius" value={value} checked={filters.radius === value} onChange={() => onChange({ ...filters, radius: value })} /><span>{label}</span></label>)}</div></fieldset>
      <label className="field-label">Filtro de oportunidades<select className="ag-input" value={filters.opportunity} onChange={(event) => onChange({ ...filters, opportunity: event.target.value as ProspectFilters['opportunity'] })}><option value="all">Todos os estabelecimentos</option><option value="missing">Sem site</option><option value="improve">Site para melhorar</option><option value="good">Site ok</option></select></label>
      <Button type="submit" className="gold-button search-submit" disabled={!demo}><Search aria-hidden="true" size={19} />Buscar empresas</Button>
      {!demo && <p className="filter-note">A busca real depende de uma fonte própria ou licenciada autorizada para prospecção.</p>}
    </form>
  </section>;
}
