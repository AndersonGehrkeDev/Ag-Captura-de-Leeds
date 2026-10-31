"use client";

import { Check, CheckCircle2, Clipboard, Clock3, Copy, Info, MapPin, MessageSquareText, NotebookPen, Phone, Plus, Sparkles, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useId } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProspectCompany } from "../domain/company";
import { CompanyAvatar } from "./company-avatar";
import { StatusBadge } from "./status-badge";

export interface DetailProps {
  company: ProspectCompany;
  isLead: boolean;
  onAdd: () => void;
  message: string;
  onMessage: (value: string) => void;
  note: string;
  onNote: (value: string) => void;
  tone: string;
  onTone: (value: string) => void;
  onNotice: (value: string) => void;
}

export function CompanyDetail({ company, isLead, onAdd, onNotice }: DetailProps) {
  return <section className="ag-panel detail-panel" aria-label={`Detalhes de ${company.name}`}>
    <CompanyAvatar company={company} large />
    <div className="detail-body"><div className="detail-title"><h2>{company.name}</h2><StatusBadge status={company.status} /></div>
      <div className="detail-rating"><strong>{company.rating.toLocaleString('pt-BR')}</strong><span className="stars" aria-label={`${company.rating} de 5 no exemplo`}>★★★★★</span><span>({company.reviews} avaliações fictícias)</span></div>
      <ul className="company-meta"><li><Store size={15} aria-hidden="true" /><span>{company.category}</span></li><li><MapPin size={15} aria-hidden="true" /><span>{company.address}</span></li><li><Phone size={15} aria-hidden="true" /><span>Telefone não incluído na demonstração</span></li><li><Clock3 size={15} aria-hidden="true" /><span>Horários não informados</span></li></ul>
      <div className="contact-actions"><Button variant="outline" onClick={() => onNotice("Posições fictícias: não há localização real para abrir no Google Maps.")}><MapPin size={14} aria-hidden="true" />Ver no Google Maps</Button><Button variant="outline" onClick={() => onNotice("Não há telefone no exemplo. Nenhum número foi copiado.")}><Phone size={14} aria-hidden="true" />Copiar telefone</Button></div>
      <section className="opportunity-box" aria-label="Oportunidade ilustrativa"><div><strong><Info size={15} aria-hidden="true" />Oportunidade identificada</strong><span><b>{company.score}</b>/100</span></div><div className="opportunity-track"><span style={{ width: `${company.score}%` }} /></div><ul><li><CheckCircle2 size={14} aria-hidden="true" />{company.status === "missing" ? "Sem site no cenário demonstrativo" : company.status === "improve" ? "Melhoria de site no cenário demonstrativo" : "Site adequado no cenário demonstrativo"}</li><li><CheckCircle2 size={14} aria-hidden="true" />Exemplo de presença digital local</li><li><CheckCircle2 size={14} aria-hidden="true" />Sugestão de abordagem personalizada</li></ul><p>Pontuação fictícia · nenhuma auditoria executada</p></section>
      <Button className="gold-button add-lead-button" onClick={onAdd}>{isLead ? <Check size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}{isLead ? "Adicionado aos leads de exemplo" : "Adicionar aos meus leads"}</Button>
    </div>
  </section>;
}

export function CompanyMessage({ company, message, onMessage, note, onNote, tone, onTone, onNotice }: DetailProps) {
  const fieldId = useId();
  async function copy() {
    try { await navigator.clipboard.writeText(message); onNotice("Mensagem de exemplo copiada. Nenhuma mensagem foi enviada."); }
    catch { onNotice("Não foi possível copiar. Selecione o texto e copie manualmente."); }
  }
  return <section className="ag-panel message-panel" aria-label={`Mensagem e anotações de ${company.name}`}>
    <Tabs defaultValue="message"><TabsList aria-label="Acompanhamento da empresa"><TabsTrigger value="message"><MessageSquareText size={14} aria-hidden="true" />Mensagem com IA</TabsTrigger><TabsTrigger value="notes"><NotebookPen size={14} aria-hidden="true" />Anotações</TabsTrigger></TabsList>
      <TabsContent value="message" className="message-body"><label className="tone-label">Tom da mensagem<select className="ag-input" value={tone} onChange={(event) => onTone(event.target.value)}><option>Profissional</option><option>Consultivo</option><option>Objetivo</option></select></label><p className="message-demo-note"><Sparkles size={12} aria-hidden="true" />Modelo de exemplo · não gerado por IA</p><label className="sr-only" htmlFor={`${fieldId}-message`}>Mensagem para {company.name}</label><textarea id={`${fieldId}-message`} maxLength={1000} className="ag-input message-text" value={message} onChange={(event) => onMessage(event.target.value)} /><div className="character-count">{message.length}/1000</div><Button className="gold-button copy-message" onClick={copy}><Copy size={17} aria-hidden="true" />Copiar mensagem</Button></TabsContent>
      <TabsContent value="notes" className="message-body"><label className="field-label" htmlFor={`${fieldId}-note`}>Anotações desta empresa</label><textarea id={`${fieldId}-note`} className="ag-input notes-text" maxLength={2000} placeholder="Registre uma observação de exemplo..." value={note} onChange={(event) => onNote(event.target.value)} /><p className="message-demo-note"><Clipboard size={13} aria-hidden="true" />Mantidas apenas nesta tela. Não são salvas no CRM.</p><Button variant="outline" className="copy-message" onClick={() => onNotice("Anotação mantida na memória desta tela de demonstração; não foi salva em banco.")}>Confirmar anotação de exemplo</Button></TabsContent>
    </Tabs>
  </section>;
}
