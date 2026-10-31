import { z } from "zod";
import { crmErrorCodes, crmResponseSchema, type CrmCommand, type CrmResponse, type CrmResult } from "./domain/crm";

export async function callCrm(command: CrmCommand, cancellation: AbortSignal): Promise<CrmResult<CrmResponse>> {
  const signal = AbortSignal.any([cancellation, AbortSignal.timeout(25_000)]);
  try {
    const response = await fetch("/api/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command), signal, cache: "no-store" });
    const body: unknown = await response.json();
    const success = z.strictObject({ ok: z.literal(true), data: crmResponseSchema }).safeParse(body);
    if (response.ok && success.success) return success.data;
    const failure = z.strictObject({ ok: z.literal(false), error: z.strictObject({ code: z.enum(crmErrorCodes), message: z.string().max(300) }) }).safeParse(body);
    if (failure.success) return failure.data;
  } catch { /* Mensagem constante: nunca repassar resposta interna ou payload. */ }
  return { ok: false, error: { code: signal.aborted ? "timeout" : "provider_unavailable", message: signal.aborted ? "A operação excedeu o tempo de espera. Atualize antes de tentar novamente." : "Não foi possível concluir a operação. Verifique sua sessão e tente novamente." } };
}
