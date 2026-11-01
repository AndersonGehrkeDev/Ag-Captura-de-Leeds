import { NextResponse } from "next/server";
import { applicationOrigin } from "@/domain/auth";
import { integrationFailure } from "@/domain/integrations/contracts";
import { searchApiRequestSchema } from "@/domain/integrations/search-api";
import { preventSharedCache } from "@/lib/auth-response";
import { createSearchService } from "@/server/integrations/search-service";
import { verifyIntegrationWorkspace } from "@/server/integrations/access";
import { createSearchLimiter } from "@/server/integrations/search-limits";

export const runtime = "nodejs";
export const maxDuration = 60;
const acquire = createSearchLimiter();
const execute = createSearchService();
const statuses = { invalid_input: 400, access_denied: 403, feature_disabled: 409, permission_denied: 403, not_configured: 503, not_implemented: 501, provider_unavailable: 503, rate_limited: 429, not_found: 404, cancelled: 409, timeout: 504, limit_reached: 409 } as const;
const respond = (result: Awaited<ReturnType<typeof execute>>) => {
  const response = preventSharedCache(NextResponse.json(result, { status: result.ok ? 200 : statuses[result.error.code] }));
  if (!result.ok && result.error.code === "rate_limited") response.headers.set("Retry-After", "60");
  return response;
};
async function readCommand(request: Request, signal: AbortSignal) {
  if (!request.headers.get("content-type")?.startsWith("application/json") || !request.body) return null;
  const reader = request.body.getReader(); const parts: Uint8Array[] = []; let size = 0;
  const stop = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", stop, { once: true });
  try {
    for (;;) { signal.throwIfAborted(); const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 8192) { await reader.cancel(); return null; } parts.push(value); }
    return searchApiRequestSchema.safeParse(JSON.parse(Buffer.concat(parts).toString("utf8")));
  } catch { return null; } finally { signal.removeEventListener("abort", stop); reader.releaseLock(); }
}
async function handle(request: Request, signal: AbortSignal) {
  const origin = applicationOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (!origin || request.headers.get("origin") !== origin) return respond(integrationFailure("access_denied"));
  const parsed = await readCommand(request, signal);
  signal.throwIfAborted();
  if (!parsed?.success) return respond(integrationFailure("invalid_input"));
  let userId: string | null;
  try { userId = await verifyIntegrationWorkspace(parsed.data.workspaceId); } catch { userId = null; }
  signal.throwIfAborted();
  if (!userId) return respond(integrationFailure("access_denied"));
  const release = acquire(`${userId}:${parsed.data.workspaceId}`);
  if (!release) return respond(integrationFailure("rate_limited"));
  return respond(await execute(parsed.data, signal).finally(release));
}
export async function POST(request: Request) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(process.env.OPEN_DATA_CATALOG_ENABLED === "true" ? 45000 : 8000)]);
  const stoppedResult = () => respond(integrationFailure(signal.reason?.name === "TimeoutError" ? "timeout" : "cancelled"));
  const operation = handle(request, signal).catch(() => signal.aborted ? stoppedResult() : respond(integrationFailure("provider_unavailable")));
  // Aguarda interrupção/fechamento nativos e liberação da reserva antes de responder.
  if (process.env.OPEN_DATA_CATALOG_ENABLED === "true") return await operation;
  let abort: () => void = () => {};
  const stopped = new Promise<NextResponse>((resolve) => {
    abort = () => resolve(stoppedResult());
    if (signal.aborted) abort(); else signal.addEventListener("abort", abort, { once: true });
  });
  try { return await Promise.race([operation, stopped]); }
  finally { signal.removeEventListener("abort", abort); }
}
