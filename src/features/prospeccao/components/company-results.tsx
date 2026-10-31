"use client";

import { useState } from "react";
import { ArrowDownToLine, Check, Globe, ListFilter, Plus, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProspectCompany } from "../domain/company";
import { CompanyAvatar } from "./company-avatar";
import { StatusBadge } from "./status-badge";

interface Props {
  companies: readonly ProspectCompany[];
  selectedId: string | null;
  leads: ReadonlySet<string>;
  onSelect: (company: ProspectCompany) => void;
  onAdd: (company: ProspectCompany) => void;
  onNotice: (message: string) => void;
  compact?: boolean;
  demo?: boolean;
}

export function CompanyResults({ companies, selectedId, leads, onSelect, onAdd, onNotice, compact = false, demo = true }: Props) {
  const [sort, setSort] = useState("relevant");
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const ordered = [...companies].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "pt-BR") : sort === "rating" ? b.rating - a.rating : b.score - a.score);
  function selectRow(id: string) { setChecked((previous) => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  return <section className={`ag-panel results-panel ${compact ? 'compact-results' : ''}`} aria-label={compact ? "Lista de empresas" : "Resultados da pesquisa"}>
    <div className="results-heading"><h2>{demo ? `${companies.length} ${companies.length === 1 ? "empresa encontrada" : "empresas encontradas"}` : "Nenhuma consulta realizada"}</h2><div className="results-tools"><label><span>Ordenar por</span><select className="ag-input" aria-label="Ordenar empresas" value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevant">Mais relevantes</option><option value="rating">Melhor avaliação</option><option value="name">Nome da empresa</option></select></label><Button className="gold-button" onClick={() => onNotice("Exportação ainda não implementada. Nenhum dado foi exportado.")}><ArrowDownToLine size={14} aria-hidden="true" /><span>Exportar</span></Button></div></div>
    {companies.length ? <>
      <div className="results-table-wrap" tabIndex={0} role="region" aria-label="Tabela de empresas, com rolagem localizada">
        <table className="companies-table"><caption className="sr-only">Empresas sintéticas de demonstração. Avaliações e diagnósticos são fictícios.</caption><colgroup><col style={{ width: '44px' }} /><col style={{ width: '24%' }} /><col style={{ width: '15%' }} /><col style={{ width: '12%' }} /><col style={{ width: '17%' }} /><col style={{ width: '13%' }} /><col style={{ width: '15%' }} /></colgroup><thead><tr><th><label className="checkbox-target"><input type="checkbox" aria-label="Selecionar todas as empresas" checked={companies.length > 0 && companies.every((company) => checked.has(company.id))} onChange={(event) => setChecked(event.target.checked ? new Set(companies.map((company) => company.id)) : new Set())} /></label></th><th>Empresa</th><th>Categoria</th><th>Avaliação</th><th>Site</th><th>Status</th><th>Ações</th></tr></thead><tbody>{ordered.map((company) => <tr key={company.id} data-selected={selectedId === company.id}>
          <td><label className="checkbox-target"><input type="checkbox" aria-label={`Selecionar ${company.name}`} checked={checked.has(company.id)} onChange={() => selectRow(company.id)} /></label></td>
          <td><button className="company-select" onClick={() => onSelect(company)}><CompanyAvatar company={company} /><span>{company.name}</span></button></td><td>{company.category}</td><td><span className="rating"><Star size={16} fill="currentColor" aria-hidden="true" /><span>{company.rating.toLocaleString('pt-BR')} <small>({company.reviews})</small></span></span></td><td><span className={company.website ? 'website-example' : 'muted'}>{company.website && <Globe size={12} aria-hidden="true" />}{company.website || "Não informado"}</span></td><td><StatusBadge status={company.status} /></td><td><div className="row-actions"><button aria-label={`Ver detalhes de ${company.name}`} onClick={() => onSelect(company)}><Search size={16} aria-hidden="true" /></button><button className="lead-action" aria-label={leads.has(company.id) ? `${company.name} já está nos leads de demonstração` : `Adicionar ${company.name} aos leads`} aria-pressed={leads.has(company.id)} onClick={() => onAdd(company)}>{leads.has(company.id) ? <Check size={16} /> : <Plus size={16} />}</button></div></td>
        </tr>)}</tbody></table>
      </div>
      <div className="company-cards">{ordered.map((company) => <article key={company.id} className={`company-card ${selectedId === company.id ? 'selected' : ''}`}><div className="company-card-heading"><CompanyAvatar company={company} /><div><h3>{company.name}</h3><p>{company.category}</p></div><StatusBadge status={company.status} /></div><div className="company-card-meta"><span className="rating"><Star size={15} fill="currentColor" aria-hidden="true" />{company.rating.toLocaleString('pt-BR')} ({company.reviews})</span><span className="muted">Dados fictícios</span></div><div className="company-card-actions"><Button variant="outline" onClick={() => onSelect(company)}>Ver detalhes</Button><Button variant="outline" aria-label={`Adicionar ${company.name} aos leads`} onClick={() => onAdd(company)}>{leads.has(company.id) ? <Check size={16} /> : <Plus size={16} />}Lead {leads.has(company.id) ? "adicionado" : ""}</Button></div></article>)}</div>
    </> : <div className="empty-results"><ListFilter size={28} aria-hidden="true" /><h3>Nenhuma empresa para exibir</h3><p>Ajuste os filtros ou ative a demonstração para explorar os exemplos.</p></div>}
    <div className="results-footer"><span>{checked.size ? `${checked.size} selecionada(s) · ` : ""}{demo ? "Dados sintéticos · sem consulta ao Google" : "Sem consulta ao Google · integrações pendentes"}</span></div>
  </section>;
}
