import { NextResponse } from "next/server";
import { applicationOrigin } from "@/domain/auth";
import { preventSharedCache } from "@/lib/auth-response";
import { executeManagement } from "@/server/management/service";

export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  const respond = (message: string, status: number) => preventSharedCache(NextResponse.json({ ok: false, message }, { status }));
  if (request.headers.get("origin") !== applicationOrigin(process.env.NEXT_PUBLIC_APP_URL)) return respond("Origem não autorizada.", 403);
  if (!request.body || !request.headers.get("content-type")?.startsWith("application/json")) return respond("Solicitação inválida.", 400);
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]); const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  const abort = () => { void reader.cancel().catch(() => {}); }; signal.addEventListener("abort", abort, { once: true });
  try {
    for (;;) { signal.throwIfAborted(); const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 32768) { await reader.cancel(); return respond("Solicitação excede o tamanho permitido.", 400); } chunks.push(value); }
    let input: unknown; try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return respond("Solicitação inválida.", 400); }
    const result = await executeManagement(input, signal); return preventSharedCache(NextResponse.json(result, { status: result.ok ? 200 : 400 }));
  } catch { return respond("Não foi possível concluir. Atualize antes de repetir.", 503); }
  finally { signal.removeEventListener("abort", abort); reader.releaseLock(); }
}
