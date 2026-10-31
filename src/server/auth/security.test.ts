import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const requestHeaders = vi.hoisted(() => ({ value: new Headers() }));
vi.mock("next/headers", () => ({ headers: async () => requestHeaders.value }));
import { verifyActionOrigin } from "./security";
import { getAuthConfiguration } from "./configuration";

afterEach(() => vi.unstubAllEnvs());
describe("origem e controle de cadastro no servidor", () => {
  it.each(["https://evil.test", "null", "http://127.0.0.1:3000", ""])("recusa operação com Origin %j mesmo com Host permitido", async (origin) => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://ag.example.test");
    requestHeaders.value = new Headers({ origin, host: "ag.example.test", "x-forwarded-host": "ag.example.test" });
    await expect(verifyActionOrigin()).rejects.toThrow("Origem da solicitação não autorizada.");
  });
  it("aceita somente a origem canônica configurada", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://ag.example.test");
    requestHeaders.value = new Headers({ origin: "https://ag.example.test" });
    await expect(verifyActionOrigin()).resolves.toBeUndefined();
  });
  it.each([undefined, "", "false", "TRUE", "1"])("cadastro permanece fechado para %j", (value) => {
    vi.stubEnv("AUTH_ALLOW_SIGNUP", value);
    expect(getAuthConfiguration().allowSignup).toBe(false);
  });
  it("abertura exige true explícito e não habilita provedores ausentes", () => {
    vi.stubEnv("AUTH_ALLOW_SIGNUP", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(getAuthConfiguration()).toMatchObject({ allowSignup: true, available: false, publicConfig: null });
  });
});
