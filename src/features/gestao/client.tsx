"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import type { ManagementCommand, OperationResult } from "@/domain/management";
const resultSchema = z.strictObject({ ok: z.boolean(), message: z.string().max(300), copy: z.string().max(80000).optional() });
type Command = ManagementCommand extends infer T ? T extends ManagementCommand ? Omit<T, "workspaceId"> : never : never;
export function useManagement(workspaceId: string) {
  const [result, setResult] = useState<OperationResult | null>(null); const [busy, setBusy] = useState(false);
  const guard = useRef(false); const controller = useRef<AbortController | null>(null); const router = useRouter();
  useEffect(() => () => controller.current?.abort(), []);
  async function run(command: Command, refresh = true): Promise<OperationResult> {
    if (guard.current) return { ok: false, message: "Aguarde a operação em andamento." };
    guard.current = true; setBusy(true); setResult(null); const request = new AbortController(); controller.current = request;
    let value: OperationResult;
    try {
      const response = await fetch("/api/gestao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...command, workspaceId }), cache: "no-store", signal: AbortSignal.any([request.signal, AbortSignal.timeout(25_000)]) });
      const parsed = resultSchema.safeParse(await response.json()); value = parsed.success ? parsed.data : { ok: false, message: "Resposta indisponível. Verifique sua sessão e atualize." };
    } catch { value = { ok: false, message: "Não foi possível confirmar a operação. Atualize antes de repetir." }; }
    finally { guard.current = false; if (!request.signal.aborted) setBusy(false); }
    if (!request.signal.aborted) { setResult(value); if (value.ok && refresh) router.refresh(); }
    return value;
  }
  return { run, result, busy, setResult };
}
export function MutationNotice({ result }: { result: OperationResult | null }) { return result ? <p className="management-notice" role={result.ok ? "status" : "alert"}>{result.message}</p> : null; }
export function RefreshWorkspace() { const router = useRouter(); return <button type="button" className="management-link" onClick={() => router.refresh()}>Atualizar dados do workspace</button>; }
