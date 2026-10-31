"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { initialAuthState } from "@/domain/auth";
import { acceptInvitationAction, selectWorkspaceAction, inviteMemberAction, memberOperationAction } from "@/server/auth/workspace-actions";

export function WorkspaceChoice({ id, invitation = false }: { id: string; invitation?: boolean }) {
  const [state, action, pending] = useActionState(invitation ? acceptInvitationAction : selectWorkspaceAction, initialAuthState);
  return <form action={action} className="workspace-form" aria-busy={pending}><input type="hidden" name={invitation ? "invitation_id" : "workspace_id"} value={id} /><Button disabled={pending} type="submit">{pending ? "Aguarde…" : invitation ? "Aceitar convite" : "Acessar workspace"}</Button>{state.message && <p role="alert" className="form-message">{state.message}</p>}</form>;
}
export function InviteMemberForm({ workspace, owner }: { workspace: string; owner: boolean }) {
  const [state, action, pending] = useActionState(inviteMemberAction, initialAuthState);
  return <form action={action} className="workspace-form" aria-busy={pending}><input type="hidden" name="workspace_id" value={workspace} /><fieldset disabled={pending}><label>E-mail do convidado<input type="email" name="email" required maxLength={254} autoComplete="off" /></label><label>Papel<select name="role" defaultValue="member"><option value="member">Membro</option>{owner && <option value="admin">Administrador</option>}</select></label><Button type="submit">{pending ? "Criando…" : "Criar convite"}</Button></fieldset>{state.message && <p role="status" className={state.success ? "form-message success" : "form-message"}>{state.message}</p>}</form>;
}
export function MemberOperationForm({ workspace, target, operation, label, role }: { workspace: string; target: string; operation: "remove" | "revoke" | "role" | "transfer"; label: string; role?: "member" | "admin" }) {
  const [state, action, pending] = useActionState(memberOperationAction, initialAuthState);
  return <form action={action} className="workspace-form" aria-busy={pending}><input type="hidden" name="workspace_id" value={workspace} /><input type="hidden" name="target_id" value={target} /><input type="hidden" name="operation" value={operation} />{role && <input type="hidden" name="role" value={role} />}{operation === "transfer" && <label>Digite TRANSFERIR para confirmar<input name="confirmation" required pattern="TRANSFERIR" maxLength={10} autoComplete="off" disabled={pending} /></label>}<Button variant="outline" type="submit" disabled={pending}>{pending ? "Aguarde…" : label}</Button>{state.message && <p className={state.success ? "form-message success" : "form-message"} role="status">{state.message}</p>}</form>;
}
