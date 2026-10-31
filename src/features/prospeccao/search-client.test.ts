import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { callSearchApi } from "./search-client";

const command = { operation: "options" as const, workspaceId: "00000000-0000-4000-8000-000000000001" };
const schema = z.strictObject({ value: z.string() });
const errorResponse = (code: string, status: number, headers?: HeadersInit) => new Response(JSON.stringify({ ok: false, error: { code, message: "Resposta normalizada [TESTE]" } }), { status, headers });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
describe("transporte de busca com cancelamento e falhas transitórias", () => {
  it("repete somente falhas transitórias com espera progressiva e máximo de 3 tentativas", async () => {
    vi.useFakeTimers(); const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () => errorResponse("provider_unavailable", 503));
    const operation = callSearchApi(command, schema, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(499); expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(999); expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1); expect(fetch).toHaveBeenCalledTimes(3);
    expect(await operation).toMatchObject({ ok: false, error: { code: "provider_unavailable" } });
  });
  it("honra Retry-After longo sem repetir 429 imediatamente", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(errorResponse("rate_limited", 429, { "Retry-After": "60" }));
    expect(await callSearchApi(command, schema, new AbortController().signal)).toMatchObject({ ok: false, error: { code: "rate_limited" } }); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([["access_denied", 403], ["permission_denied", 403], ["invalid_input", 400], ["not_configured", 503]])("não repete erro permanente %s", async (code, status) => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(errorResponse(code, status));
    expect(await callSearchApi(command, schema, new AbortController().signal)).toMatchObject({ ok: false, error: { code } }); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("cancelamento interrompe a espera e impede nova tentativa", async () => {
    vi.useFakeTimers(); const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(errorResponse("provider_unavailable", 503)); const controller = new AbortController();
    const operation = callSearchApi(command, schema, controller.signal); await vi.advanceTimersByTimeAsync(100); controller.abort();
    expect(await operation).toMatchObject({ ok: false, error: { code: "cancelled" } }); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("valida a projeção da resposta e não propaga corpos externos desconhecidos", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { value: "ok", raw: "PRIVATE" } }), { status: 200 }));
    const result = await callSearchApi(command, schema, new AbortController().signal);
    expect(result).toMatchObject({ ok: false, error: { code: "provider_unavailable" } }); expect(JSON.stringify(result)).not.toContain("PRIVATE");
  });
});
