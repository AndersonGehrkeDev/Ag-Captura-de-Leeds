"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { integrationErrorCodes, type IntegrationResult } from "@/domain/integrations/contracts";
import { commercialMessageResponseSchema, messageFailure as integrationFailure, toneLabels, type CommercialDraft, type CommercialMessageCommand, type CommercialMessageResponse } from "../domain/message";

async function call(command: CommercialMessageCommand, cancellation: AbortSignal): Promise<IntegrationResult<CommercialMessageResponse>> {
  const signal = AbortSignal.any([cancellation, AbortSignal.timeout(55_000)]);
  try {
    const response = await fetch("/api/mensagens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command), signal, cache: "no-store" });
    const body: unknown = await response.json();
    const success = z.strictObject({ ok: z.literal(true), data: commercialMessageResponseSchema }).safeParse(body);
    if (response.ok && success.success) return success.data;
    const failure = z.strictObject({ ok: z.literal(false), error: z.strictObject({ code: z.enum(integrationErrorCodes), message: z.string().max(300) }) }).safeParse(body);
    return failure.success ? failure.data : integrationFailure("provider_unavailable");
  } catch { return integrationFailure(signal.aborted ? "timeout" : "provider_unavailable"); }
}
export type MessageEditorState = { templateId: string; tone: CommercialDraft["tone"]; draft: CommercialDraft | null; text: string; reviewed: boolean };
export const emptyMessageEditor: MessageEditorState = { templateId: "", tone: "professional", draft: null, text: "", reviewed: false };
export function CommercialMessagePanel({ workspaceId, sourceId, reference, editor, onEditorChange }: { workspaceId: string; sourceId: string; reference: string; editor: MessageEditorState; onEditorChange: Dispatch<SetStateAction<MessageEditorState>> }) {
  const scope = { workspaceId, sourceId, reference };
  const [templates, setTemplates] = useState<NonNullable<CommercialMessageResponse["options"]>["templates"]>([]);
  const { templateId, tone, draft, text, reviewed } = editor;
  const change = (patch: Partial<MessageEditorState>) => onEditorChange((previous) => ({ ...previous, ...patch }));
  const [busy, setBusy] = useState(false); const [initializing, setInitializing] = useState(true);
  const [notice, setNotice] = useState(""); const [failed, setFailed] = useState(false);
  const controller = useRef<AbortController | null>(null); const guard = useRef(false);
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  const editorChange = useRef(onEditorChange); useEffect(() => { editorChange.current = onEditorChange; }, [onEditorChange]);
  useEffect(() => {
    const request = new AbortController(); controller.current = request;
    // Apenas opções autorizadas. Nenhuma chamada OpenAI ao abrir a aba.
    void call({ operation: "options", workspaceId, sourceId, reference }, request.signal).then((result) => {
      if (request.signal.aborted) return;
      setInitializing(false);
      if (result.ok) { const entries = result.data.options?.templates ?? []; setTemplates(entries); editorChange.current((previous) => ({ ...previous, templateId: entries.some((entry) => entry.id === previous.templateId) ? previous.templateId : entries[0]?.id ?? "" })); setNotice(entries.length ? "" : "Nenhum modelo possui evidência vigente para IA, exibição e cópia. Configure um modelo autorizado no servidor."); }
      else { setNotice(result.error.message); setFailed(true); }
    });
    return () => { request.abort(); controller.current?.abort(); };
  }, [workspaceId, sourceId, reference]);
  async function generate() {
    if (guard.current || !templateId) return;
    guard.current = true; controller.current?.abort(); const request = new AbortController(); controller.current = request;
    setBusy(true); setNotice(""); setFailed(false); change({ reviewed: false });
    try {
      const result = await call({ ...scope, operation: "generate", templateId, tone, requestId: crypto.randomUUID() }, request.signal);
      if (request.signal.aborted) return;
      if (result.ok && result.data.draft) { change({ draft: result.data.draft, text: result.data.draft.body.value }); setNotice("Rascunho gerado. Revise antes de copiar. Nenhuma mensagem foi enviada."); }
      else { setNotice(result.ok ? "A resposta não contém um rascunho válido." : result.error.code === "limit_reached" || result.error.code === "rate_limited" ? "Limite de uso atingido ou outra geração está em andamento. Aguarde e verifique a cota do workspace." : result.error.code === "timeout" ? "O tempo de espera terminou. A tentativa pode ter sido consumida; não repetimos a chamada automaticamente." : result.error.message); setFailed(true); }
    } finally { guard.current = false; if (controller.current === request) setBusy(false); }
  }
  async function copy() {
    if (guard.current || !draft || !reviewed || !text.trim()) return;
    guard.current = true; setBusy(true); setFailed(false);
    const request = new AbortController(); controller.current?.abort(); controller.current = request;
    try {
      const permission = await call({ ...scope, operation: "copy_permission", templateId: draft.templateId, tone: draft.tone, draftToken: draft.draftToken }, request.signal);
      if (request.signal.aborted) return;
      if (!permission.ok || !permission.data.copyAllowed) { setNotice("A cópia não foi autorizada: a permissão pode ter expirado ou mudado. Gere novamente apenas se autorizado."); setFailed(true); return; }
      await navigator.clipboard.writeText(text);
      setNotice("Mensagem copiada. O envio é manual.");
    } catch { textarea.current?.focus(); textarea.current?.select(); setNotice("O navegador não permitiu a cópia automática. Selecione o texto no editor e use o comando Copiar do dispositivo; use HTTPS para a área de transferência."); setFailed(true); }
    finally { guard.current = false; if (controller.current === request) setBusy(false); }
  }
  const clear = () => { change({ draft: null, text: "", reviewed: false }); setNotice(""); };
  return <section className="commercial-message" aria-label="Mensagem comercial com IA" aria-busy={busy || initializing}>
    <h3>Mensagem com IA</h3>
    <p>Primeiro contato, sem diagnóstico automático. Somente nome e descrição de serviço autorizados são enviados à OpenAI, por sua ação.</p>
    <label className="field-label">Tom da mensagem<select className="ag-input" value={tone} disabled={busy} onChange={(event) => { clear(); change({ tone: event.target.value as CommercialDraft["tone"] }); }}>{Object.entries(toneLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="field-label">Modelo de serviço<select className="ag-input" disabled={busy || initializing || !templates.length} value={templateId} onChange={(event) => { clear(); change({ templateId: event.target.value }); }}>{!templates.length && <option value="">Nenhum modelo autorizado</option>}{templates.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></label>
    {templates.find((entry) => entry.id === templateId) && <p>Descrição aprovada: {templates.find((entry) => entry.id === templateId)?.service}</p>}
    {initializing && <p role="status">Verificando modelos autorizados…</p>}
    <Button className="gold-button" disabled={busy || initializing || !templateId} onClick={() => void generate()}>{busy ? "Aguarde…" : draft ? "Regenerar mensagem" : "Gerar mensagem"}</Button>
    <p>Uma tentativa por geração, inclusive ao regenerar. Limite de uma geração simultânea, 20 por dia e cota mensal do workspace. Uma falha após o início pode consumir a tentativa.</p>
    <label className="field-label">Editor do rascunho<textarea ref={textarea} className="ag-input notes-text" value={text} maxLength={2000} disabled={!draft} readOnly={busy} placeholder="Gere um rascunho autorizado para editar." onChange={(event) => change({ text: event.target.value, reviewed: false })} /></label>
    <p>{text.length}/2000 caracteres · Edições locais não são reenviadas à IA nem salvas no CRM.</p>
    <label className="message-review"><input type="checkbox" checked={reviewed} disabled={!draft || busy} onChange={(event) => change({ reviewed: event.target.checked })} /><span>Revisei o conteúdo e confirmo que não inclui problemas inventados, contatos anteriores ou promessas de resultado.</span></label>
    <Button variant="outline" disabled={busy || !draft || !reviewed || !text.trim()} onClick={() => void copy()}>Copiar mensagem</Button>
    {notice && <p className="audit-notice" role={failed ? "alert" : "status"}>{notice}</p>}
    {draft && <><p>Gerada em {new Date(draft.generatedAt).toLocaleString("pt-BR")}. Rascunho revisável; nunca enviado automaticamente. Permissão de cópia revalidada por até 15 minutos.</p>{draft.attribution.map((credit) => <small key={credit}>{credit}</small>)}</>}
    <p>Google, auditorias, anotações e histórico de contatos não entram neste fluxo. Edições preservadas nesta tela ao alternar abas, seleção e apresentações; perdidas ao sair ou recarregar.</p>
  </section>;
}
