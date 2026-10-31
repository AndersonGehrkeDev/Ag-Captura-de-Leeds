import { afterEach, describe, expect, it, vi } from "vitest";
// O marcador é verificado pelo bundler Next; este teste executa o módulo no Node.
vi.mock("server-only", () => ({}));

import { getConfigurationReport, requireResourceConfiguration, ResourceConfigurationError } from "./index";

afterEach(() => vi.unstubAllEnvs());

describe("fronteira de configuração no servidor", () => {
  it("lê somente o recurso solicitado e não exige outros provedores", () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "synthetic-unit-token");
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(requireResourceConfiguration("places")).toEqual({ GOOGLE_PLACES_API_KEY: "synthetic-unit-token" });
  });

  it("rejeita recurso incompleto com erro seguro, sem retornar dados parciais", () => {
    vi.stubEnv("OPENAI_API_KEY", "synthetic-unit-token");
    vi.stubEnv("OPENAI_MODEL", "");
    expect(() => requireResourceConfiguration("openai")).toThrow(ResourceConfigurationError);
    expect(() => requireResourceConfiguration("openai")).toThrow("Configuração ausente ou inválida para o recurso: openai.");
  });

  it("não serializa credenciais válidas no relatório da interface", () => {
    const syntheticToken = "synthetic-unit-secret-never-serialize";
    vi.stubEnv("OPENAI_API_KEY", syntheticToken);
    vi.stubEnv("OPENAI_MODEL", "synthetic-test-model");
    const report = getConfigurationReport();
    expect(report.find((item) => item.id === "openai")?.state).toBe("present");
    expect(JSON.stringify(report)).not.toContain(syntheticToken);
    expect(JSON.stringify(report)).not.toContain("synthetic-test-model");
  });
});
