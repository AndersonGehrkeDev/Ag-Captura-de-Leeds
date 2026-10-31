import { z } from "zod";
import { integrationErrorCodes, integrationFailure, type IntegrationResult } from "@/domain/integrations/contracts";
import type { SearchApiRequest } from "@/domain/integrations/search-api";

const failureSchema = z.strictObject({ ok: z.literal(false), error: z.strictObject({ code: z.enum(integrationErrorCodes), message: z.string().max(300) }) });
async function pause(milliseconds: number, signal: AbortSignal) {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, milliseconds);
    signal.addEventListener("abort", abort, { once: true });
  });
}
// Uma ação explícita; no máximo 3 tentativas transitórias, deadline total de 20 s.
export async function callSearchApi<T>(command: SearchApiRequest, schema: z.ZodType<T>, cancellation: AbortSignal): Promise<IntegrationResult<T>> {
  const signal = AbortSignal.any([cancellation, AbortSignal.timeout(20_000)]);
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      signal.throwIfAborted();
      let response: Response;
      try { response = await fetch("/api/prospeccao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command), cache: "no-store", signal }); }
      catch (error) {
        if (signal.aborted) throw error;
        if (attempt < 2 && error instanceof TypeError) { await pause(500 * 2 ** attempt, signal); continue; }
        return integrationFailure("provider_unavailable");
      }
      const body: unknown = await response.json();
      const success = z.strictObject({ ok: z.literal(true), data: schema }).safeParse(body);
      if (response.ok && success.success) return success.data;
      const failure = failureSchema.safeParse(body);
      if (!failure.success) return integrationFailure("provider_unavailable");
      const transient = (response.status === 503 && failure.data.error.code === "provider_unavailable") || (response.status === 429 && failure.data.error.code === "rate_limited");
      const retryAfter = response.headers.get("retry-after");
      const seconds = retryAfter === null ? null : /^\d+$/.test(retryAfter) ? Number(retryAfter) : Math.max(0, (Date.parse(retryAfter) - Date.now()) / 1000);
      // Não ignorar uma espera longa do servidor. O usuário poderá tentar depois.
      if (!transient || attempt === 2 || (seconds !== null && (!Number.isFinite(seconds) || seconds > 2))) return failure.data;
      await pause(Math.max(500 * 2 ** attempt, (seconds ?? 0) * 1000), signal);
    }
  } catch { return integrationFailure(signal.aborted ? signal.reason?.name === "TimeoutError" ? "timeout" : "cancelled" : "provider_unavailable"); }
  return integrationFailure("provider_unavailable");
}
