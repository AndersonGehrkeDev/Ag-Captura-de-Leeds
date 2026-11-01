"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Building2, Filter, List, Map as MapIcon, MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { businessCategories } from "@/domain/integrations/categories";
import { companySchema, searchPageSchema, type CompanyRecord, type IntegrationResult, type SearchRequest } from "@/domain/integrations/contracts";
import type { LoadedSearchPage, SearchOptions } from "@/domain/integrations/search-api";
import { callSearchApi } from "../search-client";
import { WebsiteAuditPanel } from "@/features/auditorias/components/website-audit-panel";
import { CommercialMessagePanel, emptyMessageEditor, type MessageEditorState } from "@/features/ia/components/commercial-message-panel";
import { callCrm } from "@/features/crm/client";

const optionsSchema: z.ZodType<SearchOptions> = z.strictObject({ sources: z.array(z.strictObject({ id: z.uuid(), label: z.string().max(100), locations: z.array(z.strictObject({ id: z.uuid(), label: z.string().max(120), radiusAvailable: z.boolean(), attributions: z.array(z.string().max(500)) })).max(6000) })).max(10) });
const pageSchema: z.ZodType<LoadedSearchPage> = searchPageSchema.extend({ state: z.enum(["empty", "complete", "partial", "limit_reached"]), excludedWithoutCoordinates: z.number().int().nonnegative(), scope: z.string().max(500), scopeAttributions: z.array(z.string().max(500)) });
const text = (field: CompanyRecord["name"]) => field.state === "known" ? field.data.value : field.state === "not_checked" ? "Não consultado" : field.state === "lookup_failed" ? "Consulta indisponível" : "Não informado pela fonte";
const SourceMap = dynamic(() => import("@/features/mapas/components/source-map"), { ssr: false, loading: () => <div className="map-placeholder" role="status">Carregando visualização de coordenadas…</div> });
const matchesWebsite = (company: CompanyRecord, filter: string) => filter === "all" || (filter === "known" ? company.website.state === "known" : company.website.state !== "known");

export function LiveProspectingScreen({ workspaceId, savedLeads, opportunities = false, openMap = false }: { workspaceId: string; savedLeads: number | null; opportunities?: boolean; openMap?: boolean }) {
  const router = useRouter();
  const [options, setOptions] = useState<SearchOptions>({ sources: [] });
  const [sourceId, setSourceId] = useState(""); const [locationId, setLocationId] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [mode, setMode] = useState<SearchRequest["mode"]>("free"); const [term, setTerm] = useState(""); const [category, setCategory] = useState("pizza");
  const [radius, setRadius] = useState<SearchRequest["radiusKm"]>("city");
  const [expanded, setExpanded] = useState(false); const [view, setView] = useState("map");
  const [websiteFilter, setWebsiteFilter] = useState("all"); const [items, setItems] = useState<CompanyRecord[]>([]);
  const [page, setPage] = useState<LoadedSearchPage | null>(null); const [applied, setApplied] = useState<SearchRequest | null>(null);
  const [loading, setLoading] = useState(false); const [initializing, setInitializing] = useState(true); const [message, setMessage] = useState("Nenhuma consulta realizada."); const [error, setError] = useState(false);
  const [detail, setDetail] = useState<CompanyRecord | null>(null); const [detailMessage, setDetailMessage] = useState("Selecione uma empresa para consultar detalhes.");
  const [detailReference, setDetailReference] = useState<string | null>(null); const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailTab, setDetailTab] = useState("information");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [messageEditors, setMessageEditors] = useState<Record<string, MessageEditorState>>({});
  const [actionMessage, setActionMessage] = useState(""); const [openingMap, setOpeningMap] = useState(false);
  const [addingLead, setAddingLead] = useState(false); const [savedLeadId, setSavedLeadId] = useState<string | null>(null); const addGuard = useRef(false);
  const actionController = useRef<AbortController | null>(null);
  const searchController = useRef<AbortController | null>(null); const detailController = useRef<AbortController | null>(null); const optionsController = useRef<AbortController | null>(null);
  const [lastRequest, setLastRequest] = useState<SearchRequest | null>(null); const focusReturn = useRef<HTMLElement | null>(null);
  const selectedSource = options.sources.find((source) => source.id === sourceId);
  const selectedLocation = selectedSource?.locations.find((location) => location.id === locationId);
  const cityMatches = selectedSource?.locations.filter((location) => location.label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(cityFilter.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR"))) ?? [];
  const visibleCities = openMap ? cityMatches.slice(0, 100) : cityMatches;
  if (selectedLocation && !visibleCities.some((location) => location.id === selectedLocation.id)) visibleCities.unshift(selectedLocation);
  const filtered = items.filter((company) => matchesWebsite(company, websiteFilter));

  const applyOptions = useCallback((result: IntegrationResult<SearchOptions>, signal: AbortSignal) => {
    if (signal.aborted) return;
    setInitializing(false);
    if (!result.ok) { setMessage(result.error.message); setError(true); return; }
    setOptions(result.data); setSourceId(result.data.sources[0]?.id ?? ""); setLocationId(openMap ? "" : result.data.sources[0]?.locations[0]?.id ?? "");
    setMessage(result.data.sources.length ? "Nenhuma consulta realizada. Escolha os filtros e busque explicitamente." : "Nenhuma fonte com permissão vigente para este workspace."); setError(false);
  }, [openMap]);
  async function initialize(signal: AbortSignal) {
    applyOptions(await callSearchApi({ operation: "options", workspaceId }, optionsSchema, signal, openMap ? { timeoutMs: 50_000, maxAttempts: 1 } : undefined), signal);
  }
  useEffect(() => {
    const controller = new AbortController(); optionsController.current = controller;
    void callSearchApi({ operation: "options", workspaceId }, optionsSchema, controller.signal, openMap ? { timeoutMs: 50_000, maxAttempts: 1 } : undefined).then((result) => applyOptions(result, controller.signal));
    return () => { controller.abort(); searchController.current?.abort(); detailController.current?.abort(); actionController.current?.abort(); };
    // O workspace é fixado pelo servidor nesta instância da tela.
  }, [workspaceId, openMap, applyOptions]);

  function clearResults() {
    closeSelection();
    searchController.current?.abort(); detailController.current?.abort(); setLoading(false); setItems([]); setPage(null); setApplied(null); setLastRequest(null);
    setDetail(null); setDetailReference(null); setDetailMessage("Selecione uma empresa para consultar detalhes."); setMessage("Filtros alterados. Faça uma nova busca."); setError(false);
  }
  function closeSelection() {
    detailController.current?.abort(); actionController.current?.abort(); setOpeningMap(false); setActionMessage("");
    setDetail(null); setDetailReference(null); setDetailMessage("Selecione uma empresa para consultar detalhes."); setDrawerOpen(false); setAddingLead(false); setSavedLeadId(null);
  }
  function changeWebsiteFilter(value: string) {
    setWebsiteFilter(value);
    if (detailReference && !items.some((company) => company.reference.value === detailReference && matchesWebsite(company, value))) closeSelection();
  }
  function cancel() { searchController.current?.abort(); setLoading(false); setMessage("Consulta cancelada. Os resultados já carregados foram preservados."); setError(false); }
  async function search(request: SearchRequest, append = false) {
    if (window.matchMedia("(max-width: 767px)").matches) setView("list");
    searchController.current?.abort(); const controller = new AbortController(); searchController.current = controller;
    setLastRequest(request); setLoading(true); setError(false); setMessage("Consultando a fonte autorizada…");
    const result = await callSearchApi({ operation: "search", workspaceId, request }, pageSchema, controller.signal, openMap ? { timeoutMs: 50_000, maxAttempts: 1 } : undefined);
    if (searchController.current !== controller || controller.signal.aborted) return;
    setLoading(false);
    if (!result.ok) {
      if (["access_denied", "permission_denied", "feature_disabled", "not_configured", "invalid_input"].includes(result.error.code)) {
        setItems([]); setPage(null); setApplied(null); setDetail(null); setDetailReference(null); setDrawerOpen(false);
      }
      setMessage(result.error.message); setError(true); return;
    }
    setItems((previous) => [...new Map([...(append ? previous : []), ...result.data.items].map((company) => [company.reference.value, company])).values()]);
    setApplied(request); setPage(result.data);
    setMessage(result.data.state === "limit_reached" ? "Limite de consulta da fonte atingido. Refine os filtros." : result.data.state === "partial" ? "Resultados parciais. Consulte o escopo e a disponibilidade de outra página." : result.data.state === "empty" ? "Nenhum resultado disponível para esta consulta." : "Resultados disponíveis carregados. Esta busca não é um censo de empresas.");
  }
  function submit(event: FormEvent) {
    event.preventDefault(); if (loading || !selectedLocation) return;
    void search({ sourceId, locationId, location: selectedLocation.label, mode, term: mode === "free" ? "" : mode === "category" ? category : term, radiusKm: radius, pageSize: 20, cursor: null });
  }
  async function openDetails(reference: string) {
    focusReturn.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    detailController.current?.abort(); actionController.current?.abort(); setOpeningMap(false); setActionMessage(""); setDetailTab("information"); setAddingLead(false); setSavedLeadId(null);
    const controller = new AbortController(); detailController.current = controller;
    setDetailReference(reference); setDetail(null); setDetailMessage("Carregando detalhes…");
    if (!window.matchMedia("(min-width: 1280px)").matches) setDrawerOpen(true);
    const result: IntegrationResult<CompanyRecord> = await callSearchApi({ operation: "details", workspaceId, request: { sourceId, reference } }, companySchema, controller.signal, openMap ? { timeoutMs: 50_000, maxAttempts: 1 } : undefined);
    if (detailController.current !== controller || controller.signal.aborted) return;
    if (result.ok) { setDetail(result.data); setDetailMessage(""); } else setDetailMessage(result.error.message);
  }
  async function openExternalMap() {
    if (!detail || openingMap || addGuard.current) return;
    const controller = new AbortController(); actionController.current = controller; setOpeningMap(true); setActionMessage("");
    const result = await callSearchApi({ operation: "maps_link", workspaceId, request: { sourceId, reference: detail.reference.value } }, z.strictObject({ url: z.url().max(2048).refine((value) => { const url = new URL(value); return url.origin === "https://www.google.com" && url.pathname === "/maps/search/"; }) }), controller.signal);
    if (controller.signal.aborted || actionController.current !== controller) return;
    setOpeningMap(false);
    if (result.ok) window.location.assign(result.data.url); else setActionMessage(result.error.message);
  }
  async function addLead() {
    if (!detail || addGuard.current || openingMap) return;
    addGuard.current = true; const controller = new AbortController(); actionController.current?.abort(); actionController.current = controller;
    setAddingLead(true); setActionMessage("");
    try {
      const result = await callCrm({ operation: "add_source", workspaceId, sourceId, reference: detail.reference.value }, controller.signal);
      if (controller.signal.aborted) return;
      if (result.ok) { setSavedLeadId(result.data.leadId); setActionMessage(result.data.duplicate ? "Esta empresa já possui lead neste workspace. Registro existente preservado." : "Lead adicionado. Somente a referência autorizada e metadados comerciais foram salvos."); router.refresh(); }
      else setActionMessage(result.error.message);
    } finally { addGuard.current = false; if (actionController.current === controller) setAddingLead(false); }
  }
  const detailBody = <div className="live-detail-body">{detail ? <>
    <Building2 size={30} aria-hidden="true" /><h2>{text(detail.name)}</h2>
    <Tabs value={detailTab} onValueChange={setDetailTab}><TabsList className="detail-tabs" aria-label="Informações da empresa selecionada"><TabsTrigger value="information">Detalhes</TabsTrigger><TabsTrigger value="notes">Anotações</TabsTrigger><TabsTrigger value="audit">Auditoria</TabsTrigger><TabsTrigger value="message">Mensagem IA</TabsTrigger></TabsList>
      <TabsContent value="information"><dl>{([["Categoria", text(detail.category)], ["Endereço", text(detail.address)], ["Cidade", text(detail.city)], ["Site", text(detail.website)], ["Avaliação", detail.rating.state === "known" ? detail.rating.data.value.toLocaleString("pt-BR") : "Não informada pela fonte"], ["Coordenadas", detail.coordinates ? `${detail.coordinates.latitude}, ${detail.coordinates.longitude}` : "Não informadas; empresa disponível apenas na lista"], ["Referência", detail.reference.value]] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>Site não informado não comprova ausência de site. Não há diagnóstico de oportunidade nesta consulta.</p></TabsContent>
      <TabsContent value="notes"><label className="field-label">Anotações de {text(detail.name)}<textarea className="ag-input notes-text" maxLength={2000} value={notes[`${sourceId}:${detail.reference.value}`] ?? ""} onChange={(event) => setNotes((previous) => ({ ...previous, [`${sourceId}:${detail.reference.value}`]: event.target.value }))} /></label><p className="local-draft-notice">Rascunho local, não salvo no CRM. Mantido ao alternar seleção e abas; perdido ao recarregar esta página.</p></TabsContent>
      <TabsContent value="audit">{detail.website.state === "known" ? <WebsiteAuditPanel key={`${sourceId}:${detail.website.data.provenanceId}`} workspaceId={workspaceId} sourceId={sourceId} websiteProvenanceId={detail.website.data.provenanceId} /> : <p>Site {text(detail.website).toLocaleLowerCase("pt-BR")}. Não é possível solicitar a auditoria.</p>}</TabsContent>
      <TabsContent value="message"><CommercialMessagePanel key={`${sourceId}:${detail.reference.value}`} workspaceId={workspaceId} sourceId={sourceId} reference={detail.reference.value} editor={messageEditors[`${sourceId}:${detail.reference.value}`] ?? emptyMessageEditor} onEditorChange={(update) => { const key = `${sourceId}:${detail.reference.value}`; setMessageEditors((previous) => ({ ...previous, [key]: typeof update === "function" ? update(previous[key] ?? emptyMessageEditor) : update })); }} /></TabsContent>
    </Tabs>
    <Button variant="outline" disabled={openMap || !detail.coordinates || openingMap || addingLead} onClick={() => void openExternalMap()}><MapPin size={16} aria-hidden="true" />{openingMap ? "Verificando permissão…" : "Abrir no Google Maps"}</Button>
    <p>{openMap ? "Use o mapa gratuito da plataforma. Exportação e transmissão destes dados para outros provedores permanecem desativadas." : "O link abre o ponto informado pela fonte e exige permissão de transmissão. Não confirma um cadastro Google."}</p>{actionMessage && <p role="status">{actionMessage}</p>}
    <Button className="gold-button" disabled={addingLead || openingMap || !!savedLeadId} onClick={() => void addLead()}>{addingLead ? "Salvando lead…" : savedLeadId ? "Lead no CRM" : "Adicionar lead"}</Button><p>Requer permissão vigente de persistência da referência. Dados da empresa são consultados na fonte, sem copiar respostas completas.</p>{savedLeadId && <Link className="crm-open-link" href={`/leads?lead=${savedLeadId}`}>Abrir lead no CRM</Link>}

    {detail.attributions.map((credit) => <small key={credit}>{credit}</small>)}{openMap && <a className="crm-open-link" href={selectedSource?.label.startsWith("Overture") ? "/licencas/CDLA-Permissive-2.0.txt" : "https://www.openstreetmap.org/copyright"} target="_blank" rel="noreferrer">Licença dos dados da fonte selecionada</a>}
  </> : <><p role="status">{detailMessage}</p>{detailReference && detailMessage !== "Carregando detalhes…" && <Button variant="outline" onClick={() => void openDetails(detailReference)}>Tentar detalhes novamente</Button>}</>}</div>;

  const results = <section className="ag-panel results-panel live-results" aria-label="Resultados da pesquisa" aria-busy={loading}>
    <div className="results-heading"><h2>{items.length} resultados carregados</h2><label className="field-label">Exibir nos resultados carregados<select className="ag-input" value={websiteFilter} onChange={(event) => changeWebsiteFilter(event.target.value)}><option value="all">Todos</option><option value="known">Site informado</option><option value="unknown">Site não informado ou não consultado</option></select></label></div>
    <div className="live-status" role={error && selectedSource ? "alert" : "status"}>{message}</div>
    {error && lastRequest && <Button variant="outline" onClick={() => void search(lastRequest, !!lastRequest.cursor)}>Tentar busca novamente</Button>}
    {page && <p className="live-scope">{page.scope} {page.excludedWithoutCoordinates > 0 && `${page.excludedWithoutCoordinates} registros do catálogo sem coordenadas não puderam ser avaliados neste raio.`}</p>}
    <div className="results-table-wrap" tabIndex={0} role="region" aria-label="Tabela de resultados, com rolagem localizada"><table className="companies-table"><caption className="sr-only">Somente resultados desta consulta na fonte selecionada.</caption><thead><tr><th>Empresa</th><th>Categoria</th><th>Avaliação</th><th>Site</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filtered.map((company) => <tr key={company.reference.value} data-selected={detailReference === company.reference.value} onClick={(event) => { if (!(event.target as HTMLElement).closest("button,a")) void openDetails(company.reference.value); }}><td><button type="button" className="live-company-select" aria-pressed={detailReference === company.reference.value} onClick={() => void openDetails(company.reference.value)}>{text(company.name)}</button></td><td>{text(company.category)}</td><td>{company.rating.state === "known" ? company.rating.data.value.toLocaleString("pt-BR") : "Não informada"}</td><td>{text(company.website)}</td><td>Não classificado</td><td><Button variant="outline" onClick={() => void openDetails(company.reference.value)} aria-label={`Ver detalhes de ${text(company.name)}`}>Detalhes</Button></td></tr>)}</tbody></table></div>
    <div className="company-cards">{filtered.map((company) => <article className={`company-card ${detailReference === company.reference.value ? "selected" : ""}`} key={company.reference.value}><h3>{text(company.name)}</h3><p>{text(company.category)} · {text(company.city)}</p><p>Site: {text(company.website)}</p><Button variant="outline" aria-pressed={detailReference === company.reference.value} onClick={() => void openDetails(company.reference.value)} aria-label={`Ver detalhes de ${text(company.name)}`}>Ver detalhes</Button></article>)}</div>
    {!!items.length && !filtered.length && <p className="live-scope">Nenhum dos resultados carregados corresponde ao filtro de exibição.</p>}
    <div className="results-footer">{filtered.length} resultados filtrados nesta tela · {page?.total.state === "known" ? `${page.total.value} correspondências no catálogo consultado` : "Total não consultado"}</div>
    {[...new Set([...(page?.scopeAttributions ?? []), ...filtered.flatMap((company) => company.attributions)])].map((credit) => <p className="live-attribution" key={credit}>{credit}</p>)}
    {page?.nextCursor && applied && <Button className="gold-button" disabled={loading} onClick={() => void search({ ...applied, cursor: page.nextCursor }, true)}>Carregar mais resultados</Button>}
    {loading && <Button variant="outline" onClick={cancel}>Cancelar busca</Button>}
  </section>;

  return <div className={`prospecting-grid live-prospecting view-${view}`}><div className="prospecting-main">
    <section className="prospecting-heading"><div className="prospecting-title"><h1 id="live-title" tabIndex={-1}>{opportunities ? "Mapa de Oportunidades" : "Prospecção de Empresas"}</h1><p>{opportunities ? "Coordenadas da fonte autorizada. Não há classificação comercial automática ou cartografia Google." : "Consulte empresas em fontes próprias ou licenciadas."}</p></div><div className="metrics-grid">{[["Resultados carregados", items.length], ["Resultados filtrados", filtered.length], ["Leads salvos no workspace", savedLeads ?? "—"], ["Com site informado", items.filter((company) => company.website.state === "known").length]].map(([label, count]) => <div className="metric-card" key={label}><div><strong>{count}</strong><span>{label}</span></div></div>)}</div></section>
    <div className="demo-strip"><span><Building2 size={16} aria-hidden="true" /><strong>{selectedSource?.label ?? "Fonte autorizada necessária"}</strong><span>{openMap ? "Brasil inteiro por cidade · dados abertos + OpenFreeMap · sem chaves, cartão ou créditos. Cobertura colaborativa e parcial." : "Busca limitada aos registros disponíveis na fonte. Google não está habilitado para este uso."}</span></span></div>
    {!selectedSource && !initializing && <p className="live-status" role={error ? "alert" : "status"}>{message}</p>}
    <div className="discovery-grid"><section className={`ag-panel search-panel ${expanded ? "is-open" : ""}`} aria-labelledby="live-search-title"><div className="panel-heading"><h2 id="live-search-title">Pesquisar Empresas</h2><Button className="filter-toggle" variant="outline" size="icon" aria-label="Expandir filtros" aria-expanded={expanded} aria-controls="live-search-fields" onClick={() => setExpanded(!expanded)}><Filter aria-hidden="true" /></Button></div>
      <form id="live-search-fields" className="filter-body" onSubmit={submit}><Tabs value={mode} onValueChange={(value) => { clearResults(); setMode(value as SearchRequest["mode"]); }}><TabsList className="search-tabs" aria-label="Tipo de busca"><TabsTrigger value="free">Busca livre</TabsTrigger><TabsTrigger value="category">Por nicho</TabsTrigger><TabsTrigger value="keyword">Palavra-chave</TabsTrigger></TabsList><TabsContent value="free"><p className="search-hint">Estabelecimentos disponíveis na região selecionada, de diferentes segmentos.</p></TabsContent><TabsContent value="category"><label className="field-label">Nicho de atuação<select className="ag-input" value={category} onChange={(event) => { clearResults(); setCategory(event.target.value); }}>{businessCategories.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></label></TabsContent><TabsContent value="keyword"><label className="field-label">Palavra-chave<input className="ag-input" value={term} maxLength={100} required={mode === "keyword"} onChange={(event) => { clearResults(); setTerm(event.target.value); }} placeholder="Ex.: clínica odontológica" /></label></TabsContent></Tabs>
      <label className="field-label">Fonte<select className="ag-input" value={sourceId} disabled={initializing || !options.sources.length} onChange={(event) => { clearResults(); setSourceId(event.target.value); setLocationId(options.sources.find((source) => source.id === event.target.value)?.locations[0]?.id ?? ""); setRadius("city"); }}>{!options.sources.length && <option value="">Nenhuma fonte disponível</option>}{options.sources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label>
      {openMap && <label className="field-label">Filtrar cidades do Brasil<input className="ag-input" type="search" maxLength={100} value={cityFilter} onChange={(event) => { clearResults(); setLocationId(""); setCityFilter(event.target.value); }} placeholder="Digite o nome da cidade ou UF" /><small>Busca local nos municípios do IBGE. Selecione a cidade abaixo; até 100 opções por filtro.</small></label>}<label className="field-label">Cidade ou região<select className="ag-input" value={locationId} onChange={(event) => { clearResults(); setLocationId(event.target.value); setRadius("city"); }} disabled={!selectedSource}><option value="" disabled>Selecione uma região</option>{visibleCities.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}</select></label>
      <fieldset><legend className="field-label">Abrangência</legend><div className="radius-options">{(["city", 10, 25, 50] as const).map((value) => <label key={value} className={radius === value ? "is-selected" : ""}><input className="sr-only" type="radio" name="live-radius" checked={radius === value} disabled={value !== "city" && !selectedLocation?.radiusAvailable} onChange={() => { clearResults(); setRadius(value); }} /><span>{value === "city" ? "Cidade" : `${value} km`}</span></label>)}</div></fieldset>
      <p className="filter-note">{openMap ? "Todos os municípios do Brasil estão disponíveis para seleção. A busca usa a identificação IBGE e a localização declarada na fonte aberta; pode haver dados ausentes. Raios não estão disponíveis nesta fonte." : "Cidade usa a associação declarada na fonte. Raio parte do centro cadastrado e pode cruzar municípios. Não usamos viés de localização."}</p>{selectedLocation?.attributions.map((credit) => <small key={credit}>{credit}</small>)}
      <Button type="submit" className="gold-button search-submit" disabled={loading || initializing || !selectedLocation}><Search size={18} aria-hidden="true" />{loading ? "Buscando empresas…" : "Buscar empresas"}</Button>{openMap && loading && <p role="status" className="filter-note">Consultando dados abertos. Uma primeira busca pode levar algumas dezenas de segundos.</p>}{initializing && <p role="status">Carregando fontes autorizadas…</p>}
      {!options.sources.length && !initializing && <Button variant="outline" onClick={() => { optionsController.current?.abort(); const controller = new AbortController(); optionsController.current = controller; setInitializing(true); void initialize(controller.signal); }}>Recarregar fontes</Button>}
      {loading && <Button variant="outline" onClick={cancel}>Cancelar busca</Button>}</form></section>
      <Tabs value={view} onValueChange={setView} className="ag-panel map-panel"><div className="map-toolbar"><TabsList aria-label="Visualização dos resultados"><TabsTrigger value="map"><MapIcon size={15} aria-hidden="true" />Mapa</TabsTrigger><TabsTrigger value="list"><List size={15} aria-hidden="true" />Lista</TabsTrigger></TabsList></div><TabsContent value="map" className="map-tab-content">{view === "map" && items.length > 0 ? <SourceMap companies={filtered} selectedId={detailReference} onSelect={(reference) => void openDetails(reference)} attributions={page?.scopeAttributions ?? []} cartography={openMap} /> : <div className="map-placeholder"><MapPin size={34} aria-hidden="true" /><h2>Consulte os resultados na lista</h2><p>{openMap ? "Escolha uma cidade e clique em Buscar empresas. O mapa gratuito carregará após a consulta, com os mesmos resultados da lista." : "O mapa depende de um serviço permitido para este uso. Nenhum mapa externo foi carregado."}</p><Button variant="outline" onClick={() => setView("list")}>Ver lista de resultados</Button></div>}</TabsContent><TabsContent value="list">{results}</TabsContent></Tabs>

    </div>{view === "map" && <div className="bottom-results">{results}</div>}
    </div><aside className="company-sidebar" aria-label="Empresa selecionada"><section className="ag-panel"><div className="panel-heading"><h2>Detalhes da empresa</h2>{detail && <Button variant="outline" size="icon" aria-label="Fechar detalhes da empresa" onClick={closeSelection}><X aria-hidden="true" /></Button>}</div>{detailBody}</section></aside>
    <Sheet open={drawerOpen} onOpenChange={(open) => { setDrawerOpen(open); if (!open) { detailController.current?.abort(); actionController.current?.abort(); setOpeningMap(false); setAddingLead(false); } }}><SheetContent className="company-drawer" closeLabel="Fechar detalhes" onCloseAutoFocus={(event) => { event.preventDefault(); if (focusReturn.current?.isConnected) focusReturn.current.focus(); else document.getElementById("live-title")?.focus(); }}><SheetHeader><SheetTitle>Detalhes da empresa</SheetTitle><SheetDescription>Informações da fonte selecionada, sem diagnóstico automático.</SheetDescription></SheetHeader>{detailBody}</SheetContent></Sheet>
  </div>;
}
