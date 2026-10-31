import { NextResponse } from "next/server";
import { applicationOrigin } from "@/domain/auth";
import { messageFailure as integrationFailure } from "@/features/ia/domain/message";
import { preventSharedCache } from "@/lib/auth-response";
import { createMessageService } from "@/server/messages/service";

export const runtime = "nodejs";
export const maxDuration = 60;
const execute = createMessageService();
export async function POST(request: Request) {
  const respond = (value: Awaited<ReturnType<typeof execute>>, status = 200) => preventSharedCache(NextResponse.json(value, { status }));
  const origin = applicationOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (!origin || request.headers.get("origin") !== origin) return respond(integrationFailure("access_denied"), 403);
  if (!request.body || !request.headers.get("content-type")?.startsWith("application/json")) return respond(integrationFailure("invalid_input"), 400);
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(50_000)]);
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  const abort = () => { void reader.cancel().catch(() => {}); }; signal.addEventListener("abort", abort, { once: true });
  try {
    for (;;) { signal.throwIfAborted(); const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 4096) { await reader.cancel(); return respond(integrationFailure("invalid_input"), 400); } chunks.push(value); }
    let input: unknown;
    try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return respond(integrationFailure("invalid_input"), 400); }
    const result = await execute(input, signal);
    return respond(result, result.ok ? 200 : ["access_denied", "permission_denied"].includes(result.error.code) ? 403 : result.error.code === "invalid_input" ? 400 : ["rate_limited", "limit_reached"].includes(result.error.code) ? 429 : 503);
  } catch { return respond(integrationFailure(signal.aborted ? "timeout" : "provider_unavailable"), 503); }
  finally { signal.removeEventListener("abort", abort); reader.releaseLock(); }
}
