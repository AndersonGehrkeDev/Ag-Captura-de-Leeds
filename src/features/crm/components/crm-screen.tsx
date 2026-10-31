"use client";

import { useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { callCrm } from "../client";
import { csvColumns, stages, stageLabels, type CrmLead, type CrmMetadata, type CrmResponse } from "../domain/crm";

type FormValues = { stage: CrmMetadata["stage"]; assignedTo: string; tags: string; doNotContact: boolean; nextContact: string };
const initialForm: FormValues = { stage: "new", assignedTo: "", tags: "", doNotContact: false, nextContact: "" };
function localDate(iso: string | null) { if (!iso) return ""; const date = new Date(iso); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
const fromLead = (lead: CrmLead): FormValues => ({ stage: lead.stage, assignedTo: lead.assignedTo ?? "", tags: lead.tags.join(", "), doNotContact: lead.doNotContact, nextContact: localDate(lead.nextContactAt) });
const toMetadata = (form: FormValues): CrmMetadata => ({ stage: form.stage, assignedTo: form.assignedTo || null, tags: [...new Set(form.tags.split(",").map((tag) => tag.trim()).filter(Boolean))], doNotContact: form.doNotContact, nextContactAt: form.doNotContact || !form.nextContact ? null : new Date(form.nextContact).toISOString() });
const title = (lead: CrmLead) => lead.name ?? lead.internalLabel;
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString("pt-BR") : "Não agendado";

function MetadataFields({ value, change, members, disabled }: { value: FormValues; change: Dispatch<SetStateAction<FormValues>>; members: CrmResponse["members"]; disabled: boolean }) {
  return <div className="crm-fields">
    <label className="field-label">Etapa<select className="ag-input" value={value.stage} disabled={disabled} onChange={(event) => change((old) => ({ ...old, stage: event.target.value as FormValues["stage"] }))}>{stages.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></label>
    <label className="field-label">Responsável<select className="ag-input" value={value.assignedTo} disabled={disabled} onChange={(event) => change((old) => ({ ...old, assignedTo: event.target.value }))}><option value="">Não atribuído</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
    <label className="field-label">Etiquetas (separadas por vírgula)<input className="ag-input" maxLength={371} value={value.tags} disabled={disabled} onChange={(event) => change((old) => ({ ...old, tags: event.target.value }))} /><small>Até 12 etiquetas de 30 caracteres.</small></label>
    <label className="crm-check"><input type="checkbox" checked={value.doNotContact} disabled={disabled} onChange={(event) => change((old) => ({ ...old, doNotContact: event.target.checked, nextContact: event.target.checked ? "" : old.nextContact }))} /><span>Não contatar</span></label>
    <label className="field-label">Próximo contato<input type="datetime-local" className="ag-input" value={value.nextContact} disabled={disabled || value.doNotContact} onChange={(event) => change((old) => ({ ...old, nextContact: event.target.value }))} /><small>Horário local do dispositivo. Não dispara mensagens.</small></label>
  </div>;
}
export function CrmScreen({ workspaceId, initialLeadId }: { workspaceId: string; initialLeadId?: string }) {
  const [leads, setLeads] = useState<CrmLead[]>([]); const [members, setMembers] = useState<CrmResponse["members"]>([]);
  const [page, setPage] = useState(0); const [hasMore, setHasMore] = useState(false); const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(""); const [error, setError] = useState(false); const [busy, setBusy] = useState(false);
  const [view, setView] = useState("list"); const [filter, setFilter] = useState(""); const [stageFilter, setStageFilter] = useState("all");
  const [label, setLabel] = useState(""); const [manual, setManual] = useState<FormValues>(initialForm);
  const [selected, setSelected] = useState<CrmLead | null>(null); const [details, setDetails] = useState<CrmResponse | null>(null); const [detailLoading, setDetailLoading] = useState(false);
  const [edit, setEdit] = useState<FormValues>(initialForm); const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]); const [columns, setColumns] = useState<(typeof csvColumns[number])[]>([...csvColumns]);
  const guard = useRef(false); const requests = useRef(new Set<AbortController>()); const detailRequest = useRef<AbortController | null>(null);
  const board = useRef<HTMLDivElement | null>(null); const noteAttempt = useRef<{ leadId: string; body: string; requestId: string } | null>(null);
  const selectedId = useRef<string | null>(null);
  const focusReturn = useRef<HTMLElement | null>(null);
  const scope = { workspaceId };
  const filtered = leads.filter((lead) => (stageFilter === "all" || lead.stage === stageFilter) && `${title(lead)} ${lead.tags.join(" ")}`.toLocaleLowerCase("pt-BR").includes(filter.toLocaleLowerCase("pt-BR")));
  function report(message: string, failed = false) { setNotice(message); setError(failed); }
  function applyList(data: CrmResponse, append = false) { setLeads((old) => append ? [...new Map([...old, ...data.leads].map((lead) => [lead.id, lead])).values()] : data.leads); setMembers(data.members); setHasMore(data.hasMore); }
  useEffect(() => {
    const controller = new AbortController(); requests.current.add(controller);
    void callCrm({ operation: "list", workspaceId, page: 0 }, controller.signal).then((result) => {
      if (controller.signal.aborted) return; setLoading(false);
      if (result.ok) applyList(result.data); else report(result.error.message, true);
    });
    if (initialLeadId) {
      void callCrm({ operation: "details", workspaceId, leadId: initialLeadId }, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        if (result.ok && result.data.leads[0]) { selectedId.current = result.data.leads[0].id; setSelected(result.data.leads[0]); setDetails(result.data); setEdit(fromLead(result.data.leads[0])); }
        else if (!result.ok) report(result.error.message, true);
      });
    }
    const pending = requests.current;
    return () => { pending.forEach((request) => request.abort()); pending.clear(); };
  }, [workspaceId, initialLeadId]);
  async function request(command: Parameters<typeof callCrm>[0]) {
    const controller = new AbortController(); requests.current.add(controller);
    try { return await callCrm(command, controller.signal); } finally { requests.current.delete(controller); }
  }
  async function loadPage(nextPage: number, append = false) {
    if (loading || busy) return; setLoading(true);
    try { const result = await request({ ...scope, operation: "list", page: nextPage }); if (result.ok) { applyList(result.data, append); setPage(nextPage); report("Lista atualizada."); } else report(result.error.message, true); }
    finally { setLoading(false); }
  }
  async function openDetails(lead: CrmLead) {
    focusReturn.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    detailRequest.current?.abort(); const controller = new AbortController(); detailRequest.current = controller; requests.current.add(controller);
    selectedId.current = lead.id; setSelected(lead); setDetails(null); setEdit(fromLead(lead)); setDetailLoading(true);
    try {
      const result = await callCrm({ ...scope, operation: "details", leadId: lead.id }, controller.signal);
      if (controller.signal.aborted) return;
      if (result.ok && result.data.leads[0]) { const current = result.data.leads[0]; setSelected(current); setDetails(result.data); setEdit(fromLead(current)); setLeads((old) => old.map((row) => row.id === current.id ? current : row)); }
      else if (!result.ok) report(result.error.message, true);
    } finally { requests.current.delete(controller); if (detailRequest.current === controller) setDetailLoading(false); }
  }
  async function begin(operation: () => Promise<void>) {
    if (guard.current) return; guard.current = true; setBusy(true); report("");
    try { await operation(); } catch { report("Revise os campos. Não foi possível confirmar o salvamento; atualize antes de repetir.", true); }
    finally { guard.current = false; setBusy(false); }
  }
  function createManual(event: FormEvent) {
    event.preventDefault(); void begin(async () => {
      const result = await request({ ...scope, operation: "manual", label: label.normalize("NFKC"), ...toMetadata(manual) });
      if (!result.ok) { report(result.error.message, true); return; }
      const fresh = await request({ ...scope, operation: "list", page: 0 }); if (fresh.ok) { applyList(fresh.data); setPage(0); }
      setLabel(""); setManual(initialForm); report(result.data.duplicate ? "Identificação já cadastrada neste workspace. O lead existente foi preservado." : "Lead manual salvo no CRM.");
    });
  }
  async function updateLead(lead: CrmLead, metadata: CrmMetadata) {
    const result = await request({ ...scope, operation: "update", leadId: lead.id, expectedUpdatedAt: lead.updatedAt, ...metadata });
    if (!result.ok) { report(result.error.message, true); return; }
    const fresh = await request({ ...scope, operation: "details", leadId: lead.id });
    if (fresh.ok && fresh.data.leads[0]) {
      const current = fresh.data.leads[0]; setLeads((old) => old.map((row) => row.id === current.id ? current : row));
      if (selectedId.current === current.id) { setSelected(current); setEdit(fromLead(current)); setDetails(fresh.data); }
      report("Alterações salvas. Mudanças de etapa registradas no histórico.");
    } else report("Alteração salva, mas não foi possível recarregar o registro. Atualize a lista.", true);
  }
  function saveMetadata(event: FormEvent) { event.preventDefault(); if (selected) void begin(() => updateLead(selected, toMetadata(edit))); }
  function move(lead: CrmLead, stage: CrmMetadata["stage"]) { void begin(() => updateLead(lead, { stage, assignedTo: lead.assignedTo, tags: lead.tags, doNotContact: lead.doNotContact, nextContactAt: lead.nextContactAt })); }
  function saveNote(event: FormEvent) {
    event.preventDefault(); if (!selected) return; const leadId = selected.id; const body = (noteDrafts[leadId] ?? "").trim();
    void begin(async () => {
      if (noteAttempt.current?.leadId !== leadId || noteAttempt.current.body !== body) noteAttempt.current = { leadId, body, requestId: crypto.randomUUID() };
      const result = await request({ ...scope, operation: "note", leadId, body, requestId: noteAttempt.current.requestId });
      if (!result.ok) { report(result.error.message, true); return; }
      const fresh = await request({ ...scope, operation: "details", leadId }); if (fresh.ok && selectedId.current === leadId) setDetails(fresh.data);
      setNoteDrafts((old) => ({ ...old, [leadId]: "" })); noteAttempt.current = null; report("Anotação salva no CRM.");
    });
  }
  function toggleSelection(id: string) { setSelectedIds((old) => old.includes(id) ? old.filter((value) => value !== id) : old.length < 50 ? [...old, id] : old); }
  function exportCsv() { void begin(async () => {
    const ids = selectedIds.length ? selectedIds : filtered.slice(0, 50).map((lead) => lead.id);
    const result = await request({ ...scope, operation: "export", leadIds: ids, columns });
    if (!result.ok || !result.data.csv) { report(result.ok ? "Nenhum CSV disponível." : result.error.message, true); return; }
    const url = URL.createObjectURL(new Blob([result.data.csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "ag-leads.csv"; link.click(); URL.revokeObjectURL(url);
    report(`CSV preparado com ${result.data.exportedCount} de ${ids.length} leads selecionados; registros indisponíveis foram omitidos. ${result.data.omittedCells} células ausentes ou sem permissão ficaram vazias. Confira os créditos da fonte.`);
  }); }
  const assignee = (id: string | null) => id ? members.find((member) => member.id === id)?.name ?? "Usuário não carregado" : "Não atribuído";
  const sourceLabel = (lead: CrmLead) => lead.sourceState === "internal" ? "Identificação interna; fatos externos não verificados" : lead.sourceState === "available" ? "Dados autorizados consultados na fonte" : lead.sourceState === "unverified" ? "Legado sem origem verificada" : "Fonte/permissão indisponível; metadados preservados";
  function leadCard(lead: CrmLead, kanban = false) {
    return <article key={lead.id} className="crm-lead-card"><h3>{title(lead)}</h3>{!kanban && <p>Etapa: {stageLabels[lead.stage]}</p>}<p>{sourceLabel(lead)}</p>{lead.doNotContact && <strong className="crm-stop">Não contatar</strong>}<p>{assignee(lead.assignedTo)}</p><p>Próximo contato: {dateLabel(lead.nextContactAt)}</p><div className="crm-tags">{lead.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      {kanban && <label className="field-label">Mover para<select className="ag-input" aria-label={`Etapa de ${title(lead)}`} value={lead.stage} disabled={busy} onChange={(event) => move(lead, event.target.value as CrmMetadata["stage"])}>{stages.map((stage) => <option value={stage} key={stage}>{stageLabels[stage]}</option>)}</select></label>}
      <div className="crm-card-actions"><label className="crm-check"><input type="checkbox" checked={selectedIds.includes(lead.id)} disabled={!selectedIds.includes(lead.id) && selectedIds.length >= 50} onChange={() => toggleSelection(lead.id)} /><span>Selecionar</span></label><Button variant="outline" onClick={() => void openDetails(lead)}>Detalhes</Button></div>
    </article>;
  }
  return <div className="crm-screen">
    <header className="crm-heading"><div><h1 id="crm-title" tabIndex={-1}>Meus Leads</h1><p>Acompanhamento comercial do workspace, com origem e permissões preservadas.</p></div><Button variant="outline" disabled={loading || busy} onClick={() => void loadPage(0)}>Atualizar lista</Button></header>
    <p role={error ? "alert" : "status"} className="crm-notice">{loading ? "Carregando leads…" : notice || `${leads.length} leads carregados · ${filtered.length} nos filtros locais${hasMore ? " · há outras páginas" : ""}.`}</p>
    <details className="ag-panel crm-section"><summary>Cadastrar lead manualmente</summary><form onSubmit={createManual} className="crm-form"><label className="field-label">Identificação interna do lead<input className="ag-input" value={label} onChange={(event) => setLabel(event.target.value)} required maxLength={200} disabled={busy} placeholder="Nome ou apelido para organização interna" /></label><p>Este texto identifica seu registro. Não comprova nome empresarial ou direitos sobre uma fonte externa. Não cole conteúdo restrito do Google; para vincular uma empresa, use Adicionar lead na fonte autorizada da prospecção. Identificação e textos livres manuais não são exportados nem enviados à IA automaticamente.</p><MetadataFields value={manual} change={setManual} members={members} disabled={busy} /><Button type="submit" className="gold-button" disabled={busy || !label.trim()}>Salvar lead manual</Button></form></details>
    <section className="ag-panel crm-section"><h2>Filtrar registros carregados</h2><div className="crm-fields"><label className="field-label">Buscar identificação ou etiqueta<input className="ag-input" value={filter} maxLength={200} onChange={(event) => setFilter(event.target.value)} /></label><label className="field-label">Etapa<select className="ag-input" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">Todas</option>{stages.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></label></div></section>
    <Tabs value={view} onValueChange={setView} className="crm-views"><TabsList aria-label="Visualização do CRM"><TabsTrigger value="list">Lista</TabsTrigger><TabsTrigger value="kanban">Kanban</TabsTrigger></TabsList>
      <TabsContent value="list"><div className="crm-table-region" role="region" tabIndex={0} aria-label="Lista de leads, com rolagem localizada"><table className="crm-table"><caption className="sr-only">Leads carregados e filtrados neste workspace</caption><thead><tr><th>Seleção</th><th>Lead</th><th>Etapa</th><th>Responsável</th><th>Próximo contato</th><th>Ações</th></tr></thead><tbody>{filtered.map((lead) => <tr key={lead.id}><td><label className="crm-check"><input type="checkbox" aria-label={`Selecionar ${title(lead)}`} checked={selectedIds.includes(lead.id)} disabled={!selectedIds.includes(lead.id) && selectedIds.length >= 50} onChange={() => toggleSelection(lead.id)} /></label></td><td><strong>{title(lead)}</strong><small>{sourceLabel(lead)}</small>{lead.doNotContact && <strong className="crm-stop">Não contatar</strong>}<div className="crm-tags">{lead.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></td><td>{stageLabels[lead.stage]}</td><td>{assignee(lead.assignedTo)}</td><td>{dateLabel(lead.nextContactAt)}</td><td><Button variant="outline" onClick={() => void openDetails(lead)}>Detalhes</Button></td></tr>)}</tbody></table></div><div className="crm-mobile-cards">{filtered.map((lead) => leadCard(lead))}</div></TabsContent>
      <TabsContent value="kanban"><div className="crm-board-controls"><Button variant="outline" onClick={() => board.current?.scrollBy({ left: -280, behavior: "smooth" })}>Colunas anteriores</Button><Button variant="outline" onClick={() => board.current?.scrollBy({ left: 280, behavior: "smooth" })}>Próximas colunas</Button></div><p>Colunas e contagens usam apenas registros carregados e filtros atuais. Use Mover para em cada card; a rolagem horizontal fica somente no quadro.</p><div className="crm-board-region" ref={board} tabIndex={0} role="region" aria-label="Kanban de leads com rolagem horizontal"><div className="crm-board">{stages.map((stage) => <section className="crm-column" key={stage}><h2>{stageLabels[stage]} <span>{filtered.filter((lead) => lead.stage === stage).length}</span></h2>{filtered.filter((lead) => lead.stage === stage).map((lead) => leadCard(lead, true))}</section>)}</div></div></TabsContent>
    </Tabs>
    {!loading && !filtered.length && <p>Nenhum lead disponível nos registros e filtros carregados.</p>}
    {hasMore && page < 199 && <Button variant="outline" disabled={busy || loading} onClick={() => void loadPage(page + 1, true)}>Carregar mais 50 leads</Button>}{hasMore && page >= 199 && <p>Limite de 10.000 registros carregados por sessão atingido.</p>}
    <details className="ag-panel crm-section"><summary>Exportar CSV autorizado</summary><p>{selectedIds.length ? `${selectedIds.length} leads selecionados.` : "Sem seleção: usa os primeiros 50 leads filtrados e carregados."} Nenhuma referência nativa, anotação, etiqueta ou identificação manual é exportada. Dados da fonte dependem de autorização específica; células ausentes ou sem permissão ficam vazias.</p><div className="crm-export-columns">{csvColumns.map((column) => <label className="crm-check" key={column}><input type="checkbox" checked={columns.includes(column)} onChange={(event) => setColumns((old) => event.target.checked ? [...old, column] : old.filter((item) => item !== column))} /><span>{{ id: "ID do lead", name: "Nome da fonte", category: "Categoria", website: "Site", stage: "Etapa", assignedTo: "Responsável (ID)", nextContactAt: "Próximo contato", doNotContact: "Não contatar" }[column]}</span></label>)}</div><Button variant="outline" disabled={busy || !columns.length || (!selectedIds.length && !filtered.length)} onClick={exportCsv}>Baixar CSV</Button></details>
    <Sheet open={!!selected} onOpenChange={(open) => { if (!open) { detailRequest.current?.abort(); selectedId.current = null; setSelected(null); } }}><SheetContent className="crm-drawer" closeLabel="Fechar lead" onCloseAutoFocus={(event) => { event.preventDefault(); if (focusReturn.current?.isConnected) focusReturn.current.focus(); else document.getElementById("crm-title")?.focus(); }}><SheetHeader><SheetTitle>{selected ? title(selected) : "Detalhes do lead"}</SheetTitle><SheetDescription>Informações comerciais e histórico. Fechar não salva alterações pendentes.</SheetDescription></SheetHeader>{selected && <div className="crm-detail"><p>{sourceLabel(selected)}</p>{selected.category && <p>Categoria: {selected.category}</p>}{selected.website && <p>Site: {selected.website}</p>}{selected.attributions.map((credit) => <small key={credit}>{credit}</small>)}{selected.doNotContact && <strong className="crm-stop">Não contatar. Nenhuma ação de envio está disponível.</strong>}
      <form className="crm-form" onSubmit={saveMetadata}><MetadataFields value={edit} change={setEdit} members={members} disabled={busy || detailLoading} /><Button type="submit" className="gold-button" disabled={busy || detailLoading}>Salvar alterações</Button></form>
      <h2>Anotações comerciais</h2><form className="crm-form" onSubmit={saveNote}><label className="field-label">Nova anotação original<textarea className="ag-input" maxLength={4000} required value={noteDrafts[selected.id] ?? ""} disabled={busy} onChange={(event) => setNoteDrafts((old) => ({ ...old, [selected.id]: event.target.value }))} /></label><p>Registre informações comerciais originais. Não cole respostas ou conteúdo restrito de fontes. Anotações não são exportadas nem enviadas à IA.</p><Button type="submit" variant="outline" disabled={busy || detailLoading || !(noteDrafts[selected.id] ?? "").trim()}>Salvar anotação</Button></form>
      {details?.notes.map((note) => <article className="crm-note" key={note.id}><p>{note.body}</p><small>{dateLabel(note.createdAt)} · {assignee(note.createdBy)}</small></article>)}{!detailLoading && !details?.notes.length && <p>Nenhuma anotação criada neste fluxo.</p>}<p>Exibidas até 50 anotações recentes; registros legados sem origem verificada não são promovidos automaticamente.</p>
      <h2>Histórico de etapas</h2>{details?.history.map((entry) => <p key={entry.id}>{entry.from ? `${stageLabels[entry.from]} → ` : "Cadastro → "}{stageLabels[entry.to]}<small>{dateLabel(entry.createdAt)} · {entry.changedBy ? assignee(entry.changedBy) : "Operador"}</small></p>)}<p>Até 50 mudanças recentes. Alterar etapa é uma ação comercial explícita; abrir links não registra envio ou contato.</p>{detailLoading && <p role="status">Carregando detalhes…</p>}{notice && <p role={error ? "alert" : "status"}>{notice}</p>}
    </div>}</SheetContent></Sheet>
  </div>;
}
