"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useManagement, MutationNotice } from "@/features/gestao/client";
export function WorkspaceName({ workspaceId, name: initialName, canManage }: { workspaceId: string; name: string; canManage: boolean }) {
  const [name, setName] = useState(initialName); const { run, busy, result } = useManagement(workspaceId);
  function save(event: FormEvent) { event.preventDefault(); void run({ operation: "workspace_rename", name }); }
  return <form className="management-form" onSubmit={save}><label className="field-label">Nome do workspace<input className="ag-input" value={name} minLength={2} maxLength={120} disabled={!canManage || busy} required onChange={(event) => setName(event.target.value)} /></label>{canManage ? <Button variant="outline" disabled={busy}>Salvar workspace</Button> : <p>Alterações exigem administrador ou proprietário.</p>}<MutationNotice result={result} /></form>;
}
