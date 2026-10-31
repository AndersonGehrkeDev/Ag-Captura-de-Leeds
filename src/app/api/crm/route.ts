import { NextResponse } from "next/server";
import { applicationOrigin } from "@/domain/auth";
import { preventSharedCache } from "@/lib/auth-response";
import { createCrmService, crmFailure } from "@/server/crm/service";

export const runtime = "nodejs";
export const maxDuration = 30;
const execute = createCrmService();
export async function POST(request: Request) {
  const respond = (body: Awaited<ReturnType<typeof execute>>, status = 200) => preventSharedCache(NextResponse.json(body, { status }));
  const origin = applicationOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (!origin || request.headers.get("origin") !== origin) return respond(crmFailure("access_denied"), 403);
  if (!request.body || !request.headers.get("content-type")?.startsWith("application/json")) return respond(crmFailure("invalid_input"), 400);
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]);
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  const abort = () => { void reader.cancel().catch(() => {}); }; signal.addEventListener("abort", abort, { once: true });
  try {
    for (;;) { signal.throwIfAborted(); const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 16384) { await reader.cancel(); return respond(crmFailure("invalid_input"), 400); } chunks.push(value); }
    let input: unknown; try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return respond(crmFailure("invalid_input"), 400); }
    const result = await execute(input, signal);
    return respond(result, result.ok ? 200 : result.error.code === "conflict" ? 409 : ["access_denied", "permission_denied"].includes(result.error.code) ? 403 : result.error.code === "invalid_input" ? 400 : 503);
  } catch { return respond(crmFailure(signal.aborted ? "timeout" : "provider_unavailable"), 503); }
  finally { signal.removeEventListener("abort", abort); reader.releaseLock(); }
}
